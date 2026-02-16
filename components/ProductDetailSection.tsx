
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, LabelList
} from 'recharts';
import {
  Package, Truck, Target, MapPin, TrendingDown, TrendingUp,
  ClipboardEdit, Loader2, Clock as ClockIcon, AlertCircle, Save, Sparkles, Check
} from 'lucide-react';
import { formalizeLocally } from '../services/localFormalizer';

interface ProductDetailSectionProps {
  product: string;
  data: any[];
  date: string;
  index?: number;
  total?: number;
}

const ProductDetailSection: React.FC<ProductDetailSectionProps> = ({
  product, data, date, index = 1, total = 1
}) => {
  const [justification, setJustification] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const storageKey = `sqm_justification_${date}_${product}`;
  const lastSavedText = useRef('');

  // Cargar justificación al cambiar producto o fecha
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setJustification(saved);
      lastSavedText.current = saved;
    } else {
      setJustification('');
      lastSavedText.current = '';
    }
  }, [date, product, storageKey]);

  const saveToStorage = (text: string) => {
    const trimmedText = text.trim();
    if (trimmedText) {
      localStorage.setItem(storageKey, trimmedText);
    } else {
      localStorage.removeItem(storageKey);
    }
    lastSavedText.current = trimmedText;
  };

  const handleImproveAI = async () => {
    const currentText = justification.trim();

    if (!currentText || currentText.length < 3) return;
    if (isRefining) return;
    if (currentText === lastSavedText.current) return;

    setIsRefining(true);
    setApiError(null);

    try {
      // Feedback de procesamiento (Protocolo Redacción Técnica)
      await new Promise(resolve => setTimeout(resolve, 500));

      const improved = formalizeLocally(currentText, product);

      setJustification(improved);
      saveToStorage(improved);
      
      // Feedback visual de éxito
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 2000);

    } catch (err: any) {
      console.error("[ProductDetail] Error en formalización local:", err);
      saveToStorage(currentText);
    } finally {
      setIsRefining(false);
    }
  };

  const formatHoursToTime = (hours: number): string => {
    if (isNaN(hours) || hours <= 0) return "0:00";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const tonProg = data.reduce((a, b) => a + (Number(b.Ton_Prog) || 0), 0);
    const tonReal = data.reduce((a, b) => a + (Number(b.Ton_Real) || 0), 0);
    const eqProg = data.reduce((a, b) => a + (Number(b.Eq_Prog) || 0), 0);
    const eqReal = data.reduce((a, b) => a + (Number(b.Eq_Real) || 0), 0);
    const regSum = data.reduce((a, b) => a + (Number(b.Regulacion_Real) || 0), 0);

    const faenaRealHoursList = data.map(d => Number(d.faenaRealHours) || 0).filter(v => v > 0);
    const faenaMetaHoursList = data.map(d => Number(d.faenaMetaHours) || 0).filter(v => v > 0);

    const avgFaenaReal = faenaRealHoursList.length > 0 ? (faenaRealHoursList.reduce((a, b) => a + b, 0) / faenaRealHoursList.length) : 0;
    const avgFaenaMeta = faenaMetaHoursList.length > 0 ? (faenaMetaHoursList.reduce((a, b) => a + b, 0) / faenaMetaHoursList.length) : 0;

    const destinations: Record<string, number> = {};
    data.forEach(d => {
      const dest = String(d.Destino || 'S/D');
      destinations[dest] = (destinations[dest] || 0) + 1;
    });
    const mainDestEntry = Object.entries(destinations).sort((a, b) => b[1] - a[1])[0];

    return {
      tonProg, tonReal, tonDiff: tonReal - tonProg,
      eqProg, eqReal, eqDiff: eqReal - eqProg,
      compliance: tonProg > 0 ? (tonReal / tonProg) * 100 : 0,
      totalReg: regSum,
      avgLoad: eqReal > 0 ? tonReal / eqReal : 0,
      avgFaenaReal,
      avgFaenaMeta,
      mainDest: mainDestEntry ? mainDestEntry[0] : 'S/D'
    };
  }, [data]);

  if (!stats) return null;

  const chartData = [
    { name: 'Tonelaje', Programado: stats.tonProg, Real: stats.tonReal },
    { name: 'Equipos', Programado: stats.eqProg, Real: stats.eqReal }
  ];

  const isTimeDeviation = stats.avgFaenaReal > 0 && stats.avgFaenaMeta > 0 && (stats.avgFaenaReal - stats.avgFaenaMeta) >= (15 / 60);
  const isTonDeviation = stats.compliance < 85;
  const hasAnyDeviation = isTonDeviation || isTimeDeviation;

  return (
    <div className="flex flex-col space-y-4 w-full bg-white overflow-hidden pb-8">
      <div className="flex justify-between items-end border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em]">Auditoría de Desempeño</p>
          <h2 className="text-4xl font-[900] text-[#1e293b] tracking-tighter leading-tight uppercase">{product}</h2>
        </div>
        <div className="bg-black text-white px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase mb-1 no-print">Ítem {index} / {total}</div>
      </div>

      <div className="flex flex-col items-center space-y-2 pt-1">
        <div className={`px-8 py-1.5 rounded-full ${stats.compliance < 85 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-[9px] font-black tracking-[0.2em] shadow-sm border uppercase`}>
          {stats.compliance < 85 ? 'Requiere Justificación Técnica' : 'Cumplimiento Operativo Exitoso'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <MetricCard icon={<Package className="w-4 h-4" />} label="Carga Real" value={`${stats.tonReal.toLocaleString()} Ton`} diff={stats.tonDiff} unit="vs Prog" />
        <MetricCard icon={<Truck className="w-4 h-4" />} label="Flota Real" value={`${stats.eqReal} EQ`} diff={stats.eqDiff} unit="vs Prog" />
        <MetricCard icon={<Target className="w-4 h-4" />} label="Compliance" value={`${stats.compliance.toFixed(1)}%`} diff={stats.compliance - 100} isPerc />
        <div className="bg-white p-5 rounded-[1.2rem] border border-slate-100 shadow-sm flex flex-col space-y-3">
          <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4" /><span className="text-[9px] font-black uppercase tracking-wider">Destino Crítico</span></div>
          <p className="text-lg font-black text-[#1e293b] leading-tight truncate uppercase">{stats.mainDest}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 pt-2">
        <div className="col-span-2 bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={15} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis hide />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '13px', fontWeight: '900' }} iconType="square" iconSize={8} />
                <Bar isAnimationActive={false} dataKey="Programado" fill="#003595" radius={[6, 6, 6, 6]} barSize={40}>
                  <LabelList dataKey="Programado" position="top" formatter={(v: any) => v.toLocaleString()} style={{ fill: '#003595', fontSize: '10px', fontWeight: '900' }} offset={8} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="Real" fill="#89B821" radius={[6, 6, 6, 6]} barSize={40}>
                  <LabelList dataKey="Real" position="top" formatter={(v: any) => v.toLocaleString()} style={{ fill: '#89B821', fontSize: '10px', fontWeight: '900' }} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-center space-y-4">
          <IndicatorRow label="Regulaciones" value={`${Math.round(stats.totalReg)}`} />
          <IndicatorRow label="Factor Carga" value={`${stats.avgLoad.toFixed(1)} T/EQ`} />
          <div className="h-px bg-slate-50 w-full" />
          <IndicatorRow label="Tpo. Real" value={formatHoursToTime(stats.avgFaenaReal)} color={isTimeDeviation ? 'text-rose-600' : 'text-[#1e293b]'} />
          <IndicatorRow label="Tpo. Meta" value={formatHoursToTime(stats.avgFaenaMeta)} />
        </div>
      </div>

      {hasAnyDeviation && (
        <div className="mt-6 bg-slate-50/50 border-2 border-dashed border-slate-200 p-8 rounded-[1.8rem] space-y-6 transition-all duration-300">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-200">
                <ClipboardEdit className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registro Operativo</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Justificación por Desviación</h4>
                  <div className="flex gap-1.5 ml-2">
                    {isTimeDeviation && (
                      <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Desviación Tpo.</span>
                    )}
                    {isTonDeviation && (
                      <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Desviación Ton.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {apiError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase tracking-widest no-print">{apiError}</div>}

            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              onBlur={handleImproveAI}
              placeholder="Escriba aquí los motivos técnicos de la desviación (ej. tiempo alto, falta gente, lluvia)..."
              className={`w-full h-24 bg-white border-2 rounded-2xl p-5 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:ring-0 transition-all shadow-inner resize-none no-pdf ${isRefining ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 focus:border-slate-300'}`}
              disabled={isRefining}
            />

            <div className="hidden pdf-only-block bg-white border-2 border-slate-50 rounded-2xl p-6 text-sm font-medium text-slate-700 h-auto min-h-[6rem] shadow-sm leading-relaxed whitespace-pre-wrap">
              {justification || "No se registraron observaciones para este ítem."}
            </div>

            {isRefining && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 no-print">
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 shadow-xl flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#89B821]" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={8} className="text-[#89B821]" /> Aplicando Protocolo de Redacción...
                  </span>
                </div>
              </div>
            )}
            
            {showCheck && !isRefining && (
              <div className="absolute top-2 right-2 no-print animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full">
                  <Check size={14} />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center no-print">
            <p className="text-[8px] font-bold text-slate-300 uppercase italic">Se aplica corrección automática bajo Protocolo de Redacción Técnica al salir del cuadro.</p>
            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Persistencia Local: {date} • {product}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ icon, label, value, diff, unit, isPerc }: any) => {
  const isPos = diff >= 0;
  return (
    <div className="bg-white p-5 rounded-[1.2rem] border border-slate-100 shadow-sm flex flex-col space-y-4">
      <div className="flex items-center gap-2 text-slate-300">{icon}<span className="text-[9px] font-black uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-black text-[#1e293b] tracking-tighter leading-none">{value}</p>
      <div className={`flex items-center gap-1.5 text-[10.5px] font-black px-3.5 py-1.5 rounded-lg w-fit ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {isPos ? '+' : ''}{isPerc ? diff.toFixed(1) : diff.toLocaleString()} {unit || ''}
      </div>
    </div>
  );
};

const IndicatorRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`text-xl font-black ${color || 'text-[#1e293b]'} tracking-tighter`}>{value}</span>
  </div>
);

export default ProductDetailSection;
