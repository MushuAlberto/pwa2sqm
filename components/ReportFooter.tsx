
import React from 'react';

const ReportFooter: React.FC = () => {
  return (
    <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-end w-full">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[11px] font-black text-slate-800 tracking-wider uppercase leading-none mb-1">SQM LITIO</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">Gerencia de Operaciones Salar</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Documento Interno - Confidencial</p>
        <div className="h-1.5 w-32 bg-slate-50 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#89B821] w-1/2"></div>
          <div className="h-full bg-[#003595] w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export default ReportFooter;
