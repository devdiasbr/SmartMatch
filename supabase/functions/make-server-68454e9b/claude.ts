/**
 * claude.ts — Verificação de rostos com Anthropic Claude Vision
 *
 * Recebe uma selfie (base64) + lista de fotos do evento (URLs públicas)
 * e usa o Claude para confirmar quais fotos mostram a mesma pessoa da selfie.
 *
 * Configurar: ANTHROPIC_API_KEY nas variáveis de ambiente do Supabase.
 * Modelo: atualize CLAUDE_MODEL conforme a versão disponível na sua conta.
 */

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022"; // atualize para o modelo mais recente disponível

export interface VerifyResult {
  id: string;
  verified: boolean;  // true = mesma pessoa que a selfie
  confidence: number; // 0.0 – 1.0
}

const PROMPT = `You are a precise face verification AI for an event photography platform.
The first image is a reference selfie of a person searching for their photos.
Each subsequent image is a candidate event photo, preceded by its unique ID.

For each candidate photo, determine:
1. Does it contain THE SAME PERSON as in the selfie?
2. Confidence score: 0.0 = completely different person, 1.0 = definitely same person.

Rules:
- Focus strictly on facial features (structure, eyes, nose, mouth shape).
- Ignore clothing, background, lighting, angle, and image quality differences.
- A group photo is "verified" if the selfie person appears anywhere in it.
- Be conservative: only mark true when reasonably certain (>70% confidence).
- If the selfie person is not clearly visible in a photo, mark false.

Return ONLY a valid JSON array — one object per candidate in the same order as received:
[{"id":"<exact_photo_id>","same_person":true,"confidence":0.92}, ...]
No extra text, no markdown, only the JSON array.`;

/**
 * Verifica quais fotos do evento contêm a mesma pessoa da selfie.
 *
 * @param selfieBase64    base64 puro (sem "data:...;base64," prefix)
 * @param selfieMimeType  ex: "image/jpeg"
 * @param photos          array de {id, url} — máx. 15 por chamada
 * @param apiKey          ANTHROPIC_API_KEY
 */
export async function verifyFaceMatches(
  selfieBase64: string,
  selfieMimeType: string,
  photos: Array<{ id: string; url: string }>,
  apiKey: string,
): Promise<VerifyResult[]> {
  const content: any[] = [
    // Selfie como base64 (vem do dispositivo do usuário)
    {
      type: "image",
      source: {
        type: "base64",
        media_type: selfieMimeType || "image/jpeg",
        data: selfieBase64,
      },
    },
    {
      type: "text",
      text: "Reference selfie (Image 0): this is the person we are looking for.",
    },
  ];

  const includedIds: string[] = [];
  for (const photo of photos) {
    // Fotos do evento como URL pública — Claude busca diretamente, sem base64
    content.push({
      type: "image",
      source: { type: "url", url: photo.url },
    });
    content.push({ type: "text", text: `Candidate photo ID: ${photo.id}` });
    includedIds.push(photo.id);
  }

  if (includedIds.length === 0) {
    return photos.map((p) => ({ id: p.id, verified: false, confidence: 0 }));
  }

  content.push({ type: "text", text: PROMPT });

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  };

  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${txt.slice(0, 300)}`);
  }

  const apiData = await res.json();
  const rawText: string = apiData?.content?.[0]?.text ?? "[]";

  // Remove possível wrapper ```json ... ```
  const clean = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: any[];
  try {
    parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch (parseErr) {
    console.error(
      "[Claude] Erro ao parsear resposta:",
      parseErr,
      "\nTexto bruto:",
      rawText.slice(0, 500),
    );
    // Degradação graciosa: retorna tudo como não-verificado
    return photos.map((p) => ({ id: p.id, verified: false, confidence: 0 }));
  }

  // Monta mapa de resultados do Claude
  const resultMap = new Map<string, VerifyResult>();
  for (const r of parsed) {
    const id = String(r.id ?? "");
    if (!id) continue;
    resultMap.set(id, {
      id,
      verified: Boolean(r.same_person),
      confidence:
        typeof r.confidence === "number"
          ? Math.min(1, Math.max(0, r.confidence))
          : r.same_person
          ? 0.85
          : 0.15,
    });
  }

  // Retorna na mesma ordem que foi recebido; fallback para não-verificado
  return photos.map((p) =>
    resultMap.get(p.id) ?? { id: p.id, verified: false, confidence: 0 }
  );
}
