
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Brain, Loader2,
  Download, Home, ArrowLeft, Truck, Image as ImageIcon
} from 'lucide-react';
import { analyzeLogisticsWithGemini } from '../services/geminiService';
import ChartCard from './ChartCard';
import ProductDetailSection from './ProductDetailSection';
import MainMenu from './MainMenu';
import { LlegadaEquipos } from './LlegadaEquipos';
import ReportFooter from './ReportFooter';
import { cleanNumeric, parseExcelTime, formatHoursToTime, formatDateToCL } from '../utils/dataProcessor';

const FIXED_CHARTS: any[] = [
  {
    type: 'bar',
    xAxis: 'Producto',
    yAxis: ['Ton_Prog', 'Ton_Real'],
    title: 'Comparativa Tonelaje: Programado vs Real'
  },
  {
    type: 'bar',
    xAxis: 'Producto',
    yAxis: 'Eq_Real',
    title: 'Equipos Reales por Tipo de Producto'
  },
  {
    type: 'pie',
    xAxis: 'Destino',
    yAxis: 'Ton_Real',
    title: 'Distribución de Carga por Destino'
  },
];

const App: React.FC = () => {
  const [view, setView] = useState<'menu' | 'informe' | 'llegada'>('menu');
  const [rawData, setRawData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [userCharts] = useState<any[]>(FIXED_CHARTS);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  const isRunning = loading || analyzing || exportingPDF || exportingImage;


  useEffect(() => {
    if (selectedDate && rawData.length > 0 && view === 'informe') {
      const dayData = rawData.filter(r => r.Fecha === selectedDate);
      if (dayData.length > 0) {
        triggerAnalysis(dayData, selectedDate);
      }
    }
  }, [selectedDate, view, rawData]);

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
          faenaMeta: getIdx("FAENA META", 49),
          faenaReal: getIdx("FAENA REAL", 50)
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
        const dates = [...new Set(processed.map(r => r.Fecha))].sort().reverse();
        if (dates.length > 0) setSelectedDate(dates[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const triggerAnalysis = async (dayData: any[], date: string) => {
    setAnalyzing(true);
    setConfig(null);
    try {
      const sdaList = dayData.map(d => d.sdaHours).filter(v => v > 0);
      const pangList = dayData.map(d => d.pangHours).filter(v => v > 0);
      const avgSdaHours = sdaList.length > 0 ? (sdaList.reduce((a, b) => a + b, 0) / sdaList.length) : 0;
      const avgPangHours = pangList.length > 0 ? (pangList.reduce((a, b) => a + b, 0) / pangList.length) : 0;
      const aiConfig = await analyzeLogisticsWithGemini(dayData, date, {
        avgSda: formatHoursToTime(avgSdaHours),
        avgPang: formatHoursToTime(avgPangHours)
      });
      setConfig(aiConfig);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredData = useMemo(() => rawData.filter(r => r.Fecha === selectedDate), [rawData, selectedDate]);
  const productList = useMemo(() => [...new Set(filteredData.map(r => r.Producto))].sort(), [filteredData]);

  const fixedKPIs = useMemo(() => {
    if (filteredData.length === 0) return [];

    const tonProg = filteredData.reduce((acc, curr) => acc + (curr.Ton_Prog || 0), 0);
    const tonReal = filteredData.reduce((acc, curr) => acc + (curr.Ton_Real || 0), 0);
    const eqProg = filteredData.reduce((acc, curr) => acc + (curr.Eq_Prog || 0), 0);
    const eqReal = filteredData.reduce((acc, curr) => acc + (curr.Eq_Real || 0), 0);
    const totalReg = filteredData.reduce((acc, curr) => acc + (curr.Regulacion_Real || 0), 0);

    const faenaRealList = filteredData.map(d => d.faenaRealHours).filter(v => v > 0);
    const faenaMetaList = filteredData.map(d => d.faenaMetaHours).filter(v => v > 0);
    const avgReal = faenaRealList.length > 0 ? (faenaRealList.reduce((a, b) => a + b, 0) / faenaRealList.length) : 0;
    const avgMeta = faenaMetaList.length > 0 ? (faenaMetaList.reduce((a, b) => a + b, 0) / faenaMetaList.length) : 0;
    const timeDiff = avgReal - avgMeta;

    return [
      { label: "Cumplimiento Tonelaje", value: `${tonProg > 0 ? ((tonReal / tonProg) * 100).toFixed(1) : 0}%`, color: "text-[#89B821]" },
      { label: "Carga Promedio (Ton/EQ)", value: eqReal > 0 ? (tonReal / eqReal).toFixed(2) : "0.00", color: "text-[#1e293b]" },
      { label: "Uso de Flota (Real vs Prog)", value: `${eqProg > 0 ? ((eqReal / eqProg) * 100).toFixed(1) : 0}%`, color: "text-[#1e293b]" },
      { label: "Desviación Tiempo Faena", value: `${timeDiff > 0 ? '+' : ''}${formatHoursToTime(timeDiff)}`, color: timeDiff > (10 / 60) ? "text-rose-600" : "text-[#89B821]" },
      { label: "Total Regulaciones", value: totalReg.toString(), color: "text-[#1e293b]" }
    ];
  }, [filteredData]);

  const confirmExportPDF = async () => {
    const html2pdfLib = (window as any).html2pdf;
    if (!html2pdfLib) return;
    setExportingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const element = document.getElementById('dashboard-report');
    if (!element) return;
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `informe_litio_${formatDateToCL(selectedDate)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    try {
      await html2pdfLib().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  const downloadExecutiveImage = async () => {
    const html2canvas = (window as any).html2canvas;
    if (!html2canvas) return;
    setExportingImage(true);
    try {
      const element = document.getElementById('executive-summary-capture');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el: Element) => el.classList.contains('no-capture'),
      });

      const link = document.createElement('a');
      link.download = `Resumen_Ejecutivo_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error("Error al exportar imagen:", err);
    } finally {
      setExportingImage(false);
    }
  };

  if (view === 'menu') return <MainMenu onSelectView={(v) => setView(v)} />;
  if (view === 'llegada') return <LlegadaEquipos onBack={() => setView('menu')} />;

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden">
      <aside className="w-[300px] bg-[#f0f2f6] border-r border-slate-200 flex flex-col no-print shrink-0">
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-colors mb-4 group">
            <Home size={14} className="group-hover:-translate-x-1 transition-transform" /> Menú Principal
          </button>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col items-center gap-3 shadow-sm">
            <h1 className="font-black text-sm tracking-widest uppercase text-slate-800">Litio Dashboard</h1>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Cargar base de datos</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-[10px] text-slate-500 uppercase font-bold">Arrastrar archivo Excel</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
            </label>
          </div>
          {rawData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Seleccionar Fecha</p>
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ff4b4b]/20">
                {[...new Set(rawData.map(r => r.Fecha))].sort().reverse().map((d: any) => <option key={d} value={d}>{formatDateToCL(d)}</option>)}
              </select>
            </div>
          )}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <button disabled={rawData.length === 0 || isRunning} onClick={confirmExportPDF} className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm">
              <Download className="w-4 h-4" /> Download Report PDF
            </button>
            <button disabled={!config || isRunning} onClick={downloadExecutiveImage} className="w-full bg-[#89B821] hover:bg-[#78a41c] text-white py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm">
              <ImageIcon className="w-4 h-4" /> Exportar Resumen (PNG)
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
          <span>v3.10.0-Prod</span>
          <span className="font-bold uppercase tracking-widest">SQM LITIO S.A.</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-white">
        {isRunning && (
          <div className="absolute top-4 right-8 z-50 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-md border border-slate-100 animate-in fade-in slide-in-from-top-2 no-print">
            <Loader2 className="w-3 h-3 animate-spin text-[#ff4b4b]" />
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Procesando...</span>
          </div>
        )}

        <div className="max-w-5xl mx-auto p-8 space-y-12 pdf-export-container" id="dashboard-report">
          {rawData.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Esperando datos...</h2>
                <p className="text-slate-500 max-w-sm font-medium">Carga un archivo Excel para ver el informe operativo de la jornada.</p>
              </div>
              <button onClick={() => setView('menu')} className="text-slate-400 hover:text-slate-800 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                <ArrowLeft size={14} /> Volver al menú de módulos
              </button>
            </div>
          ) : (
            <>
              <div className="no-page-break space-y-8 bg-white min-h-[900px] flex flex-col">
                <div id="executive-summary-capture" className="bg-white p-8 space-y-10">
                  <div className="flex justify-between items-start pb-6 border-b-2 border-slate-100">
                    <div className="flex flex-col gap-6">
                      <div>
                        <h1 className="text-4xl font-[900] text-[#1e293b] tracking-tighter leading-none mb-1 uppercase">INFORME OPERATIVO</h1>
                        <p className="text-slate-400 font-bold text-[9px] tracking-[0.3em] uppercase">Despacho Litio - Gerencia de Operaciones Salar</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-slate-400 font-bold text-[8px] tracking-widest uppercase mb-0.5">Fecha Reporte</p>
                      <p className="text-3xl font-black text-[#89B821] tracking-tight">{formatDateToCL(selectedDate)}</p>
                    </div>
                  </div>

                  {config && (
                    <div className="bg-white rounded-[1.5rem] p-8 border-2 border-[#89B821]/30 border-l-[10px] space-y-6 relative overflow-hidden shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[#89B821]">
                          <Brain className="w-4 h-4" />
                          <span className="font-black uppercase tracking-[0.2em] text-[9px]">Resumen de Gestión de IA</span>
                        </div>
                        <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter uppercase">Estado de Operación</h2>
                      </div>
                      <p className="text-lg font-medium leading-snug italic text-slate-600 max-w-4xl font-serif">"{config.summary}"</p>
                    </div>
                  )}

                  {fixedKPIs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
                      {fixedKPIs.map((kpi: any, idx: number) => (
                        <div key={idx} className="bg-white p-6 rounded-[1.8rem] border border-slate-100 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all border-b-4 border-b-slate-50">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{kpi.label}</span>
                          <span className={`text-2xl font-black ${kpi.color} tracking-tighter leading-none`}>{kpi.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {config && (
                    <div className="pt-4">
                      <ChartCard
                        type="composed"
                        xAxis="Producto"
                        yAxis={['Ton_Prog', 'Ton_Real', 'faenaMetaHours', 'faenaRealHours']}
                        title="Desempeño Integral por Producto: Volumen (Ton) vs Tiempo (Hrs)"
                        data={filteredData}
                      />
                    </div>
                  )}
                </div>
                <ReportFooter />
              </div>

              {productList.map((prod, idx) => (
                <div key={prod} className="page-break-before pt-10 bg-white min-h-[900px] flex flex-col">
                  <div className="flex-1">
                    <ProductDetailSection product={prod} data={filteredData.filter(d => d.Producto === prod)} index={idx + 1} total={productList.length} />
                  </div>
                  <ReportFooter />
                </div>
              ))}

              <div className="space-y-6 pt-10 page-break-before bg-white min-h-[900px] flex flex-col">
                <h2 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Equipos e Logística por Destino</h2>
                <div className="grid grid-cols-2 gap-6 flex-1">
                  {userCharts.slice(1).map((c, i) => (<ChartCard key={i} {...c} data={filteredData} />))}
                </div>
                <ReportFooter />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
