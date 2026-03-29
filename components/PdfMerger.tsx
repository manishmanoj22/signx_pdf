
import React, { useState } from 'react';

declare const jspdf: any;
declare const pdfjsLib: any;

interface PdfMergerProps {
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
}

const PdfMerger: React.FC<PdfMergerProps> = ({ onComplete, onCancel }) => {
  const [pdfs, setPdfs] = useState<{ id: string; name: string; data: string; pageCount: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onload = async (re) => {
        const data = re.target?.result as string;
        try {
          const loadingTask = pdfjsLib.getDocument(data);
          const pdfDoc = await loadingTask.promise;
          setPdfs(prev => [...prev, { 
            id: Math.random().toString(), 
            name: file.name, 
            data, 
            pageCount: pdfDoc.numPages 
          }]);
        } catch (err) {
          console.error("Not a valid PDF", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePdf = (id: string) => {
    setPdfs(prev => prev.filter(p => p.id !== id));
  };

  const movePdf = (id: string, direction: 'up' | 'down') => {
    const idx = pdfs.findIndex(p => p.id === id);
    if (idx === -1) return;
    const newPdfs = [...pdfs];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newPdfs.length) return;
    [newPdfs[idx], newPdfs[targetIdx]] = [newPdfs[targetIdx], newPdfs[idx]];
    setPdfs(newPdfs);
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) {
      alert("Select at least 2 PDFs to merge");
      return;
    }
    setIsProcessing(true);

    try {
      const finalPdf = new jspdf.jsPDF();
      let totalPagesAdded = 0;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      for (const pdfData of pdfs) {
        const loadingTask = pdfjsLib.getDocument(pdfData.data);
        const pdf = await loadingTask.promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: ctx, viewport }).promise;

          if (totalPagesAdded > 0) {
            finalPdf.addPage();
          }

          const pdfWidth = finalPdf.internal.pageSize.getWidth();
          const pdfHeight = finalPdf.internal.pageSize.getHeight();
          const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
          const w = canvas.width * ratio;
          const h = canvas.height * ratio;
          const x = (pdfWidth - w) / 2;
          const y = (pdfHeight - h) / 2;

          finalPdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', x, y, w, h);
          totalPagesAdded++;
        }
      }

      onComplete(finalPdf.output('datauristring'));
    } catch (err) {
      console.error(err);
      alert("Failed to merge PDFs");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Merge PDFs</h2>
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">PDF Binder</p>
        </div>
        <button onClick={onCancel} className="p-3 bg-white rounded-2xl shadow-sm border text-gray-400 hover:text-gray-900">✕</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        {pdfs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📑</div>
            <p className="text-slate-500 font-black mb-10">Select PDF files to combine</p>
            <label className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl shadow-indigo-100 active:scale-95 transition-all inline-block">
              Choose PDF Files
              <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {pdfs.map((pdf, idx) => (
                <div key={pdf.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm font-black border border-slate-100">{idx + 1}</div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-slate-800 truncate max-w-[150px]">{pdf.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pdf.pageCount} Pages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => movePdf(pdf.id, 'up')} className="w-8 h-8 bg-white rounded-lg text-[10px] font-black border border-slate-100 shadow-sm active:scale-90 transition-all">↑</button>
                    <button onClick={() => movePdf(pdf.id, 'down')} className="w-8 h-8 bg-white rounded-lg text-[10px] font-black border border-slate-100 shadow-sm active:scale-90 transition-all">↓</button>
                    <button onClick={() => removePdf(pdf.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg text-[10px] font-black border border-red-100 active:scale-90 transition-all">✕</button>
                  </div>
                </div>
              ))}
              <label className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all mt-4">
                <span className="text-indigo-600 font-black text-sm">+ Add More Files</span>
                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>

            <div className="pt-6 border-t border-slate-50">
               <button 
                onClick={mergePdfs} 
                disabled={isProcessing || pdfs.length < 2}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-95 transition-all"
               >
                {isProcessing ? 'Processing...' : `Merge ${pdfs.length} PDFs`}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfMerger;
