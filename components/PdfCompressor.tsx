
import React, { useState, useEffect } from 'react';

declare const jspdf: any;
declare const pdfjsLib: any;

interface PdfCompressorProps {
  initialFile?: string | null;
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
}

const PdfCompressor: React.FC<PdfCompressorProps> = ({ initialFile, onComplete, onCancel }) => {
  const [fileData, setFileData] = useState<string | null>(initialFile || null);
  const [fileName, setFileName] = useState<string>("document.pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [reductionLevel, setReductionLevel] = useState<25 | 50 | 75>(50);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const calculateSizeFromDataUrl = (dataUrl: string) => {
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return 0;
    const padding = base64Part.endsWith('==') ? 2 : (base64Part.endsWith('=') ? 1 : 0);
    return (base64Part.length * 0.75) - padding;
  };

  useEffect(() => {
    if (initialFile) {
      setOriginalSize(calculateSizeFromDataUrl(initialFile));
    }
  }, [initialFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setOriginalSize(file.size);
      setCompressedSize(null);
      const reader = new FileReader();
      reader.onload = (re) => {
        setFileData(re.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressPdf = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    setCompressedSize(null);

    try {
      const qualityMap = { 25: 0.8, 50: 0.5, 75: 0.25 };
      const quality = qualityMap[reductionLevel];
      
      const loadingTask = pdfjsLib.getDocument(fileData);
      const pdf = await loadingTask.promise;
      const finalPdf = new jspdf.jsPDF();
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (i > 1) finalPdf.addPage();

        const pdfWidth = finalPdf.internal.pageSize.getWidth();
        const pdfHeight = finalPdf.internal.pageSize.getHeight();
        const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pdfWidth - w) / 2;
        const y = (pdfHeight - h) / 2;

        finalPdf.addImage(canvas.toDataURL('image/jpeg', quality), 'JPEG', x, y, w, h);
      }

      const resultDataUrl = finalPdf.output('datauristring');
      const newSize = calculateSizeFromDataUrl(resultDataUrl);
      setCompressedSize(newSize);
      
      setTimeout(() => {
        onComplete(resultDataUrl);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      alert("Failed to compress PDF");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">PDF Optimizer</h2>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">Lite Optimizer</p>
        </div>
        <button onClick={onCancel} className="p-3 bg-white rounded-2xl shadow-sm border text-gray-400 hover:text-gray-900">✕</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        {!fileData ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">🗜️</div>
            <p className="text-slate-500 font-black mb-10">Select a PDF to reduce its size</p>
            <label className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl shadow-emerald-100 active:scale-95 transition-all inline-block">
              Choose PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100">📄</div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-black text-slate-800 truncate">{fileName}</p>
                  <button onClick={() => {setFileData(null); setOriginalSize(null); setCompressedSize(null);}} className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Change File</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Original Size</p>
                  <p className="text-sm font-black text-slate-800">{originalSize ? formatBytes(originalSize) : '...'}</p>
                </div>
                <div className={`p-3 rounded-xl border transition-all ${compressedSize ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">New Size</p>
                  <p className={`text-sm font-black ${compressedSize ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {compressedSize ? formatBytes(compressedSize) : isProcessing ? 'Processing...' : '---'}
                  </p>
                </div>
              </div>
              
              {compressedSize && originalSize && (
                <div className="mt-4 text-center">
                  <span className="inline-block bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest animate-bounce">
                    Saved {Math.round(((originalSize - compressedSize) / originalSize) * 100)}%
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reduction Level</label>
              <div className="grid grid-cols-3 gap-3">
                {[25, 50, 75].map((level) => (
                  <button
                    key={level}
                    disabled={isProcessing}
                    onClick={() => setReductionLevel(level as any)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                      reductionLevel === level 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white border-slate-100 text-slate-600'
                    } disabled:opacity-50`}
                  >
                    <span className="text-lg font-black">{level}%</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-80">
                      {level === 25 ? 'Light' : level === 50 ? 'Balanced' : 'Strong'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50">
               <button 
                onClick={compressPdf} 
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 transition-all"
               >
                {isProcessing ? 'Optimizing...' : `Reduce Size by ${reductionLevel}%`}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCompressor;
