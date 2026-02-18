
import React from 'react';
import {
  X, Truck, FileBarChart, History, AlertCircle, Info, CheckCircle2,
  ChevronRight, FileSpreadsheet, FileJson
} from 'lucide-react';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionModal: React.FC<InstructionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-[#003595]">
              <Info size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-[900] text-slate-900 tracking-tighter uppercase leading-none">Guía de Operación Inteligente</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SQM Litio • Sistema de Gestión Logística v3.1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-slate-500 transition-colors bg-white rounded-full shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Módulo 1 */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-[#003595] rounded-xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">1. Llegada de Equipos</h3>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <p className="text-[9px] font-black text-[#003595] uppercase tracking-wider mb-1">Cargar Archivo:</p>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-[#003595]" />
                  <span className="text-[10px] font-bold text-slate-700">02.- Histórico Romanas</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Procesa el flujo de entrada de camiones. Genera análisis de frecuencia por hora y tablas de control por empresa y destino.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Gráficos de frecuencia</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Reportes con branding</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> PDF para correo: "Llegada de equipos a Salar hasta las 24:00 hrs"</li>
                </ul>
              </div>
            </div>

            {/* Módulo 2 */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-[#89B821] rounded-xl flex items-center justify-center">
                  <FileBarChart size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">2. Informe Operativo</h3>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-1">Cargar Archivo:</p>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-700">08.- Tablero Despachos 2026</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Núcleo analítico diario. Compara tonelaje y tiempos meta contra real. Redacción técnica ejecutiva para justificaciones.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Protocolo Redacción Técnica</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Exportación Oficio PDF (Adjunto)</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Captura PNG (Cuerpo Correo: "Informe Operacional Despacho Litio")</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Memoria JSON (Guardar en carpeta: "Respaldo Operacional")</li>
                </ul>
              </div>
            </div>

            {/* Módulo 3 */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <History size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">3. Memoria Operativa</h3>
              </div>
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-700 uppercase tracking-wider mb-1">Cargar Archivo:</p>
                <div className="flex items-center gap-2">
                  <FileJson size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-bold text-slate-700">Respaldo Operacional (.json)</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Centro de seguridad histórica. Permite importar justificaciones pasadas y auditar el historial sin re-procesar Excel.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Persistencia de datos</li>
                  <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 size={12} className="text-emerald-500" /> Auditoría rápida</li>
                </ul>
                <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                  <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[9px] font-bold text-amber-700 leading-tight">
                    Si borras el historial/caché: Carga los archivos .json creados en el "Informe Operativo" (Memoria Diaria).
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Technical Note */}
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex items-start gap-4">
            <div className="p-2 bg-white text-slate-400 rounded-lg shrink-0 shadow-sm">
              <AlertCircle size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nota técnica de compatibilidad</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Asegúrate de que los archivos Excel mantengan las cabeceras originales para que los algoritmos de detección automática de columnas funcionen sin errores. No modifiques el nombre de las columnas en los archivos maestros.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-white border-t border-slate-50 flex justify-center shrink-0">
          <button
            onClick={onClose}
            className="group flex items-center justify-center gap-3 bg-[#003595] hover:bg-black text-white px-12 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/10 transition-all active:scale-95"
          >
            Comenzar Operación
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionModal;
