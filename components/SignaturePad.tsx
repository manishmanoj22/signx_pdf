
import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'DRAW' | 'UPLOAD'>('DRAW');

  useEffect(() => {
    if (mode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [mode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Scale coordinates to match internal canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onSave(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Add Signature</h3>
          <button onClick={onCancel} className="p-2 bg-slate-100 rounded-full text-slate-400">✕</button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button onClick={() => setMode('DRAW')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'DRAW' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-slate-400'}`}>Draw</button>
          <button onClick={() => setMode('UPLOAD')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'UPLOAD' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-slate-400'}`}>Upload</button>
        </div>

        {mode === 'DRAW' ? (
          <>
            <div className="relative border-4 border-dashed border-slate-100 rounded-3xl overflow-hidden bg-slate-50">
              <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full aspect-video touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button onClick={clear} className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 shadow-sm border">Clear</button>
            </div>
            <button onClick={handleSave} className="w-full mt-8 bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">Save Signature</button>
          </>
        ) : (
          <div className="text-center py-10 px-6 border-4 border-dashed border-slate-100 rounded-3xl bg-slate-50">
            <div className="text-5xl mb-6">📸</div>
            <p className="text-sm text-slate-500 font-medium mb-8">Take a photo of your physical signature on white paper.</p>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-white text-[#2563eb] border border-blue-100 px-8 py-4 rounded-2xl font-black shadow-sm active:scale-95 transition-all">Select Image</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;
