
import React, { useState, useMemo } from 'react';
import { DocumentRecord, AppView } from '../types';
import BannerAd from './BannerAd';

interface DashboardProps {
  documents: DocumentRecord[];
  onAction: (view: AppView) => void;
  onViewDoc: (doc: DocumentRecord) => void;
  onDeleteDoc: (id: string) => void;
  onDownloadDoc: (doc: DocumentRecord) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, onAction, onViewDoc, onDeleteDoc, onDownloadDoc }) => {
  const [filter, setFilter] = useState<'ALL' | 'SIGNED'>('ALL');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    if (filter === 'ALL') return documents;
    return documents.filter(d => d.status === filter);
  }, [documents, filter]);

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDocToDelete(id);
  };

  const handleFinalDelete = () => {
    if (docToDelete) {
      onDeleteDoc(docToDelete);
      setDocToDelete(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md">
          <div className="w-full max-sm bg-white rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 text-center mb-6 tracking-tight">Delete document?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={handleFinalDelete} className="w-full py-4 bg-red-500 text-white font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-red-100">Delete Forever</button>
              <button onClick={() => setDocToDelete(null)} className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* RE-SIZED HEADER */}
      <div className="bg-gradient-to-r from-[#14b8a6] to-[#2563eb] p-5 rounded-2xl text-white shadow-xl relative overflow-hidden flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-xl font-black tracking-tight leading-tight">Dashboard</h2>
          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">Local Storage</p>
        </div>
        <div className="flex gap-3 items-center relative z-10">
           <div className="bg-white/10 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-2">
              <span className="text-xl font-black">{documents.length}</span>
              <span className="text-[9px] uppercase font-bold opacity-90 tracking-tighter">Files</span>
           </div>
           <button onClick={() => onAction(AppView.SIGN_DOC)} className="bg-white text-[#2563eb] px-5 py-3 rounded-xl font-black active:scale-95 shadow-lg text-xs">
              + Sign New
           </button>
        </div>
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* QUICK TOOLS - Balanced size */}
      <div className="grid grid-cols-3 gap-3">
          <button onClick={() => onAction(AppView.IMAGE_TO_PDF)} className="flex flex-col items-center justify-center gap-2.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all hover:border-emerald-200">
            <div className="w-10 h-10 bg-emerald-50 text-[#14b8a6] rounded-xl flex items-center justify-center text-xl shadow-inner">📸</div>
            <span className="text-[9px] font-black uppercase tracking-tight text-slate-700">Img to PDF</span>
          </button>
          <button onClick={() => onAction(AppView.MERGE_PDF)} className="flex flex-col items-center justify-center gap-2.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all hover:border-blue-200">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shadow-inner">📑</div>
            <span className="text-[9px] font-black uppercase tracking-tight text-slate-700">Merge</span>
          </button>
          <button onClick={() => onAction(AppView.COMPRESS_PDF)} className="flex flex-col items-center justify-center gap-2.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all hover:border-emerald-200">
            <div className="w-10 h-10 bg-emerald-50 text-[#14b8a6] rounded-xl flex items-center justify-center text-xl shadow-inner">🗜️</div>
            <span className="text-[9px] font-black uppercase tracking-tight text-slate-700">Compress</span>
          </button>
      </div>

      <div className="flex items-center justify-between px-2 pt-2">
         <h3 className="text-base font-black text-slate-800 tracking-tight">Recent Activity</h3>
         <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            {(['ALL', 'SIGNED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[9px] px-4 py-1.5 rounded-lg font-black transition-all ${filter === f ? 'bg-white text-[#2563eb] shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                {f}
              </button>
            ))}
         </div>
      </div>

      {/* ACTIVITY LIST - Better readability */}
      <div className="space-y-3">
        {filteredDocs.length > 0 ? filteredDocs.map((doc, idx) => (
          <div key={doc.id} onClick={() => onViewDoc(doc)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:bg-blue-50/30 transition-all active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-center gap-4 overflow-hidden flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${doc.type === 'PDF' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-[#2563eb] border border-blue-100'}`}>
                {doc.type === 'PDF' ? '📄' : '🖼️'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-black text-slate-800 truncate leading-tight mb-1">{doc.name}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{doc.date}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-300 mx-0.5"></span>
                  <p className="text-[10px] text-[#14b8a6] font-black uppercase tracking-wider">{doc.status}</p>
                </div>
              </div>
            </div>
            <button onClick={(e) => confirmDelete(e, doc.id)} className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center">
              🗑️
            </button>
          </div>
        )) : (
          <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-50 shadow-inner">
             <div className="text-5xl mb-4 opacity-20">📂</div>
             <p className="text-slate-400 text-sm font-black tracking-tight">No documents found.</p>
          </div>
        )}
      </div>

      <BannerAd />
    </div>
  );
};

export default Dashboard;
