
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Loader2,
  Home, Truck, Image as ImageIcon,
  Clock, BarChart3, TrendingUp, Target, Users, Scale, ClipboardCheck, FileText, Download
} from 'lucide-react';
// import { analyzeLogisticsWithGemini } from '../services/geminiService.ts'; // Eliminado
import ChartCard from './ChartCard.tsx';
import ProductDetailSection from './ProductDetailSection.tsx';
import MainMenu from './MainMenu.tsx';
import { LlegadaEquipos } from './LlegadaEquipos.tsx';
import { MemoryModule } from './MemoryModule.tsx';
import { DdDTablero } from './DdDTablero.tsx';
import ReportFooter from './ReportFooter.tsx';
import InstructionModal from './InstructionModal.tsx';
import { cleanNumeric, parseExcelTime, formatHoursToTime, formatDateToCL, downloadBackupJSON } from '../utils/dataProcessor.ts';

declare const html2pdf: any;
declare const html2canvas: any;

const App: React.FC = () => {
  const [view, setView] = useState<'menu' | 'llegada' | 'informe' | 'memoria' | 'ddd'>('menu');
  const [rawData, setRawData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Cargar datos persistidos al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('sqm_raw_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setRawData(parsed);
        const dates = [...new Set(parsed.map((r: any) => r.Fecha))].sort().reverse();
        if (dates.length > 0) setSelectedDate(dates[0] as string);
      } catch (e) {
        console.error("Error cargando caché de datos");
      }
    }
  }, []);

  const isRunning = loading || exportingPDF || exportingImage;

  // Análisis de IA eliminado; ya no es necesario triggerAnalysis ni manejar llaves API.

  const handleExportPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    document.body.classList.add('is-exporting');

    const element = document.getElementById('dashboard-report');
    const opt = {
      margin: [10, 10],
      filename: `Informe_Operativo_${selectedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'legal', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } finally {
      document.body.classList.remove('is-exporting');
      setExportingPDF(false);
    }
  };

  const handleExportImage = async () => {
    if (exportingImage) return;
    setExportingImage(true);
    const element = document.getElementById('executive-summary-capture');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `Resumen_Operativo_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExportingImage(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames.find(n => n === "Base de Datos") || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) throw new Error("Archivo vacío.");

        const headers = jsonData[0].map(h => String(h || '').toUpperCase().trim());
        const getIdx = (name: string, fallback: number) => {
          const found = headers.findIndex(h => h.includes(name.toUpperCase()));
          return found !== -1 ? found : fallback;
        };

        const idx = {
          fecha: getIdx("FECHA", 1),
          producto: getIdx("PRODUCTO", 31),
          destino: getIdx("DESTINO", 32),
          tonProg: getIdx("TON_PROG", 33),
          tonReal: getIdx("TON_REAL", 34),
          eqProg: getIdx("EQ_PROG", 35),
          eqReal: getIdx("EQ_REAL", 36),
          regReal: getIdx("REGULACION", 46),
          sda: getIdx("TPO SDA", 4),
          pang: getIdx("TPO PANG", 5),
          faenaMeta: 49,
          faenaReal: 50
        };

        const processed = jsonData.slice(1).map((row) => {
          if (!row || row.length < 2) return null;
          let dateVal = null;
          let rawDate = row[idx.fecha];
          if (rawDate instanceof Date) dateVal = rawDate.toISOString().split('T')[0];
          else if (typeof rawDate === 'number') {
            const d = new Date((rawDate - 25569) * 86400 * 1000);
            if (!isNaN(d.getTime())) dateVal = d.toISOString().split('T')[0];
          }
          if (!dateVal) return null;

          return {
            Fecha: dateVal,
            Producto: String(row[idx.producto] || 'SIN PRODUCTO').toUpperCase().trim(),
            Destino: String(row[idx.destino] || 'S/D').trim(),
            Ton_Prog: cleanNumeric(row[idx.tonProg]),
            Ton_Real: cleanNumeric(row[idx.tonReal]),
            Eq_Prog: cleanNumeric(row[idx.eqProg]),
            Eq_Real: cleanNumeric(row[idx.eqReal]),
            Regulacion_Real: cleanNumeric(row[idx.regReal]),
            sdaHours: parseExcelTime(row[idx.sda]),
            pangHours: parseExcelTime(row[idx.pang]),
            faenaMetaHours: parseExcelTime(row[idx.faenaMeta]),
            faenaRealHours: parseExcelTime(row[idx.faenaReal])
          };
        }).filter(r => r !== null);

        setRawData(processed);
        localStorage.setItem('sqm_raw_data', JSON.stringify(processed));
        const dates = [...new Set(processed.map(r => r.Fecha))].sort().reverse();
        if (dates.length > 0) setSelectedDate(dates[0]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const filteredData = useMemo(() => rawData.filter(r => r.Fecha === selectedDate), [rawData, selectedDate]);

  const operationalKPIs = useMemo(() => {
    if (filteredData.length === 0) return null;
    const totalTonReal = filteredData.reduce((a, b) => a + b.Ton_Real, 0);
    const totalTonProg = filteredData.reduce((a, b) => a + b.Ton_Prog, 0);
    const totalEqReal = filteredData.reduce((a, b) => a + b.Eq_Real, 0);
    const totalReg = filteredData.reduce((acc, d) => acc + (Number(d.Regulacion_Real) || 0), 0);
    const validSdaTimes = filteredData.map(d => d.sdaHours).filter(v => v > 0);
    const avgSda = validSdaTimes.length > 0 ? validSdaTimes.reduce((a, b) => a + b, 0) / validSdaTimes.length : 0;
    const validPangTimes = filteredData.map(d => d.pangHours).filter(v => v > 0);
    const avgPang = validPangTimes.length > 0 ? validPangTimes.reduce((a, b) => a + b, 0) / validPangTimes.length : 0;
    const totalHoursInFaena = filteredData.reduce((a, b) => a + b.faenaRealHours, 0);
    const productivity = totalHoursInFaena > 0 ? totalTonReal / totalHoursInFaena : 0;
    const compliance = totalTonProg > 0 ? (totalTonReal / totalTonProg) * 100 : 0;
    const avgLoad = totalEqReal > 0 ? totalTonReal / totalEqReal : 0;

    return [
      { label: "Tiempo Gral. Faena (SdA)", value: formatHoursToTime(avgSda), icon: <Clock className="w-3.5 h-3.5" /> },
      { label: "TIEMPO GRAL: FAENA (NY)", value: formatHoursToTime(avgPang), icon: <Clock className="w-3.5 h-3.5" /> },
      { label: "Productividad Diaria", value: `${productivity.toFixed(1)} T/H`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
      { label: "Carga Real Despachada", value: `${totalTonReal.toLocaleString()} Ton`, icon: <Truck className="w-3.5 h-3.5" /> },
      { label: "Cumplimiento Programa", value: `${compliance.toFixed(1)}%`, icon: <Target className="w-3.5 h-3.5" />, status: compliance < 85 ? 'danger' : 'normal' },
      { label: "Intensidad de Flota", value: `${totalEqReal} EQ`, icon: <Users className="w-3.5 h-3.5" /> },
      { label: "Factor de Carga (Eficiencia)", value: `${avgLoad.toFixed(1)} T/EQ`, icon: <Scale className="w-3.5 h-3.5" /> },
      { label: "Cantidad Total Regulaciones", value: `${Math.round(totalReg)} Reg.`, icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
    ];
  }, [filteredData]);

  const productList = useMemo(() => {
    const products = [...new Set(filteredData.map(r => r.Producto as string))] as string[];
    return products.sort((a: string, b: string) => {
      const priority: Record<string, number> = { 'SLIT': 1, 'LSI (S)': 2 };
      const aPrio = priority[a] || 99;
      const bPrio = priority[b] || 99;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return a.localeCompare(b);
    });
  }, [filteredData]);

  if (view === 'menu') return (
    <>
      <InstructionModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
      <MainMenu onSelectView={(v) => setView(v)} />
    </>
  );
  if (view === 'llegada') return <LlegadaEquipos onBack={() => setView('menu')} />;
  if (view === 'memoria') return (
    <MemoryModule
      data={rawData}
      onBack={() => setView('menu')}
      onSelectDate={(d) => { setSelectedDate(d); setView('informe'); }}
    />
  );

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden">
      <InstructionModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

      <aside className="w-[300px] bg-[#f8fafc] border-r border-slate-200 flex flex-col no-print shrink-0">
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-colors mb-4 group">
            <Home size={14} className="group-hover:-translate-x-1 transition-transform" /> Menú Principal
          </button>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col items-center gap-2 shadow-sm">
            <h1 className="font-black text-[14px] tracking-[0.1em] uppercase text-slate-900 leading-none">SQM LITIO</h1>
            <h2 className="font-black text-[10px] tracking-[0.2em] uppercase text-slate-400">Management</h2>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargar Datos</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-white hover:border-[#89B821] hover:bg-slate-50 transition-all">
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Upload className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Base Excel</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
            </label>
          </div>

          {/* Notificación de Error de IA eliminada */}

          {rawData.length > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jornada</p>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-[#89B821]/10">
                  {[...new Set(rawData.map(r => r.Fecha))].sort().reverse().map(d => <option key={d as string} value={d as string}>{formatDateToCL(d as string)}</option>)}
                </select>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Herramientas</p>
                <button onClick={handleExportPDF} disabled={exportingPDF} className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                  {exportingPDF ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Exportar PDF
                </button>
                <button onClick={handleExportImage} disabled={exportingImage} className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                  {exportingImage ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} Descargar PNG
                </button>
                <button onClick={downloadBackupJSON} className="w-full bg-[#003595] text-white py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#002a75] transition-all shadow-lg shadow-blue-500/10">
                  <Download size={12} /> Descargar Historial
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-white">
        {isRunning && (
          <div className="absolute top-4 right-8 z-50 flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 no-print">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#89B821]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cargando Informe...</span>
          </div>
        )}

        <div className="max-w-5xl mx-auto p-8 space-y-0" id="dashboard-report">
          {rawData.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200"><BarChart3 size={48} /></div>
              <h2 className="text-3xl font-[900] text-[#1e293b] tracking-tighter uppercase">Gestión de Despacho Litio</h2>
              <p className="text-slate-400 font-medium">Cargue un archivo base para iniciar el análisis operativo.</p>
            </div>
          ) : (
            <>
              {/* PORTADA EXCLUSIVA PARA PDF */}
              <div className="pdf-only page-break-after flex flex-col items-center justify-center min-h-[1000px] w-full bg-white text-center">
                <div className="space-y-24 flex flex-col items-center w-full">
                  {/* Bloque Principal (Imagen) */}
                  <div className="flex items-center justify-center gap-10 w-full max-w-4xl px-10">
                    <img src="/logo-sqm.png" alt="SQM Logo" className="h-24 w-auto object-contain" />
                    <div className="flex flex-col items-start border-l-[2px] border-slate-100 pl-10 text-left">
                      <h1 className="text-[60px] font-[950] text-[#1e293b] tracking-[-0.04em] leading-none uppercase whitespace-nowrap">
                        INFORME OPERATIVO
                      </h1>
                      <p className="text-slate-400 font-bold text-sm tracking-[0.4em] uppercase mt-3 whitespace-nowrap">
                        DESPACHO LITIO <span className="text-slate-300 mx-2">•</span> OPERACIONES SALAR
                      </p>
                    </div>
                  </div>

                  {/* Fecha de la Jornada */}
                  <div className="pt-20">
                    <p className="text-slate-300 font-black text-xs tracking-[0.4em] uppercase mb-6">JORNADA CORRESPONDIENTE</p>
                    <p className="text-6xl font-[950] text-[#89B821] tracking-tighter">
                      {formatDateToCL(selectedDate)}
                    </p>
                  </div>

                  <div className="mt-32 pt-16 border-t border-slate-50 w-72">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] leading-loose">
                      GERENCIA DE LOGÍSTICA<br />
                      SALARES • SQM LITIO
                    </p>
                  </div>
                </div>
              </div>

              <div id="executive-summary-capture" className="no-pdf space-y-8 bg-white min-h-[1000px] flex flex-col mb-10 no-page-break">
                <div className="bg-white p-8 space-y-10 flex-1">
                  <div className="flex justify-between items-start pb-8 border-b-2 border-slate-50">
                    <div className="flex items-start gap-4">
                      <img src="/logo-sqm.png" alt="SQM Logo" className="h-16 w-auto object-contain mt-1" />
                      <div>
                        <h1 className="text-5xl font-[900] text-[#1e293b] tracking-tighter leading-none mb-1 uppercase">INFORME OPERATIVO</h1>
                        <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase">Despacho Litio • Operaciones Salar</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase mb-1">FECHA JORNADA</p>
                      <p className="text-4xl font-[900] text-[#89B821] tracking-tighter">{formatDateToCL(selectedDate)}</p>
                    </div>
                  </div>

                  {filteredData.length > 0 && (
                    <div className="bg-white rounded-[2.5rem] p-10 border-2 border-[#89B821]/10 border-l-[12px] border-l-[#89B821] space-y-8 relative overflow-hidden shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[#89B821]"><span className="font-black uppercase tracking-[0.3em] text-[10px]">KPIs OPERATIVOS</span></div>
                        <h2 className="text-4xl font-[900] text-[#1e293b] tracking-tighter uppercase">Cumplimiento Global</h2>
                      </div>
                      <div className="grid grid-cols-4 gap-4 pt-6">
                        {operationalKPIs?.map((kpi, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-50 flex flex-col gap-2 shadow-sm border-b-4 border-b-[#f8fafc] hover:border-[#89B821]/30 transition-all duration-300">
                            <div className="flex items-center gap-2 text-slate-300">{kpi.icon}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{kpi.label}</span></div>
                            <span className={`text-2xl font-[900] ${kpi.status === 'danger' ? 'text-rose-600' : 'text-[#89B821]'} tracking-tighter my-1`}>{kpi.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    <ChartCard
                      type="composed"
                      xAxis="Producto"
                      yAxis={['Ton_Prog', 'Ton_Real', 'faenaMetaHours', 'faenaRealHours']}
                      title="Análisis Comparativo: Tonelaje vs Horas de Operación"
                      data={filteredData}
                    />
                  </div>
                </div>
                <div className="px-8 pb-8 mt-auto"><ReportFooter /></div>
              </div>

              {productList.map((prod, idx) => (
                <div key={`${selectedDate}-${prod}`} className="page-break-before bg-white flex flex-col min-h-screen pt-4">
                  <div className="flex-1 px-4">
                    <ProductDetailSection
                      product={prod}
                      data={filteredData.filter(d => d.Producto === prod)}
                      date={selectedDate}
                      index={idx + 1}
                      total={productList.length}
                    />
                  </div>
                  <div className="mt-auto px-4 pb-6"><ReportFooter /></div>
                </div>
              ))}
            </>
          )}
        </div>
        {view === 'ddd' && (
          <DdDTablero
            data={rawData}
            selectedDate={selectedDate}
            onBack={() => setView('menu')}
          />
        )}
      </main>
    </div>
  );
};

export default App;
