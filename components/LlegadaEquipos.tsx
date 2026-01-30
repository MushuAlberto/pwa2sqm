
import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileText, Download, Calendar, 
  MapPin, Clock, ArrowLeft, Loader2, CheckCircle2, Circle, Truck, ChevronRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';

interface ArrivalData {
  fecha: string;
  destino: string;
  empresa: string;
  hora: number;
}

interface LlegadaEquiposProps {
  onBack: () => void;
}

export const LlegadaEquipos: React.FC<LlegadaEquiposProps> = ({ onBack }) => {
  const [data, setData] = useState<ArrivalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const processed: ArrivalData[] = jsonData.map(row => ({
          fecha: row.Fecha || row.FECHA || '',
          destino: row.Destino || row.DESTINO || 'S/D',
          empresa: row.Empresa || row.EMPRESA || 'S/E',
          hora: Number(row.Hora || row.HORA || 0)
        })).filter(r => r.fecha);

        setData(processed);
        const dates = [...new Set(processed.map(r => r.fecha))].sort().reverse();
        if (dates.length > 0) setSelectedDate(dates[0]);
      } catch (err) {
        console.error("Error procesando Excel:", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const filteredData = useMemo(() => 
    data.filter(d => d.fecha === selectedDate), 
  [data, selectedDate]);

  const statsByHour = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    
    filteredData.forEach(d => {
      const h = Math.floor(d.hora * 24);
      if (h >= 0 && h < 24) hours[h]++;
    });

    return Object.entries(hours).map(([h, count]) => ({
      hora: `${h}:00`,
      cantidad: count
    }));
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Llegada de Equipos</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Módulo de Control Logístico</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data.length > 0 && (
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {[...new Set(data.map(d => d.fecha))].sort().reverse().map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 bg-[#003595] hover:bg-[#002a75] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-900/10">
            <Upload size={16} />
            Cargar Excel
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} 
            />
          </label>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {data.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-slate-200">
              <Truck size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Esperando base de datos</h2>
              <p className="text-slate-400 max-w-sm font-medium">Cargue el archivo de control de llegadas para visualizar el flujo de equipos en faena.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-blue-500">
                  <div className="p-2 bg-blue-50 rounded-lg"><Truck size={20} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Equipos</span>
                </div>
                <p className="text-4xl font-black text-slate-800 tracking-tighter">{filteredData.length}</p>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Ingresos hoy</div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                  <div className="p-2 bg-emerald-50 rounded-lg"><MapPin size={20} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Destinos Activos</span>
                </div>
                <p className="text-4xl font-black text-slate-800 tracking-tighter">
                  {[...new Set(filteredData.map(d => d.destino))].length}
                </p>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Puntos de carga</div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <div className="p-2 bg-amber-50 rounded-lg"><Clock size={20} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Hora Punta</span>
                </div>
                <p className="text-4xl font-black text-slate-800 tracking-tighter">
                  {statsByHour.sort((a,b) => b.cantidad - a.cantidad)[0]?.hora || '--:--'}
                </p>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Mayor flujo</div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="p-2 bg-slate-50 rounded-lg"><CheckCircle2 size={20} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Estado</span>
                </div>
                <p className="text-2xl font-black text-slate-800 tracking-tight uppercase">Operativo</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase">
                  <Circle size={8} fill="currentColor" /> Sincronizado
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Flujo de Equipos por Hora</h3>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> Cantidad
                    </div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statsByHour}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cantidad" 
                        stroke="#003595" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Últimos Ingresos</h3>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[450px]">
                  {filteredData.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {filteredData.slice(0, 20).map((row, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                              <Truck size={18} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-700 uppercase leading-none mb-1">{row.empresa}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.destino}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] font-black text-slate-800">
                              {Math.floor(row.hora * 24)}:{String(Math.round((row.hora * 24 - Math.floor(row.hora * 24)) * 60)).padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-300">Sin datos para la fecha</div>
                  )}
                </div>
                <button className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                  Ver registro completo <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-6 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#89B821] flex items-center justify-center text-white">
            <Calendar size={16} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SGL Litio • v3.10.0</span>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">SQM Litio S.A. - Todos los derechos reservados</p>
      </footer>
    </div>
  );
};
