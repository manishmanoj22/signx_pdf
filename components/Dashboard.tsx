
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

  const handleDownload = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    onDownloadDoc(doc);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-sm bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">🗑️</div>
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2 tracking-tight">Delete this?</h3>
            <p className="text-slate-500 text-center text-sm font-medium leading-relaxed mb-10 px-2">
              This will permanently remove the document from your local storage.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleFinalDelete} className="w-full py-5 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-100">Delete Forever</button>
              <button onClick={() => setDocToDelete(null)} className="w-full py-5 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#14b8a6] to-[#2563eb] p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-100 relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Workspace Dashboard</p>
          <h2 className="text-xl sm:text-4xl font-black mb-8 leading-tight tracking-tight whitespace-normal overflow-hidden max-w-full">Your Complete Document Studio.</h2>
          <div className="flex gap-4 items-center">
             <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/20 shadow-inner flex flex-col items-center min-w-[80px]">
                <span className="block text-3xl font-black leading-none mb-1">{documents.length}</span>
                <span className="text-[11px] uppercase font-bold opacity-90 tracking-tight whitespace-nowrap drop-shadow-sm">Total Files</span>
             </div>
             <button onClick={() => onAction(AppView.SIGN_DOC)} className="bg-white text-[#2563eb] px-8 py-4 rounded-2xl font-black hover:shadow-2xl transition-all flex items-center gap-2 hover:bg-slate-50 shadow-lg shadow-blue-900/10">
                <span className="text-xl">+</span> Sign New
             </button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-[60px] pointer-events-none"></div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 tracking-tight px-2">Quick Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
          <button 
            onClick={() => onAction(AppView.IMAGE_TO_PDF)}
            className="flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm active:scale-95 transition-all group hover:border-[#14b8a6]/30"
          >
            <div className="w-10 h-10 bg-emerald-50 text-[#14b8a6] rounded-xl flex items-center justify-center text-lg shadow-sm border border-emerald-100 group-hover:bg-emerald-100">📸</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Image to pdf</span>
          </button>
          <button 
            onClick={() => onAction(AppView.MERGE_PDF)}
            className="flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm active:scale-95 transition-all group hover:border-blue-200"
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-lg shadow-sm border border-blue-100 group-hover:bg-blue-100">📑</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Merge Files</span>
          </button>
          <button 
            onClick={() => onAction(AppView.COMPRESS_PDF)}
            className="flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm active:scale-95 transition-all group hover:border-emerald-200"
          >
            <div className="w-10 h-10 bg-emerald-50 text-[#14b8a6] rounded-xl flex items-center justify-center text-lg shadow-sm border border-emerald-100 group-hover:bg-emerald-100">🗜️</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Compress PDF</span>
          </button>
        </div>
      </div>

      <BannerAd />

      <div className="flex items-center justify-between px-2">
         <h3 className="text-lg font-black text-slate-800 tracking-tight">Recent Activity</h3>
         <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200/50">
            {(['ALL', 'SIGNED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[9px] px-5 py-2 rounded-xl font-black transition-all ${filter === f ? 'bg-white text-[#2563eb] shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                {f}
              </button>
            ))}
         </div>
      </div>

      <div className="space-y-4 pb-20">
        {filteredDocs.length > 0 ? filteredDocs.map((doc, idx) => (
          <div key={doc.id} onClick={() => onViewDoc(doc)} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between active:bg-blue-50/30 transition-all active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="flex items-center gap-5 overflow-hidden flex-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${doc.type === 'PDF' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-[#2563eb] border border-blue-100'}`}>
                {doc.type === 'PDF' ? '📄' : '🖼️'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-black text-slate-800 truncate mb-1">{doc.name}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{doc.date}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{doc.type}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 ml-4">
              <button onClick={(e) => confirmDelete(e, doc.id)} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center">
                🗑️
              </button>
            </div>
          </div>
        )) : (
          <div className="py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50 shadow-inner">
             <div className="text-6xl mb-6 opacity-20 grayscale">📂</div>
             <p className="text-slate-400 text-sm font-black tracking-tight mb-8">No documents in storage.</p>
             <button onClick={() => onAction(AppView.SIGN_DOC)} className="px-10 py-4 bg-blue-50 text-[#2563eb] text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-100 transition-colors shadow-sm shadow-blue-50">Create New Doc</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
