import React, { useMemo } from 'react';
import {
    ArrowLeft, Clock, Calendar, BarChart3, TrendingUp,
    Target, AlertCircle, ChevronRight, Gauge
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend, ReferenceLine, ComposedChart
} from 'recharts';
import { formatHoursToTime } from '../utils/dataProcessor';

interface DdDDataRow {
    Fecha: string;
    Producto: string;
    Destino: string;
    Ton_Prog: number;
    Ton_Real: number;
    Eq_Prog: number;
    Eq_Real: number;
    Regulacion_Real: number;
    faenaMetaHours: number;
    faenaRealHours: number;
}

interface DdDTableroProps {
    data: DdDDataRow[];
    selectedDate: string;
    onBack: () => void;
}

export const DdDTablero: React.FC<DdDTableroProps> = ({ data, selectedDate, onBack }) => {
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
                const metaFaena = item.faenaMetaHours || 2; // Default 2h si no hay
                const promTonReal = item.Eq_Real > 0 ? tonReal / item.Eq_Real : 0;
                const kpiPromTon = 29.2; // Valor estándar SQM

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
                    kpiReg: 10, // 10% estándar
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
        const last15 = dates.slice(-15);

        return last15.map(date => {
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

    // 4. Tiempo Promedio General del Día
    const avgFaenaDay = useMemo(() => {
        const active = dayData.filter(r => (r.faenaRealHours || 0) > 0);
        if (active.length === 0) return 0;
        return active.reduce((sum, r) => sum + r.faenaRealHours, 0) / active.length;
    }, [dayData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T12:00:00');
        return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-2 md:p-6 pb-20">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* HEADER EJECUTIVO */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#1e293b] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full -mr-32 -mt-32 opacity-20" />

                    <div className="flex items-center gap-6 relative z-10">
                        <button
                            onClick={onBack}
                            className="p-4 bg-slate-800 hover:bg-[#89B821] rounded-2xl transition-all duration-300 text-slate-400 hover:text-white shadow-lg active:scale-95"
                        >
                            <ArrowLeft size={28} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase italic">DdD TABLERO M1</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-[#89B821] text-[10px] font-black rounded uppercase">Live</span>
                                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Diálogo de Desempeño Operativo</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center relative z-10">
                        <div className="bg-slate-800/80 backdrop-blur-md p-4 px-8 rounded-3xl border border-slate-700 flex items-center gap-6 shadow-xl">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Tiempo Prom. Faena</p>
                                <div className="flex items-center gap-3 justify-center">
                                    <div className="w-10 h-10 rounded-xl bg-[#89B821]/20 flex items-center justify-center">
                                        <Clock size={20} className="text-[#89B821]" />
                                    </div>
                                    <span className="text-3xl font-black tabular-nums tracking-tighter">{formatHoursToTime(avgFaenaDay)}</span>
                                </div>
                            </div>
                            <div className="w-px h-12 bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Jornada Operativa</p>
                                <div className="flex items-center gap-3 justify-end">
                                    <span className="text-xl font-black capitalize tracking-tight">{formatDate(selectedDate)}</span>
                                    <Calendar size={22} className="text-[#89B821]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLA PRINCIPAL - ESTILO TABLERO EXCEL */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Gauge size={20} />
                            </div>
                            <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Matriz de Desempeño por Destino</h3>
                        </div>
                        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm" /> Desviación High</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-sm" /> En Meta</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1e293b] text-white text-[10px] uppercase tracking-tighter font-black">
                                    <th className="p-4 border-r border-slate-700 text-center">Despacho a</th>
                                    <th className="p-4 border-r border-slate-700">Producto</th>
                                    <th className="p-4 border-r border-slate-700 text-center">Ton Prog.</th>
                                    <th className="p-4 border-r border-slate-700 text-center">Ton Real</th>
                                    <th className="p-4 border-r border-slate-700 text-center">% Cumpl.</th>
                                    <th className="p-4 border-r border-slate-700 text-center bg-slate-800">KPI Int. Faena</th>
                                    <th className="p-4 border-r border-slate-700 text-center bg-slate-800">Tpo Int. Faena</th>
                                    <th className="p-4 border-r border-slate-700 text-center bg-slate-900 line-clamp-1">KPI % Reg.</th>
                                    <th className="p-4 border-r border-slate-700 text-center bg-slate-900 line-clamp-1">% Real Reg.</th>
                                    <th className="p-4 border-r border-slate-700 text-center">KPI Prom Ton</th>
                                    <th className="p-4 text-center">Prom Ton Real</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-bold tabular-nums">
                                {tableRows.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        {row.isFirstInDest && (
                                            <td
                                                className="p-4 border-r border-slate-100 bg-[#f8fafc] text-slate-800 font-black text-center align-middle"
                                                rowSpan={row.destCount}
                                            >
                                                {row.destino}
                                            </td>
                                        )}
                                        <td className="p-4 border-r border-slate-100 text-slate-600">{row.producto}</td>
                                        <td className="p-4 border-r border-slate-100 text-center">{Math.round(row.tonProg).toLocaleString()}</td>
                                        <td className="p-4 border-r border-slate-100 text-center">{Math.round(row.tonReal).toLocaleString()}</td>
                                        <td className={`p-4 border-r border-slate-100 text-center text-white ${row.cumplif < 85 ? 'bg-red-500' : 'bg-blue-600'}`}>
                                            {row.cumplif.toFixed(0)}%
                                        </td>
                                        <td className="p-4 border-r border-slate-100 text-center bg-slate-50 text-slate-400">
                                            {formatHoursToTime(row.kpiFaena)}
                                        </td>
                                        <td className={`p-4 border-r border-slate-100 text-center text-white ${row.realFaena > row.kpiFaena ? 'bg-red-500' : 'bg-blue-600'}`}>
                                            {row.realFaena > 0 ? formatHoursToTime(row.realFaena) : '-'}
                                        </td>
                                        <td className="p-4 border-r border-slate-100 text-center bg-slate-100 text-slate-400">
                                            {row.kpiReg}%
                                        </td>
                                        <td className="p-4 border-r border-slate-100 text-center bg-slate-100 text-blue-700">
                                            {row.realReg.toFixed(0)}%
                                        </td>
                                        <td className="p-4 border-r border-slate-100 text-center text-slate-400">
                                            {row.kpiPromTon.toFixed(1)}
                                        </td>
                                        <td className={`p-4 text-center text-white ${row.promTonReal < row.kpiPromTon ? 'bg-red-500' : 'bg-blue-600'}`}>
                                            {row.promTonReal > 0 ? row.promTonReal.toFixed(1) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DASHBOARD DE GRÁFICOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Gráfico 1: Tiempo Promedio en Faena */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tiempo Promedios en Faena</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tendencia últimos 15 días</p>
                            </div>
                            <Target size={20} className="text-slate-200" />
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={historicalData}>
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
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                                    />
                                    <Bar dataKey="tiempoFaena" fill="#f97316" radius={[6, 6, 0, 0]} name="Promedio Real" />
                                    <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'META (2h)', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico 2: Cumplimiento General y Eficiencia */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">% Cumplimiento y Promedio Ton</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Consolidado</p>
                            </div>
                            <TrendingUp size={20} className="text-slate-200" />
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={historicalData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="fecha"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={[26, 30]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Bar yAxisId="left" dataKey="cumplimiento" fill="#3b82f6" radius={[6, 6, 0, 0]} name="% Cumplimiento" />
                                    <Line yAxisId="right" type="monotone" dataKey="promTon" stroke="#1e293b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Prom. Ton/Eq" />
                                    <ReferenceLine yAxisId="left" y={85} stroke="#3b82f6" strokeDasharray="4 4" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN DE GRÁFICOS POR PRODUCTO (ESTILO EXCEL) */}
                <div className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#89B821]/10 text-[#89B821] rounded-lg">
                            <BarChart3 size={20} />
                        </div>
                        <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Desempeño Específico por Producto</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Generar un gráfico por cada producto principal */}
                        {['SLIT', 'LSI', 'COYA SUR', 'TOCOPILLA', 'BISCHOFITA', 'SAL 27/15'].map((prod) => {
                            const prodHistory = historicalData.map(d => {
                                // Filtrar datos específicos para este producto en cada fecha
                                const dayProdItems = data.filter(r => r.Fecha.split('-').slice(1).reverse().join('/') === d.fecha && (r.Producto.includes(prod) || r.Destino.includes(prod)));
                                const pProg = dayProdItems.reduce((sum, r) => sum + (r.Ton_Prog || 0), 0);
                                const pReal = dayProdItems.reduce((sum, r) => sum + (r.Ton_Real || 0), 0);
                                const pEq = dayProdItems.reduce((sum, r) => sum + (r.Eq_Real || 0), 0);

                                return {
                                    fecha: d.fecha,
                                    cumpl: pProg > 0 ? (pReal / pProg) * 100 : 0,
                                    pTon: pEq > 0 ? pReal / pEq : 0
                                };
                            });

                            return (
                                <div key={prod} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center border-b border-slate-50 pb-2">
                                        % CUMPLIMIENTO {prod} Y PROMEDIO TON.
                                    </h4>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={prodHistory}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                                <XAxis dataKey="fecha" hide />
                                                <YAxis yAxisId="left" hide domain={[0, 140]} />
                                                <YAxis yAxisId="right" orientation="right" hide domain={[26, 30]} />
                                                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '12px' }} />
                                                <Bar yAxisId="left" dataKey="cumpl" fill={prod === 'SLIT' ? '#3b82f6' : prod === 'COYA SUR' ? '#f59e0b' : '#10b981'} radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="right" type="step" dataKey="pTon" stroke="#1e293b" strokeWidth={2} dot={{ r: 2 }} />
                                                <ReferenceLine yAxisId="left" y={100} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] py-8">
                    SQM Operaciones <ChevronRight size={12} className="text-slate-300" /> Gerencia de Logística Salar
                </div>
            </div>
        </div>
    );
};
