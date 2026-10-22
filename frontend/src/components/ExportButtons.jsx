import React from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';

export default function ExportButtons({ onCsv, onExcel, disabled }) {
  const base = 'flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center space-x-2">
      <button disabled={disabled} onClick={onCsv} className={`${base} bg-white border-slate-200 text-slate-700 hover:text-teal-700 hover:border-teal-400`}>
        <FileText className="w-4 h-4" /><span>CSV</span>
      </button>
      <button disabled={disabled} onClick={onExcel} className={`${base} bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700`}>
        <FileSpreadsheet className="w-4 h-4" /><span>Excel</span>
      </button>
    </div>
  );
}
