import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Camera, Database, Zap, DollarSign, TrendingUp, Server, ShieldCheck, Smartphone, Home, Download, FileText } from 'lucide-react';
import { Link } from 'react-router';
import exampleImage from 'figma:asset/28cc77f8da9969b7be442b7fdb54fbf553f509cf.png';

const slides = [
  {
    id: 'intro',
    title: 'Smart Match',
    subtitle: 'Revolucionando a venda de fotos no Allianz Parque com IA',
    icon: Camera,
    color: 'bg-emerald-600',
  },
  {
    id: 'problem',
    title: 'O Desafio',
    content: [
      { title: 'Alta Demanda', text: 'Milhares de torcedores querem recordações profissionais dos jogos.' },
      { title: 'Distribuição Lenta', text: 'Métodos atuais são manuais, lentos e dependem de contato humano posterior.' },
      { title: 'Perda de Vendas', text: 'A emoção do momento se perde se a foto não estiver disponível imediatamente.' },
    ],
    icon: TrendingUp,
    color: 'bg-blue-600',
  },
  {
    id: 'solution',
    title: 'A Solução',
    content: [
      { title: 'Reconhecimento Facial', text: 'Identificação automática de torcedores usando face-api.js e pgvector.' },
      { title: 'Compra Instantânea', text: 'QR Code no telão ou distribuído. Fluxo de pagamento simplificado.' },
      { title: 'Download Otimizado', text: 'Nova lógica de download compatível com iOS e Android (Blob stream).' },
    ],
    icon: Zap,
    color: 'bg-purple-600',
  },
  {
    id: 'tech',
    title: 'Stack Tecnológico',
    content: [
      { title: 'Frontend', text: 'React + Tailwind CSS + Framer Motion. Interface limpa e responsiva.' },
      { title: 'Backend Serverless', text: 'Supabase Edge Functions com Hono. Escala automática com a demanda.' },
      { title: 'Banco de Dados', text: 'PostgreSQL com extensão pgvector para busca de similaridade facial.' },
    ],
    icon: Server,
    color: 'bg-slate-800',
  },
  {
    id: 'infrastructure',
    title: 'Infraestrutura & Custos',
    image: exampleImage,
    content: [
      { title: 'Eficiência de Custo', text: 'Modelo "Pay as you go". Custos escalam apenas com vendas.' },
      { title: 'Storage', text: 'Supabase Storage para armazenamento seguro e barato de milhares de fotos.' },
      { title: 'Compute', text: 'Instâncias Nano/Micro suficientes para o MVP, escaláveis para XL em grandes jogos.' },
    ],
    icon: Database,
    color: 'bg-indigo-900',
  },
  {
    id: 'business',
    title: 'Rentabilidade',
    content: [
      { title: 'Margem Elevada', text: 'Custo marginal próximo a zero por cópia digital vendida.' },
      { title: 'Operação Automatizada', text: 'Sem necessidade de equipe de vendas dedicada no local.' },
      { title: 'Escalabilidade', text: 'Mesma infraestrutura atende 1 ou 50.000 pessoas.' },
    ],
    icon: DollarSign,
    color: 'bg-green-600',
  },
  {
    id: 'security',
    title: 'Segurança & Privacidade',
    content: [
      { title: 'Dados Criptografados', text: 'Transmissão e armazenamento seguros.' },
      { title: 'LGPD', text: 'Conformidade com leis de proteção de dados. Fotos só visíveis pelo comprador.' },
      { title: 'Standalone', text: 'Interface focada no usuário final sem distrações.' },
    ],
    icon: ShieldCheck,
    color: 'bg-red-700',
  },
  {
    id: 'mobile',
    title: 'Experiência Mobile',
    content: [
      { title: 'Universal', text: 'Compatível com iOS (Safari) e Android (Chrome).' },
      { title: 'Sem App', text: 'Não requer instalação de aplicativo. Tudo via navegador.' },
      { title: 'Foco na UX', text: 'Download direto sem redirecionamentos confusos.' },
    ],
    icon: Smartphone,
    color: 'bg-orange-600',
  },
];

