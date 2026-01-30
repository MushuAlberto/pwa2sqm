
import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, Calendar,
  MapPin, Clock, ArrowLeft, Truck, FileText, ChevronDown, Filter
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { normalizeCompanyName, formatDateToCL } from '../utils/dataProcessor.ts';

interface ArrivalData {
  fecha: string;
  destino: string;
  empresa: string;
  hora: number;
}

interface LlegadaEquiposProps {
  onBack: () => void;
}

const LOGOS: Record<string, string> = {
  "COSEDUCAM S A": "/coseducam.png",
  "M&Q SPA": "/mq.png",
  "M S & D SPA": "/msd.png",
  "JORQUERA TRANSPORTE S. A.": "/jorquera.png",
  "AG SERVICES SPA": "/ag.png"
};

const CHART_COLORS = ['#003595', '#89B821', '#ff4b4b', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const LlegadaEquipos: React.FC<LlegadaEquiposProps> = ({ onBack }) => {
  const [data, setData] = useState<ArrivalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [hourRange, setHourRange] = useState<[number, number]>([0, 23]);

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        // Intentar buscar la pestana correcta
        const sheetName = workbook.SheetNames.find(n =>
          n.toUpperCase().includes("BASE") ||
          n.toUpperCase().includes("LLEGADA") ||
          n.toUpperCase().includes("DATOS")
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) throw new Error("Archivo vacío.");

        // 1. Encontrar la fila de cabecera (no siempre es la 0)
        let headerIdx = -1;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i].map(c => String(c || '').toUpperCase());
          if (row.includes('FECHA') || row.includes('EMPRESA') || row.includes('PRODUCTO')) {
            headerIdx = i;
            break;
          }
        }

        // Si no se encuentra, asumir fila 0
        const startRow = headerIdx !== -1 ? headerIdx : 0;
        const headers = jsonData[startRow].map(h => String(h || '').toUpperCase().trim());

        const getIdx = (name: string, fallback: number) => {
          const found = headers.findIndex(h => h.includes(name.toUpperCase()));
          return found !== -1 ? found : fallback;
        };

        const idx = {
          fecha: getIdx("FECHA", 0),
          destino: getIdx("DESTINO", 3),
          empresa: getIdx("EMPRESA", 11),
          hora: getIdx("HORA", 14)
        };

        const processed: ArrivalData[] = jsonData.slice(startRow + 1).map(row => {
          if (!row || row.length < 2) return null;

          // Procesamiento robusto de Fecha
          let dateStr = '';
          const rawDate = row[idx.fecha];
          if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split('T')[0];
          } else if (typeof rawDate === 'number') {
            const d = new Date((rawDate - 25569) * 86400 * 1000);
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string') {
            // Intentar parsear string "DD/MM/YYYY" o "YYYY-MM-DD"
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              else dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          if (!dateStr) return null;

          // Procesamiento robusto de Hora
          let horaNum = 0;
          const rawHora = row[idx.hora];
          if (rawHora instanceof Date) {
            horaNum = rawHora.getHours() + (rawHora.getMinutes() / 60);
          } else if (typeof rawHora === 'string' && rawHora.includes(':')) {
            const parts = rawHora.split(':').map(Number);
            horaNum = (parts[0] || 0) + ((parts[1] || 0) / 60);
          } else if (typeof rawHora === 'number') {
            horaNum = rawHora * 24;
          }

          return {
            fecha: dateStr,
            destino: String(row[idx.destino] || 'SIN DESTINO').trim().toUpperCase(),
            empresa: normalizeCompanyName(row[idx.empresa]),
            hora: horaNum
          };
        }).filter((r): r is ArrivalData => r !== null && !!r.fecha && !!r.empresa);

        if (processed.length === 0) throw new Error("No se procesaron datos.");

        setData(processed);
        const dates = [...new Set(processed.map(r => r.fecha))].sort().reverse();
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
          const dayData = processed.filter(r => r.fecha === dates[0]);
          const cos = [...new Set(dayData.map(r => r.empresa))].sort();
          if (cos.length > 0) setSelectedCompany(cos[0]);
        }
      } catch (err) {
        console.error("Error procesando Excel:", err);
        alert("Error al cargar el archivo. Verifica que las columnas FECHA, EMPRESA, DESTINO y HORA existan.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const companies = useMemo(() => {
    const dayData = data.filter(d => d.fecha === selectedDate);
    return [...new Set(dayData.map(d => d.empresa))].sort();
  }, [data, selectedDate]);

  const allDestinations = useMemo(() => {
    const dayData = data.filter(d => d.fecha === selectedDate && d.empresa === selectedCompany);
    return [...new Set(dayData.map(d => d.destino))].sort();
  }, [data, selectedDate, selectedCompany]);

  // Sync selected destinations when company changes
  useMemo(() => {
    setSelectedDestinations(allDestinations);
  }, [allDestinations]);

  const filteredData = useMemo(() => {
    return data.filter(d =>
      d.fecha === selectedDate &&
      d.empresa === selectedCompany &&
      selectedDestinations.includes(d.destino) &&
      d.hora >= hourRange[0] && d.hora <= hourRange[1] + 0.99
    );
  }, [data, selectedDate, selectedCompany, selectedDestinations, hourRange]);

  const chartData = useMemo(() => {
    const hours: Record<number, Record<string, number>> = {};
    for (let i = hourRange[0]; i <= hourRange[1]; i++) {
      hours[i] = { hora: i };
      selectedDestinations.forEach(dest => {
        hours[i][dest] = 0;
      });
    }

    filteredData.forEach(d => {
      const h = Math.floor(d.hora);
      if (hours[h] && hours[h][d.destino] !== undefined) {
        hours[h][d.destino]++;
      }
    });

    return Object.values(hours).map(h => ({
      ...h,
      horaStr: `${String(h.hora).padStart(2, '0')}:00`
    }));
  }, [filteredData, selectedDestinations, hourRange]);

  const pivotTable = useMemo(() => {
    const table: Record<number, Record<string, number>> = {};
    const dests = selectedDestinations;

    filteredData.forEach(d => {
      const h = Math.floor(d.hora);
      if (!table[h]) table[h] = {};
      table[h][d.destino] = (table[h][d.destino] || 0) + 1;
    });

    return Object.entries(table)
      .map(([h, counts]) => ({ hora: Number(h), ...counts }))
      .sort((a, b) => a.hora - b.hora);
  }, [filteredData, selectedDestinations]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800">
      {/* Header Estilo SQM */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm no-print">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900">
            <ArrowLeft size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Llegada de Equipos</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SQM Litio - Control de Acceso</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data.length > 0 && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[#003595]/10 cursor-pointer"
            >
              {[...new Set(data.map(d => d.fecha))].sort().reverse().map((d: any) => <option key={d} value={d}>{formatDateToCL(d)}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 bg-[#003595] hover:bg-[#002a75] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-900/10">
            <Upload size={16} /> Subir Excel
            <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
          </label>
        </div>
      </header >

      <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full space-y-8">
        {data.length === 0 ? (
          <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-center text-slate-200 border border-slate-50">
              <Truck size={48} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dashboard Logístico</h2>
              <p className="text-slate-400 max-w-sm font-medium">Cargue el reporte de jornada para visualizar el flujo de entrada de equipos por empresa y destino.</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Filtros de Empresa y Destino */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 no-print">
              <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[#003595] mb-2">
                  <Filter size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 px-1">Seleccionar Empresa</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#003595]/5 transition-all"
                  >
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destinos de {selectedCompany}</span>
                    <button
                      onClick={() => setSelectedDestinations(allDestinations)}
                      className="text-[9px] font-black uppercase text-[#003595] hover:underline"
                    >
                      Seleccionar Todos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allDestinations.map(dest => (
                      <button
                        key={dest}
                        onClick={() => setSelectedDestinations(prev => prev.includes(dest) ? prev.filter(d => d !== dest) : [...prev, dest])}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedDestinations.includes(dest)
                          ? 'bg-[#003595] text-white border-[#003595] shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                          }`}
                      >
                        {dest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Visual */}
            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden print:border-none print:shadow-none">
              {/* Banner y Logo */}
              <div className="relative h-64 overflow-hidden">
                <img src="/image.png" alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-10 flex items-end gap-6">
                  <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center justify-center w-32 h-32 border-4 border-white/20 backdrop-blur-sm">
                    {LOGOS[selectedCompany] ? (
                      <img src={LOGOS[selectedCompany]} alt={selectedCompany} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Truck size={40} className="text-slate-200" />
                    )}
                  </div>
                  <div className="mb-2">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{selectedCompany}</h2>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Reporte de Flujo de Equipos • {formatDateToCL(selectedDate)}</p>
                  </div>
                </div>
              </div>

              <div className="p-10 grid grid-cols-1 xl:grid-cols-5 gap-10">
                {/* Gráfico */}
                <div className="xl:col-span-3 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Análisis de Frecuencia</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Llegadas por hora y punto de destino</p>
                    </div>
                  </div>

                  <div className="h-[450px] w-full bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="horaStr" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                          labelStyle={{ fontWeight: '900', color: '#1e293b', marginBottom: '8px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        {selectedDestinations.map((dest, i) => (
                          <Line
                            key={dest}
                            type="monotone"
                            dataKey={dest}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={4}
                            dot={{ r: 4, fill: '#fff', strokeWidth: 3 }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            animationDuration={1500}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabla Pivot */}
                <div className="xl:col-span-2 space-y-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tabla de Control</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consolidado numérico de equipos</p>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Hora</th>
                            {selectedDestinations.map(dest => (
                              <th key={dest} className="px-6 py-4 text-[10px] font-black uppercase text-slate-900 tracking-tighter">{dest}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pivotTable.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-black text-slate-900 bg-slate-50/30">
                                {String(row.hora).padStart(2, '0')}:00
                              </td>
                              {selectedDestinations.map(dest => (
                                <td key={dest} className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${row[dest] > 0 ? 'bg-blue-50 text-[#003595]' : 'text-slate-200'}`}>
                                    {row[dest] || 0}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                          {pivotTable.length === 0 && (
                            <tr>
                              <td colSpan={selectedDestinations.length + 1} className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px]">
                                Sin datos para los filtros seleccionados
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-slate-900">
                          <tr>
                            <td className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest">Total</td>
                            {selectedDestinations.map(dest => (
                              <td key={dest} className="px-6 py-4 text-sm font-black text-white">
                                {pivotTable.reduce((acc, curr) => acc + (curr[dest] || 0), 0)}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="w-full bg-[#1e293b] hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/10 no-print"
                  >
                    <FileText size={18} /> Generar Reporte PDF (Imprimir)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#89B821] flex items-center justify-center text-white shadow-lg shadow-lime-500/20">
            <Calendar size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">Sistema de Gestión Logística</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SQM Litio S.A. • v3.10.0</span>
          </div>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] text-center md:text-right">Proyecto Dashboard Operativo • Confidencial</p>
      </footer>
    </div >
  );
};
