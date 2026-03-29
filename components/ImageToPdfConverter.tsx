
import React, { useState } from 'react';

declare const jspdf: any;

interface ImageToPdfConverterProps {
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
}

const ImageToPdfConverter: React.FC<ImageToPdfConverterProps> = ({ onComplete, onCancel }) => {
  const [images, setImages] = useState<{ id: string; data: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = (re) => {
        setImages(prev => [...prev, { id: Math.random().toString(), data: re.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImage = (id: string, direction: 'up' | 'down') => {
    const idx = images.findIndex(img => img.id === id);
    if (idx === -1) return;
    const newImages = [...images];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newImages.length) return;
    [newImages[idx], newImages[targetIdx]] = [newImages[targetIdx], newImages[idx]];
    setImages(newImages);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdf = new jspdf.jsPDF();
      let isFirstPage = true;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i].data;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const orientation = img.width > img.height ? 'l' : 'p';
        
        if (isFirstPage) {
          pdf.deletePage(1);
          pdf.addPage([img.width, img.height], orientation);
          isFirstPage = false;
        } else {
          pdf.addPage([img.width, img.height], orientation);
        }

        const flattenedData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(flattenedData, 'JPEG', 0, 0, img.width, img.height);
      }

      onComplete(pdf.output('datauristring'));
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to create PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Images to PDF</h2>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-1">High Quality Scan</p>
        </div>
        <button onClick={onCancel} className="p-3 bg-white rounded-2xl shadow-sm border text-gray-400 hover:text-gray-900 transition-colors">✕</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📸</div>
            <p className="text-slate-500 font-black mb-10">Select one or more images</p>
            <label className="bg-amber-500 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl shadow-amber-100 active:scale-95 transition-all inline-block">
              Choose Images
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group rounded-2xl overflow-hidden border border-slate-100 shadow-sm aspect-[3/4]">
                  <img src={img.data} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                      <button onClick={() => moveImage(img.id, 'up')} className="w-8 h-8 bg-white rounded-full text-xs font-black shadow-lg">↑</button>
                      <button onClick={() => moveImage(img.id, 'down')} className="w-8 h-8 bg-white rounded-full text-xs font-black shadow-lg">↓</button>
                    </div>
                    <button onClick={() => removeImage(img.id)} className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg">Remove</button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded font-black backdrop-blur-md">{idx + 1}</div>
                </div>
              ))}
              <label className="border-4 border-dashed border-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all aspect-[3/4]">
                <span className="text-2xl text-slate-300 font-bold">+</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add More</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>

            <div className="pt-6 border-t border-slate-50">
               <button 
                onClick={generatePdf} 
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 transition-all"
               >
                {isProcessing ? 'Generating PDF...' : `Convert ${images.length} Image${images.length > 1 ? 's' : ''} to PDF`}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageToPdfConverter;
