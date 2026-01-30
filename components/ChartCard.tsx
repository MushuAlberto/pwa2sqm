
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, LabelList,
  ComposedChart
} from 'recharts';
import {
  ClipboardEdit, AlertCircle, Loader2, Sparkles, Package, Clock
} from 'lucide-react';
import { refineJustification } from '../services/geminiService.ts';

interface ChartCardProps {
  type: 'bar' | 'line' | 'pie' | 'area' | 'composed';
  data: any[];
  xAxis: string;
  yAxis: string | string[]; // Soporte para múltiples ejes
  title: string;
  aggregation?: 'sum' | 'avg';
  isPrinting?: boolean;
}

const COLORS = [
  '#003595', // Azul SQM (Programado/Meta)
  '#89B821', // Verde SQM (Real)
  '#1e293b', // Gris Oscuro / Slate 900
  '#f59e0b', // Naranja (Alerta Tiempos)
  '#64748b', // Slate 500
  '#cbd5e1'  // Slate 200
];

/**
 * Convierte horas decimales (1.5) a formato HH:MM (1:30)
 */
const formatDecimalToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours === 0) return "0:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

const ChartCard: React.FC<ChartCardProps> = ({
  type,
  data,
  xAxis,
  yAxis,
  title,
  aggregation = 'sum',
  isPrinting = false
}) => {
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [refiningStatus, setRefiningStatus] = useState<Record<string, boolean>>({});

  const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis];

  const aggregatedData = useMemo((): any[] => {
    if (!data || data.length === 0) return [];

    const groups = data.reduce((acc: any, item: any) => {
      const key = String(item[xAxis] || 'S/D').trim();
      if (!key || key === 'undefined' || key === 'null') return acc;

      if (!acc[key]) {
        acc[key] = { name: key, _count: 0 };
        yAxes.forEach(y => acc[key][y] = 0);
      }

      acc[key]._count += 1;
      yAxes.forEach(y => {
        acc[key][y] += (Number(item[y]) || 0);
      });

      return acc;
    }, {});

    return Object.values(groups)
      .map((group: any) => {
        const finalObj: any = { name: group.name };
        yAxes.forEach(y => {
          finalObj[y] = (aggregation === 'avg' || y.toLowerCase().includes('hours')) && group._count > 0
            ? group[y] / group._count
            : group[y];
        });
        return finalObj;
      })
      .sort((a: any, b: any) => b[yAxes[0]] - a[yAxes[0]])
      .slice(0, 10);
  }, [data, xAxis, yAxis, aggregation]);

  const deviatedProducts = useMemo(() => {
    return aggregatedData.filter(row => {
      const isUnderperformingTon = row.Ton_Prog > 0 && row.Ton_Real < (row.Ton_Prog * 0.85);
      const isTimeDeviated = row.faenaRealHours > 0 && row.faenaMetaHours > 0 && (row.faenaRealHours - row.faenaMetaHours) >= (10 / 60);
      return isUnderperformingTon || isTimeDeviated;
    }).map(row => ({
      name: row.name,
      tonIssue: row.Ton_Prog > 0 && row.Ton_Real < (row.Ton_Prog * 0.85),
      timeIssue: row.faenaRealHours > 0 && row.faenaMetaHours > 0 && (row.faenaRealHours - row.faenaMetaHours) >= (5 / 60)
    }));
  }, [aggregatedData]);

  const handleImproveAI = async (productName: string) => {
    const text = justifications[productName] || '';
    if (text.length < 5 || refiningStatus[productName]) return;

    setRefiningStatus(prev => ({ ...prev, [productName]: true }));
    try {
      const improved = await refineJustification(productName, text);
      setJustifications(prev => ({ ...prev, [productName]: improved }));
    } catch (err) {
      console.error(err);
    } finally {
      setRefiningStatus(prev => ({ ...prev, [productName]: false }));
    }
  };

  const renderChartContent = () => {
    const chartType = type?.toLowerCase();
    const commonProps = {
      data: aggregatedData,
      margin: { top: 20, right: 30, left: 10, bottom: 10 }
    };

    const formatValueForTooltip = (v: any, key: string = "") => {
      const num = Number(v);
      if (key.toLowerCase().includes('hours')) return formatDecimalToHHMM(num);
      return Math.round(num).toLocaleString();
    };

    switch (chartType) {
      case 'composed':
        return (
          <ComposedChart {...commonProps} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
              height={50}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#f59e0b' }} />

            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              formatter={(v: any, name: any) => [formatValueForTooltip(v, String(name)), name]}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900' }} iconType="circle" />

            <Bar yAxisId="left" dataKey="Ton_Prog" fill={COLORS[0]} name="Prog. Ton" barSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="Ton_Prog" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: COLORS[0] }} formatter={(v: any) => Math.round(v)} />
            </Bar>
            <Bar yAxisId="left" dataKey="Ton_Real" fill={COLORS[1]} name="Real Ton" barSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="Ton_Real" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: COLORS[1] }} formatter={(v: any) => Math.round(v)} />
            </Bar>

            <Line yAxisId="right" type="monotone" dataKey="faenaMetaHours" stroke={COLORS[2]} name="Meta Hrs" strokeWidth={2} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} isAnimationActive={false}>
              <LabelList dataKey="faenaMetaHours" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: COLORS[2] }} formatter={(v: any) => formatDecimalToHHMM(v)} />
            </Line>
            <Line yAxisId="right" type="monotone" dataKey="faenaRealHours" stroke={COLORS[3]} name="Real Hrs" strokeWidth={3} dot={{ r: 5, fill: '#fff', strokeWidth: 3 }} isAnimationActive={false}>
              <LabelList dataKey="faenaRealHours" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: COLORS[3] }} formatter={(v: any) => formatDecimalToHHMM(v)} />
            </Line>
          </ComposedChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} height={50} interval={0} angle={-45} textAnchor="end" />
            <YAxis hide />
            <Tooltip formatter={(v: any, name: any) => [formatValueForTooltip(v, String(name)), '']} />
            {yAxes.length > 1 && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '900' }} iconType="square" />}
            {yAxes.map((y, idx) => (
              <Bar key={y} isAnimationActive={false} dataKey={y} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} barSize={yAxes.length > 1 ? 20 : 35} name={y.replace('_Hours', '').replace('_', ' ')}>
                <LabelList dataKey={y} position="top" offset={10} style={{ fill: COLORS[idx % COLORS.length], fontSize: '9px', fontWeight: '900' }} formatter={(v) => formatValueForTooltip(v, y)} />
              </Bar>
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#555' }} height={50} interval={0} angle={-45} textAnchor="end" />
            <YAxis hide />
            <Tooltip formatter={(v: any, name: any) => [formatValueForTooltip(v, String(name)), '']} />
            {yAxes.map((y, idx) => (
              <Line key={y} isAnimationActive={false} type="monotone" dataKey={y} stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ r: 4, fill: COLORS[idx % COLORS.length] }} name={y.replace('_', ' ')} />
            ))}
          </LineChart>
        );
      case 'pie':
        const pieData = aggregatedData.map((d: any) => ({ name: d.name, value: d[yAxes[0]] }));
        return (
          <PieChart>
            <Pie data={pieData} cx="50%" cy="40%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" label={({ value }: any) => Math.round(value).toLocaleString()} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} isAnimationActive={false}>
              {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={80} wrapperStyle={{ fontSize: '11px', fontWeight: '900', paddingTop: '10px' }} />
          </PieChart>
        );
      default:
        return <div className="p-4 text-slate-400">Tipo no soportado</div>;
    }
  };

  return (
    <div className={`bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col ${type === 'composed' ? 'min-h-[620px]' : 'h-[450px]'}`}>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 pb-2">{title}</h3>

      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChartContent()}
        </ResponsiveContainer>
      </div>

      {type === 'composed' && (
        <>
          <div className="mt-8 overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Producto</th>
                  <th className="py-3 px-4 text-[9px] font-black text-[#003595] uppercase tracking-widest text-center border-b border-slate-100">Prog (Ton)</th>
                  <th className="py-3 px-4 text-[9px] font-black text-[#89B821] uppercase tracking-widest text-center border-b border-slate-100">Real (Ton)</th>
                  <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-100">Meta (Hrs)</th>
                  <th className="py-3 px-4 text-[9px] font-black text-[#f59e0b] uppercase tracking-widest text-center border-b border-slate-100">Real (Hrs)</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedData.map((row, idx) => {
                  const isUnderperformingTon = row.Ton_Prog > 0 && row.Ton_Real < (row.Ton_Prog * 0.85);
                  const isTimeDeviated = row.faenaRealHours > 0 && row.faenaMetaHours > 0 && (row.faenaRealHours - row.faenaMetaHours) >= (10 / 60);

                  return (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-[10px] font-black text-slate-700 truncate max-w-[120px]">{row.name}</td>
                      <td className="py-2.5 px-4 text-[10px] font-bold text-center text-slate-400">{Math.round(row.Ton_Prog || 0).toLocaleString()}</td>
                      <td className={`py-2.5 px-4 text-[11px] font-black text-center ${isUnderperformingTon ? 'text-rose-600' : 'text-[#89B821]'}`}>
                        {Math.round(row.Ton_Real || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-[10px] font-bold text-center text-slate-400">{formatDecimalToHHMM(row.faenaMetaHours || 0)}</td>
                      <td className={`py-2.5 px-4 text-[11px] font-black text-center ${isTimeDeviated ? 'text-rose-600' : 'text-[#f59e0b]'}`}>
                        {formatDecimalToHHMM(row.faenaRealHours || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {deviatedProducts.length > 0 && (
            <div className="mt-8 bg-rose-50/50 border-2 border-dashed border-rose-200 p-8 rounded-[1.5rem] space-y-10 no-print no-capture">
              <div className="flex justify-between items-start border-b border-rose-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                    <ClipboardEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Auditoría Requerida</p>
                    <h4 className="text-xl font-black text-[#1e293b] tracking-tighter uppercase">JUSTIFICACIÓN POR DESVIACIÓN</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl border border-rose-100 shadow-sm">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Despacho</span>
                    <span className="text-[9px] font-black uppercase text-slate-600">Litio</span>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {deviatedProducts.map((prod, idx) => (
                  <div key={prod.name} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#1e293b] text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                        <h5 className="text-lg font-black text-slate-800 tracking-tight uppercase">{prod.name}</h5>
                      </div>
                      <div className="flex gap-2">
                        {prod.tonIssue && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-rose-200">
                            <Package size={12} /> Tonelaje &lt; 85%
                          </div>
                        )}
                        {prod.timeIssue && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-orange-200">
                            <Clock size={12} /> Desviación Tiempo
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative group">
                      <textarea
                        value={justifications[prod.name] || ''}
                        onChange={(e) => setJustifications(prev => ({ ...prev, [prod.name]: e.target.value }))}
                        placeholder={`Describa las causas de la desviación de ${prod.name}...`}
                        className="w-full h-24 bg-white border-2 border-slate-100 rounded-2xl p-4 pr-32 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-[#003595]/30 focus:ring-0 transition-all shadow-inner resize-none"
                      />
                      <button
                        onClick={() => handleImproveAI(prod.name)}
                        disabled={refiningStatus[prod.name] || (justifications[prod.name] || '').length < 5}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#003595]/5 hover:bg-[#003595]/10 text-[#003595] rounded-xl transition-all flex items-center gap-2 border border-[#003595]/10 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105 active:scale-95 shadow-sm"
                      >
                        {refiningStatus[prod.name] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} className="text-indigo-500" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest">Refinar con IA</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <div className={`w-2 h-2 rounded-full ${(justifications[prod.name]?.length || 0) > 15 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {(justifications[prod.name]?.length || 0) > 0 ? (refiningStatus[prod.name] ? 'Procesando...' : 'Justificación Lista') : 'Esperando Entrada'}
                      </div>
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                        LARGO: {justifications[prod.name]?.length || 0} CARACTERES
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChartCard;
