
import React from 'react';
import { Truck, FileBarChart, History, ChevronRight } from 'lucide-react';

interface MainMenuProps {
  onSelectView: (view: 'llegada' | 'informe' | 'memoria') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectView }) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 gap-12">
      <div className="text-center space-y-8 flex flex-col items-center">
        <img src="/logo-sqm.png" alt="SQM Logo" className="h-24 w-auto object-contain" />
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">SISTEMA DE GESTIÓN LOGÍSTICA</h1>
          <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs">Módulos Inteligentes de Operación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        <button
          onClick={() => onSelectView('llegada')}
          className="group relative bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center space-y-6 overflow-hidden active:scale-95"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 opacity-50" />
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors duration-500">
            <Truck size={40} strokeWidth={1.5} />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Llegada de Equipos</h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[180px] mx-auto font-medium">Control de ingresos, pesaje y turnos en tiempo real.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-300 group-hover:text-blue-500 transition-colors">
            Acceder módulo <ChevronRight size={12} />
          </div>
        </button>

        <button
          onClick={() => onSelectView('informe')}
          className="group relative bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center space-y-6 overflow-hidden active:scale-95"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 opacity-50" />
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors duration-500">
            <FileBarChart size={40} strokeWidth={1.5} />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Informe Operativo</h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[180px] mx-auto font-medium">Dashboard inteligente, análisis de tonelaje y reportes PDF.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-300 group-hover:text-emerald-500 transition-colors">
            Acceder módulo <ChevronRight size={12} />
          </div>
        </button>

        <button
          onClick={() => onSelectView('memoria')}
          className="group relative bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center space-y-6 overflow-hidden active:scale-95"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 opacity-50" />
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-500">
            <History size={40} strokeWidth={1.5} />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Memoria Operativa</h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[180px] mx-auto font-medium">Archivo histórico de justificaciones y datos de jornadas pasadas.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-300 group-hover:text-indigo-500 transition-colors">
            Acceder módulo <ChevronRight size={12} />
          </div>
        </button>
      </div>

      <div className="mt-20 text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">
        SQM LITIO S.A. - GERENCIA DE OPERACIONES SALAR - 2026
      </div>
    </div>
  );
};

export default MainMenu;