export function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  // Exporta todos os slides como PDF via window.print()
  const handleExportPDF = () => {
    setExporting(true);
    const pw = window.open('', '_blank');
    if (!pw) { setExporting(false); return; }

    const slidesHtml = slides.map((s, idx) => {
      const contentHtml = s.content
        ? s.content.map(item => `
          <div style="background:rgba(30,41,59,0.6);padding:20px 24px;border-radius:12px;border:1px solid rgba(100,116,139,0.3);margin-bottom:12px;">
            <h3 style="color:#34d399;font-size:18px;font-weight:700;margin:0 0 6px;">${item.title}</h3>
            <p style="color:#cbd5e1;font-size:15px;margin:0;line-height:1.5;">${item.text}</p>
          </div>`).join('')
        : '';
      const subtitleHtml = s.subtitle
        ? `<p style="color:#94a3b8;font-size:22px;margin:16px 0 0;">${s.subtitle}</p>`
        : '';
      return `
        <div class="slide" ${idx > 0 ? 'style="page-break-before:always"' : ''}>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:56px;height:56px;border-radius:16px;background:#059669;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:28px;font-weight:900;">${idx + 1}</span>
            </div>
            <h1 style="color:white;font-size:42px;font-weight:800;margin:0;letter-spacing:-1px;">${s.title}</h1>
          </div>
          ${subtitleHtml}
          <div style="margin-top:24px;">${contentHtml}</div>
        </div>`;
    }).join('');

    pw.document.write(`<!DOCTYPE html><html><head><title>Smart Match - Pitch Deck</title>
      <style>
        @page { size: landscape; margin: 40px; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 40px; }
        .slide { min-height: 90vh; display: flex; flex-direction: column; justify-content: center; padding: 40px; }
        @media print { .slide { min-height: auto; padding: 20px; } }
      </style></head><body>${slidesHtml}</body></html>`);
    pw.document.close();
    setTimeout(() => { pw.print(); setExporting(false); }, 500);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-white overflow-hidden relative">
      {/* Header / Progress */}
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-900 z-50">
        <motion.div 
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <Link to="/" className="absolute top-6 right-6 z-50 p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
        <Home size={24} />
      </Link>

      {/* Botão exportar PDF */}
      <button
        onClick={handleExportPDF}
        disabled={exporting}
        className="absolute top-6 right-20 z-50 p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        title="Exportar como PDF"
      >
        <FileText size={24} />
      </button>

      <div className="flex-1 flex items-center justify-center relative p-8 md:p-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center"
          >
            {/* Left Column: Text Content */}
            <div className="flex-1 space-y-8 z-10">
              <div className={`inline-flex items-center justify-center p-4 rounded-2xl ${slide.color} shadow-lg shadow-${slide.color}/20 mb-4`}>
                <Icon size={48} className="text-white" />
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                {slide.title}
              </h1>
              
              {slide.subtitle && (
                <p className="text-2xl md:text-3xl text-slate-400 font-light">
                  {slide.subtitle}
                </p>
              )}

              {slide.content && (
                <div className="grid gap-6 mt-8">
                  {slide.content.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (idx * 0.1) }}
                      className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm hover:border-emerald-500/50 transition-colors"
                    >
                      <h3 className="text-xl font-semibold text-emerald-400 mb-2">{item.title}</h3>
                      <p className="text-slate-300 text-lg leading-relaxed">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Image or Graphic */}
            <div className="flex-1 flex justify-center items-center">
              {slide.image ? (
                <motion.img 
                  src={slide.image} 
                  alt="Slide visual" 
                  className="rounded-xl shadow-2xl border border-slate-800 max-h-[60vh] object-contain bg-black"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
              ) : (
                <div className={`w-full aspect-square md:aspect-[4/3] rounded-3xl ${slide.color} opacity-10 flex items-center justify-center`}>
                  <Icon size={200} className="opacity-20 text-white" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      </div>

      {/* Footer Navigation */}
      <div className="h-20 border-t border-slate-900 flex items-center justify-between px-8 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="text-slate-500 font-medium">
          {currentSlide + 1} / {slides.length}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={prevSlide}
            className="p-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            className="p-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}