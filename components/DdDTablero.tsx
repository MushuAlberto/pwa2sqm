import React, { useMemo, useState } from 'react';
import {
    ArrowLeft, Clock, Calendar, BarChart3, TrendingUp,
    Target, AlertCircle, ChevronRight, Gauge, Layers, Info, Scale,
    FileText, Image as ImageIcon, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend, ReferenceLine, ComposedChart, Area, Cell, AreaChart, LabelList
} from 'recharts';
import { formatHoursToTime } from '../utils/dataProcessor';

declare const html2pdf: any;
declare const html2canvas: any;

interface DdDDataRow {
    Fecha: string;
    Producto: string;
    Destino: string;
    Ton_Prog: number;
    Ton_Real: number;
    Eq_Prog: number;
    Eq_Real: number;
    Regulacion_Real: number;
    sdaHours: number;
    pangHours: number;
    faenaMetaHours: number;
    faenaRealHours: number;
}

interface DdDTableroProps {
    data: DdDDataRow[];
    selectedDate: string;
    onBack: () => void;
}

// --- SUB-COMPONENTE: TARJETA DE MÉTRICA EJECUTIVA ---
const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, subtitle, icon, color }) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all duration-500">
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform`} />
        
        <div className="flex items-start justify-between relative z-10">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-slate-700`}>
                {icon}
            </div>
        </div>

        <div className="mt-4 relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter italic">{value}</h3>
            {subtitle && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{subtitle}</p>}
        </div>
    </div>
);

