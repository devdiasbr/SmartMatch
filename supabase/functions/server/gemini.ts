/**
 * gemini.ts — Verificação de rostos com Google Gemini Vision
 *
 * Recebe uma selfie (base64) + lista de fotos do evento (URLs)
 * e usa o Gemini 2.0 Flash para confirmar quais fotos mostram a
 * mesma pessoa da selfie.
 *
 * Configurar: GEMINI_API_KEY nas variáveis de ambiente do Supabase.
 */

const GEMINI_API =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface VerifyResult {
  id: string;
  verified: boolean;   // true = mesma pessoa que a selfie
  confidence: number;  // 0.0 – 1.0
}

/** Baixa uma URL de imagem e retorna base64 + mimeType */
async function imageUrlToBase64(
  url: string,
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return {
    data: btoa(binary),
    mimeType: res.headers.get("content-type") ?? "image/jpeg",
  };
}

/**
 * Verifica quais fotos do evento contêm a mesma pessoa da selfie.
 *
 * @param selfieBase64    base64 puro (sem "data:...;base64," prefix)
 * @param selfieMimeType  ex: "image/jpeg"
 * @param photos          array de {id, url} — máx. 15 por chamada
 * @param apiKey          GEMINI_API_KEY
 */
export async function verifyFaceMatches(
  selfieBase64: string,
  selfieMimeType: string,
  photos: Array<{ id: string; url: string }>,
  apiKey: string,
): Promise<VerifyResult[]> {
  const PROMPT = `You are a precise face verification AI for an event photography system.
The FIRST image is a selfie/reference photo of a person searching for their photos.
Each subsequent image (labeled with a photo ID) is a candidate event photo.

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

  const parts: any[] = [
    { text: PROMPT },
    {
      inline_data: {
        mime_type: selfieMimeType || "image/jpeg",
        data: selfieBase64,
      },
    },
  ];

  const successfulIds: string[] = [];

  for (const photo of photos) {
    try {
      const { data, mimeType } = await imageUrlToBase64(photo.url);
      parts.push({ text: `Candidate photo ID: ${photo.id}` });
      parts.push({ inline_data: { mime_type: mimeType, data } });
      successfulIds.push(photo.id);
    } catch (e) {
      console.warn(`[Gemini] Falhou ao carregar foto ${photo.id}: ${e}`);
      // skip — will be returned as unverified below
    }
  }

  if (successfulIds.length === 0) {
    return photos.map((p) => ({ id: p.id, verified: false, confidence: 0 }));
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 300)}`);
  }

  const apiData = await res.json();
  const rawText: string =
    apiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  // Strip possible ```json ... ``` wrapper
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
      "[Gemini] Erro ao parsear resposta:",
      parseErr,
      "\nTexto bruto:",
      rawText.slice(0, 500),
    );
    // Graceful degradation: return all as unverified
    return photos.map((p) => ({ id: p.id, verified: false, confidence: 0 }));
  }

  // Build result map from Gemini output
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

  // Return in original order; IDs that failed to load → unverified
  return photos.map((p) =>
    resultMap.get(p.id) ?? { id: p.id, verified: false, confidence: 0 },
  );
}