export const DdDTablero: React.FC<DdDTableroProps> = ({ data, selectedDate, onBack }) => {
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isExportingImage, setIsExportingImage] = useState(false);

    // 1. Filtrar datos del día seleccionado para la tabla
    const dayData = useMemo(() => data.filter(r => r.Fecha === selectedDate), [data, selectedDate]);

    // 2. Procesar datos para la tabla (Agrupar por Destino > Producto)
    const tableRows = useMemo(() => {
        const rows: any[] = [];
        const groupedByDest = dayData.reduce((acc, curr) => {
            const dest = curr.Destino;
            if (!acc[dest]) acc[dest] = [];
            acc[dest].push(curr);
            return acc;
        }, {} as Record<string, DdDDataRow[]>);

        (Object.entries(groupedByDest) as [string, DdDDataRow[]][]).forEach(([dest, items]) => {
            items.forEach((item: DdDDataRow, idx: number) => {
                const tonProg = item.Ton_Prog || 0;
                const tonReal = item.Ton_Real || 0;
                const cumplif = tonProg > 0 ? (tonReal / tonProg) * 100 : 0;
                const realFaena = item.faenaRealHours || 0;
                const metaFaena = item.faenaMetaHours || 2; 
                const promTonReal = item.Eq_Real > 0 ? tonReal / item.Eq_Real : 0;
                const kpiPromTon = 29.2; 

                rows.push({
                    destino: dest,
                    isFirstInDest: idx === 0,
                    destCount: items.length,
                    producto: item.Producto,
                    tonProg,
                    tonReal,
                    cumplif,
                    kpiFaena: metaFaena,
                    realFaena,
                    kpiReg: 10,
                    realReg: (item.Regulacion_Real / (item.Eq_Real || 1)) * 100,
                    kpiPromTon,
                    promTonReal
                });
            });
        });
        return rows;
    }, [dayData]);

    // 3. Datos Históricos (Últimos 15 días) para gráficos
    const historicalData = useMemo(() => {
        const dates = [...new Set(data.map(r => r.Fecha))].sort();
        const last10 = dates.slice(-10);

        return last10.map(date => {
            const dayItems = data.filter(r => r.Fecha === date);
            const totalProg = dayItems.reduce((sum, r) => sum + (r.Ton_Prog || 0), 0);
            const totalReal = dayItems.reduce((sum, r) => sum + (r.Ton_Real || 0), 0);
            const totalFaena = dayItems.reduce((sum, r) => sum + (r.faenaRealHours || 0), 0);
            const countFaena = dayItems.filter(r => (r.faenaRealHours || 0) > 0).length;

            return {
                fecha: String(date).split('-').slice(1).reverse().join('/'),
                cumplimiento: totalProg > 0 ? (totalReal / totalProg) * 100 : 0,
                tiempoFaena: countFaena > 0 ? totalFaena / countFaena : 0,
                promTon: dayItems.reduce((sum, r) => sum + (r.Ton_Real || 0), 0) / dayItems.reduce((sum, r) => sum + (r.Eq_Real || 1), 0)
            };
        });
    }, [data]);

    // 4. Métricas de Resumen
    const summary = useMemo(() => {
        const totalP = dayData.reduce((s, r) => s + (r.Ton_Prog || 0), 0);
        const totalR = dayData.reduce((s, r) => s + (r.Ton_Real || 0), 0);
        
        // Tiempos SdA
        const validSda = dayData.filter(r => (r.sdaHours || 0) > 0);
        const avgSda = validSda.length > 0 ? validSda.reduce((s, r) => s + r.sdaHours, 0) / validSda.length : 0;
        
        // Tiempos N. Y. (Pang)
        const validPang = dayData.filter(r => (r.pangHours || 0) > 0);
        const avgPang = validPang.length > 0 ? validPang.reduce((s, r) => s + r.pangHours, 0) / validPang.length : 0;

        return {
            cumplimiento: totalP > 0 ? (totalR / totalP) * 100 : 0,
            tonReal: totalR,
            avgSda: avgSda,
            avgPang: avgPang,
            desviaciones: tableRows.filter(r => r.cumplif < 85 || r.realFaena > r.kpiFaena).length
        };
    }, [dayData, tableRows]);

    // 5. Datos Segmentados por Producto y Destino (Últimos 10 días)
    const segmentedStats = useMemo(() => {
        const dates = [...new Set(data.map(r => r.Fecha))].sort().slice(-10);
        
        const getStatsForFilter = (filterFn: (r: DdDDataRow) => boolean) => {
            return dates.map(date => {
                const items = data.filter(r => r.Fecha === date && filterFn(r));
                const tProg = items.reduce((s, r) => s + (r.Ton_Prog || 0), 0);
                const tReal = items.reduce((s, r) => s + (r.Ton_Real || 0), 0);
                const eReal = items.reduce((s, r) => s + (r.Eq_Real || 0), 0);
                return {
                    fecha: String(date).split('-').slice(1).reverse().join('/'),
                    cumplimiento: tProg > 0 ? (tReal / tProg) * 100 : 0,
                    promTon: eReal > 0 ? tReal / eReal : 0
                };
            });
        };

        return {
            slit: getStatsForFilter(r => r.Producto.toUpperCase().includes('SLIT')),
            lsi: getStatsForFilter(r => r.Producto.toUpperCase().includes('LSI')),
            sal: getStatsForFilter(r => r.Producto.toUpperCase().includes('SAL') || r.Producto.includes('27/15')),
            coya: getStatsForFilter(r => r.Destino.toUpperCase().includes('COYA') || r.Producto.trim().toUpperCase().endsWith(' CS') || r.Destino.toUpperCase().includes(' CS')),
            tocopilla: getStatsForFilter(r => r.Destino.toUpperCase().includes('TOCOPILLA')),
            bischofita: getStatsForFilter(r => r.Producto.toUpperCase().includes('BISCHOFITA'))
        };
    }, [data]);

    const SegmentChart: React.FC<{ title: string; data: any[]; color: string }> = ({ title, data, color }) => (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest italic">{title}</h5>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 5, left: 5, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="fecha" 
                            tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis yAxisId="left" hide domain={[0, 120]} />
                        <YAxis yAxisId="right" hide orientation="right" domain={[24, 32]} />
                        <Tooltip
                            contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '10px', fontWeight: 'bold' }}
                            formatter={(v: number) => [v.toFixed(1), ""]}
                        />
                        <ReferenceLine yAxisId="left" y={85} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} />
                        <Bar yAxisId="left" dataKey="cumplimiento" fill={color} opacity={0.6} radius={[4, 4, 0, 0]} name="% Cumpl.">
                            <LabelList 
                                dataKey="cumplimiento" 
                                position="top" 
                                formatter={(v: number) => `${v.toFixed(0)}%`}
                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                            />
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="promTon" stroke={color} strokeWidth={3} dot={{ r: 3, fill: color }} name="Tms/Eq">
                            <LabelList 
                                dataKey="promTon" 
                                position="top" 
                                formatter={(v: number) => v.toFixed(1)}
                                style={{ fontSize: '9px', fontWeight: 'bold', fill: color }}
                            />
                        </Line>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                <span>Últimos 10 días</span>
                <span className="text-slate-200">|</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: color }} /> Cumplimiento</span>
                <span className="flex items-center gap-1"><div className="w-3 h-0.5" style={{ backgroundColor: color }} /> Ton/Eq</span>
            </div>
        </div>
    );

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const handleExportPDF = async () => {
        if (isExportingPDF) return;
        setIsExportingPDF(true);
        const element = document.getElementById('ddd-dashboard-capture');
        const opt = {
            margin: [5, 5],
            filename: `Analisis_Tecnico_DdD_${selectedDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'legal', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        try {
            await html2pdf().set(opt).from(element).save();
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleExportImage = async () => {
        if (isExportingImage) return;
        setIsExportingImage(true);
        const element = document.getElementById('ddd-dashboard-capture');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const link = document.createElement('a');
            link.download = `Captura_DdD_${selectedDate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } finally {
            setIsExportingImage(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32 animate-in fade-in duration-700">
            <div className="max-w-[1700px] mx-auto space-y-8" id="ddd-dashboard-capture">

                {/* HEADER EJECUTIVO MODERNIZADO */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-[#1e293b] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800 rounded-full -mr-48 -mt-48 opacity-10 animate-pulse" />
                    
                    <div className="flex items-center gap-8 relative z-10">
                        <button
                            onClick={onBack}
                            className="p-5 bg-slate-800/80 hover:bg-[#89B821] rounded-[2rem] transition-all duration-500 text-slate-400 hover:text-white shadow-xl active:scale-90 border border-slate-700 hover:border-[#89B821]"
                        >
                            <ArrowLeft size={32} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-[#89B821] text-[11px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-[#89B821]/20">Tablero M1</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">DIÁLOGO DE DESEMPEÑO</h1>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Visibilidad Operacional • Gestión de Transporte • SQM Litio</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                        <div className="bg-slate-800/60 backdrop-blur-xl p-4 px-8 rounded-[2.5rem] border border-slate-700/50 flex flex-col sm:flex-row items-center gap-6 shadow-2xl">
                            <div className="text-right border-r border-slate-700/50 pr-6 hidden sm:block">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Jornada Reportada</p>
                                <span className="text-xl font-black capitalize tracking-tighter italic">{formatDate(selectedDate)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleExportPDF} 
                                    disabled={isExportingPDF}
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/5 disabled:opacity-50"
                                >
                                    {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                    <span className="hidden lg:inline">PDF</span>
                                </button>
                                <button 
                                    onClick={handleExportImage}
                                    disabled={isExportingImage}
                                    className="p-3 bg-[#89B821] hover:bg-[#a1d72a] rounded-2xl transition-all text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#89B821]/20 border border-[#89B821]/5 disabled:opacity-50"
                                >
                                    {isExportingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                    <span className="hidden lg:inline">Imagen</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW DE KPIs (HERO SECTION) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <MetricCard 
                        title="Cumplimiento Global"
                        value={`${summary.cumplimiento.toFixed(1)}%`}
                        icon={<Target size={24} />}
                        color="bg-[#89B821]"
                    />
                    <MetricCard 
                        title="Tms. Reales Despachadas"
                        value={Math.round(summary.tonReal).toLocaleString()}
                        subtitle="Total consolidado por jornada"
                        icon={<BarChart3 size={24} />}
                        color="bg-blue-500"
                    />
                    <MetricCard 
                        title="Tiempo Promedio SdA"
                        value={formatHoursToTime(summary.avgSda)}
                        subtitle={`Meta SQM: ${formatHoursToTime(2)}`}
                        icon={<Clock size={24} />}
                        color="bg-amber-500"
                    />
                    <MetricCard 
                        title="Tiempo Promedio N. Y."
                        value={formatHoursToTime(summary.avgPang)}
                        subtitle={`Meta SQM: ${formatHoursToTime(2)}`}
                        icon={<Scale size={24} />}
                        color="bg-indigo-500"
                    />
                    <MetricCard 
                        title="Alertas Activas (DdD)"
                        value={summary.desviaciones}
                        subtitle="Puntos con desviación crítica"
                        icon={<AlertCircle size={24} />}
                        color="bg-rose-500"
                    />
                </div>

                {/* BENTO GRID: ANALÍTICA Y TABLA */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* COLUMNA IZQUIERDA: TABLA (8/12) */}
                    <div className="xl:col-span-8 space-y-8">
                        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                        <Layers size={24} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="font-black text-slate-800 tracking-tight uppercase text-lg italic">Matriz de Desempeño Operacional</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Análisis por Destino y Producto</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-md bg-rose-500/20 border-2 border-rose-500" />
                                        <span className="text-slate-500 italic">Desviación Crit.</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-md bg-[#89B821]/20 border-2 border-[#89B821]" />
                                        <span className="text-slate-500 italic">En Meta</span>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[13px] uppercase tracking-[0.2em] font-black">
                                            <th className="p-6">Eje Logístico (Destino)</th>
                                            <th className="p-6">Producto</th>
                                            <th className="p-6 text-center">% Cumplimiento</th>
                                            <th className="p-6 text-center">Tiempo de Faena</th>
                                            <th className="p-6 text-center">Desempeño Tms/Eq</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[15px] font-bold tabular-nums">
                                        {tableRows.map((row, idx) => (
                                            <tr key={idx} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-300">
                                                {row.isFirstInDest && (
                                                    <td
                                                        className="p-6 bg-slate-50/30 text-slate-800 font-black italic align-middle border-r border-slate-100"
                                                        rowSpan={row.destCount}
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg tracking-tighter text-center leading-tight">{row.destino}</span>
                                                            <div className="mt-2 h-1.5 w-10 bg-[#89B821] rounded-full opacity-50" />
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="p-6 text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-tight font-black text-sm">{row.producto}</td>
                                                <td className="p-6 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`px-5 py-2 rounded-xl font-black text-base ${row.cumplif < 85 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {row.cumplif.toFixed(1)}%
                                                        </span>
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ${row.cumplif < 85 ? 'bg-rose-500' : 'bg-[#89B821]'}`}
                                                                style={{ width: `${Math.min(row.cumplif, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <div className={`flex items-center justify-center gap-2 text-base font-black ${row.realFaena > row.kpiFaena ? 'text-rose-500' : 'text-slate-700'}`}>
                                                        {formatHoursToTime(row.realFaena)}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <div className={`flex flex-col items-center gap-1 font-black ${row.promTonReal < row.kpiPromTon ? 'text-rose-500' : 'text-[#89B821]'}`}>
                                                        <span className="text-xl tracking-tighter italic">{row.promTonReal.toFixed(1)} Tms</span>
                                                        <span className="text-[12px] text-slate-400 font-bold uppercase tracking-tighter">KPI Meta: {row.kpiPromTon}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: ANALÍTICA RÁPIDA (4/12) */}
                    <div className="xl:col-span-4 space-y-8">
                        
                        {/* TENDENCIA TIEMPOS */}
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 h-full">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black text-slate-800 italic tracking-tight uppercase">Tendencia de Tiempos</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Últimos 10 días operacionales</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner">
                                    <TrendingUp size={24} />
                                </div>
                            </div>

                            <div className="h-[350px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historicalData}>
                                        <defs>
                                            <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="fecha"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                            tickFormatter={(val) => formatHoursToTime(val)}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                                            formatter={(value: number) => [formatHoursToTime(value), "Horas Reales"]}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="tiempoFaena" 
                                            stroke="#f59e0b" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorTime)" 
                                            name="Horas Reales"
                                        />
                                        <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="6 6" strokeWidth={2} label={{ position: 'right', value: 'META', fill: '#ef4444', fontSize: 10, fontWeight: 'black' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                    </div>
                </div>

                {/* SECCIÓN DE ANALÍTICA SEGMENTADA (NUEVO) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-200" />
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Desempeño Específico por Segmento</h3>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SegmentChart title="Segmento SLIT" data={segmentedStats.slit} color="#3b82f6" />
                        <SegmentChart title="Segmento LSI" data={segmentedStats.lsi} color="#10b981" />
                        <SegmentChart title="Segmento Sal 27/15" data={segmentedStats.sal} color="#f59e0b" />
                        <SegmentChart title="Destino Coya Sur" data={segmentedStats.coya} color="#6366f1" />
                        <SegmentChart title="Destino Tocopilla" data={segmentedStats.tocopilla} color="#f43f5e" />
                        <SegmentChart title="Bischofita" data={segmentedStats.bischofita} color="#8b5cf6" />
                    </div>
                </div>

                {/* DASHBOARD COMPLETITUD Y CUMPLIMIENTO */}
                <div className="bg-white p-10 rounded-[3rem] shadow-sm space-y-10 border border-slate-100 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#89B821] opacity-5 rounded-tr-full -ml-32 -mb-32" />
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black text-slate-800 italic tracking-tighter uppercase leading-none">Análisis de Cumplimiento Programático</h4>
                            <p className="text-slate-400 text-xs font-bold tracking-[0.3em] uppercase opacity-70">Monitoreo de Eficiencia y Tonelaje Promedio</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Global</span>
                                <span className="text-xl font-black text-[#89B821] italic uppercase">Operativo</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full relative z-10 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={historicalData}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.5}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="fecha"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                    domain={[0, 110]}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[26, 30]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#89B821', fontSize: 11, fontWeight: 'black' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="diamond" wrapperStyle={{ paddingTop: '0px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }} />
                                <Bar yAxisId="left" dataKey="cumplimiento" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={45} name="% Cumplimiento">
                                    <LabelList dataKey="cumplimiento" position="top" formatter={(val: number) => `${Math.round(val)}%`} style={{ fill: '#3b82f6', fontSize: 10, fontWeight: 'black' }} />
                                </Bar>
                                <Line yAxisId="right" type="stepAfter" dataKey="promTonReal" stroke="#89B821" strokeWidth={4} dot={{ r: 6, fill: '#89B821', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Eficiencia Tms/Eq">
                                    <LabelList dataKey="promTonReal" position="top" formatter={(val: number) => val.toFixed(1)} style={{ fill: '#89B821', fontSize: 10, fontWeight: 'black' }} offset={10} />
                                </Line>
                                <ReferenceLine yAxisId="left" y={85} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} label={{ position: 'insideTopLeft', value: 'META CARGA 85%', fill: '#3b82f6', fontSize: 10, fontWeight: 'black' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* FOOTER EJECUTIVO */}
                <div className="flex flex-col items-center gap-4 py-12">
                    <div className="h-px w-64 bg-slate-200" />
                    <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] italic">
                        DESPACHO LITIO - GERENCIA DE OPERACIONES SALAR
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DdDTablero;
