
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppView, DocumentRecord, UserSignature, PlacedElement } from './types';
import Dashboard from './components/Dashboard';
import SignaturePad from './components/SignaturePad';
import ProfileMenu from './components/ProfileMenu';
import RentReceiptCreator from './components/RentReceiptCreator';
import ImageToPdfConverter from './components/ImageToPdfConverter';
import PdfMerger from './components/PdfMerger';
import PdfCompressor from './components/PdfCompressor';
import * as db from './db';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AdMob } from '@capacitor-community/admob';

declare const jspdf: any;
declare const pdfjsLib: any;

if (typeof window !== 'undefined' && pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const AppLogo = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-md"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#2563eb" />
      <rect x="25" y="20" width="50" height="65" rx="4" fill="#ffffff" />
      <rect x="32" y="38" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="32" y="46" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="32" y="54" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="32" y="68" width="28" height="3.5" rx="1.5" fill="#10b981" />
      <path
        d="M36 78 C 40 72, 45 72, 50 78 S 60 84, 65 78" 
        fill="none" 
        stroke="#10b981" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      <g transform="translate(72, 65) rotate(-45)">
        <rect x="0" y="0" width="5" height="28" rx="2.5" fill="#059669" />
        <path d="M0 0 L2.5 -6 L5 0 Z" fill="#059669" />
      </g>
    </svg>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [signatures, setSignatures] = useState<UserSignature[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [uploadFile, setUploadFile] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [toolResultData, setToolResultData] = useState<{ dataUrl: string, name: string, sourceTool?: AppView } | null>(null);
  
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    // Initialize AdMob on startup
    if (Capacitor.isNativePlatform()) {
      AdMob.initialize({
        requestTrackingAuthorization: true,
      }).catch(err => console.warn("AdMob init failed", err));
    }

    const loadInitialData = async () => {
      try {
        const [docs, sigs] = await Promise.all([db.getAllDocs(), db.getAllSigs()]);
        setDocuments(docs);
        setSignatures(sigs);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };
    loadInitialData();
  }, []);

  const refreshDocuments = async () => {
    try {
      const docs = await db.getAllDocs();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to refresh documents:", err);
    }
  };

  const handleDeleteDoc = useCallback(async (id: string) => {
    try {
      await db.deleteDoc(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  }, []);

  const resetSigningState = () => {
    setUploadFile(null);
    setActiveDoc(null);
    setPlacedElements([]);
    setShowSuccessScreen(false);
    setIsLoading(false);
    setNumPages(1);
    setToolResultData(null);
    pageRefs.current = [];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert("SignX PDF currently only supports PDF documents.");
        return;
      }
      setIsLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFile(reader.result as string);
        setCurrentView(AppView.SIGN_DOC);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReceiptGenerate = async (data: any) => {
    setIsLoading(true);
    const pdf = new jspdf.jsPDF();
    pdf.setFontSize(22);
    pdf.text("RENT RECEIPT", 105, 30, { align: "center" });
    pdf.setFontSize(12);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
    pdf.text(`Received from Mr./Ms. ${data.tenantName}`, 20, 70);
    pdf.text(`Sum of Rupees ${data.rentAmount} only`, 20, 80);
    pdf.text(`Towards Rent of Property: ${data.address}`, 20, 90);
    pdf.text(`For the month of: ${data.month}`, 20, 100);
    pdf.text("Landlord Signature:", 20, 140);
    pdf.text(`Landlord Name: ${data.landlordName}`, 20, 170);
    if (data.panNumber) pdf.text(`Landlord PAN: ${data.panNumber}`, 20, 180);
    
    const dataUrl = pdf.output('datauristring');
    handleToolComplete(dataUrl, `Rent_Receipt_${data.month.replace(/\s/g, '_')}.pdf`);
  };

  const handleToolComplete = async (dataUrl: string, customName?: string) => {
    setIsLoading(true);
    let toolName = customName || 'Processed_Document.pdf';

    const newDoc: DocumentRecord = {
      id: Date.now().toString(),
      name: toolName,
      type: 'PDF',
      status: 'PENDING',
      date: new Date().toLocaleDateString(),
      fileData: dataUrl,
      placedSignatures: []
    };

    try {
      await db.saveDoc(newDoc);
      await refreshDocuments();
      setToolResultData({ dataUrl, name: toolName, sourceTool: currentView });
      setCurrentView(AppView.TOOL_SUCCESS);
    } catch (err) {
      console.error("Failed to save tool result:", err);
      setToolResultData({ dataUrl, name: toolName, sourceTool: currentView });
      setCurrentView(AppView.TOOL_SUCCESS);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToSignFromTool = () => {
    if (toolResultData) {
      setUploadFile(toolResultData.dataUrl);
      setCurrentView(AppView.SIGN_DOC);
    }
  };

  const startCompressingFromTool = () => {
    if (toolResultData) {
      setUploadFile(toolResultData.dataUrl);
      setCurrentView(AppView.COMPRESS_PDF);
    }
  };

  useEffect(() => {
    const renderAllPages = async (dataUrl: string) => {
      try {
        const loadingTask = pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        
        setTimeout(async () => {
          for (let i = 1; i <= pdf.numPages; i++) {
            const canvas = pageRefs.current[i];
            if (!canvas) continue;
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const context = canvas.getContext('2d');
            if (!context) continue;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
          }
        }, 150);
      } catch (err) {
        console.error("PDF Render Error", err);
      }
    };

    const data = uploadFile || activeDoc?.fileData;
    if (data && data.startsWith('data:application/pdf')) {
      renderAllPages(data);
    }
  }, [uploadFile, activeDoc, currentView]);

  const saveSignature = async (dataUrl: string) => {
    const newSign = { id: Date.now().toString(), dataUrl, label: 'My Sign', createdAt: new Date().toISOString() };
    try {
      await db.saveSig(newSign);
      setSignatures(prev => [newSign, ...prev]);
      setShowSignaturePad(false);
    } catch (err) {
      console.error("Failed to save signature:", err);
    }
  };

  const handleSignFinish = async () => {
    const fileToUse = uploadFile || activeDoc?.fileData;
    if (!fileToUse) return;
    setIsLoading(true);

    const newDoc: DocumentRecord = {
      id: activeDoc?.id || Date.now().toString(),
      name: activeDoc?.name || 'Signed_Doc.pdf',
      type: 'PDF',
      status: 'SIGNED',
      date: new Date().toLocaleDateString(),
      fileData: fileToUse,
      placedSignatures: [...placedElements]
    };

    try {
      await db.saveDoc(newDoc);
      await refreshDocuments();
      setActiveDoc(newDoc);
      setIsLoading(false);
      setShowSuccessScreen(true);
    } catch (err) {
      setIsLoading(false);
      console.error("Failed to save signed document:", err);
    }
  };

  const placeSignature = (sig: UserSignature) => {
    if (activeDoc?.status === 'SIGNED') return;
    const newPlaced: PlacedElement = {
      id: Date.now().toString(),
      type: 'SIGNATURE',
      dataUrl: sig.dataUrl,
      x: 35, y: 40, w: 25,
      pageNumber: 1
    };
    setPlacedElements(prev => [...prev, newPlaced]);
  };

  const placeText = () => {
    if (activeDoc?.status === 'SIGNED') return;
    const newPlaced: PlacedElement = {
      id: Date.now().toString(),
      type: 'TEXT',
      text: '',
      x: 35, y: 35, w: 30, h: 10,
      pageNumber: 1
    };
    setPlacedElements(prev => [...prev, newPlaced]);
  };

  const updateText = (id: string, text: string) => {
    setPlacedElements(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  };

  const handleDrag = (id: string, initialPageNum: number, e: any) => {
    if (activeDoc?.status === 'SIGNED') return;
    const isDragHandle = e.target.closest('.drag-handle');
    const targetElement = placedElements.find(p => p.id === id);
    if (targetElement?.type === 'TEXT' && !isDragHandle) return;
    if (e.target.closest('.resize-handle')) return;

    const move = (me: any) => {
      if (me.cancelable) me.preventDefault();
      const cx = 'touches' in me ? me.touches[0].clientX : me.clientX;
      const cy = 'touches' in me ? me.touches[0].clientY : me.clientY;
      
      let targetPageNum = initialPageNum;
      let targetRect = pageRefs.current[initialPageNum]?.getBoundingClientRect();

      for (let i = 1; i <= numPages; i++) {
        const canvas = pageRefs.current[i];
        if (!canvas) continue;
        const rect = canvas.getBoundingClientRect();
        if (cy >= rect.top && cy <= rect.bottom) {
          targetPageNum = i;
          targetRect = rect;
          break;
        }
      }

      if (targetRect) {
        const x = Math.max(-5, Math.min(95, ((cx - targetRect.left) / targetRect.width) * 100));
        const y = Math.max(-5, Math.min(95, ((cy - targetRect.top) / targetRect.height) * 100));
        setPlacedElements(prev => prev.map(p => p.id === id ? { ...p, x, y, pageNumber: targetPageNum } : p));
      }
    };

    const end = () => { 
      window.removeEventListener('mousemove', move); 
      window.removeEventListener('touchmove', move); 
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  };

  const handleResize = (id: string, pageNum: number, e: any) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = pageRefs.current[pageNum];
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const initialX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const initialY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const targetEl = placedElements.find(p => p.id === id);
    if (!targetEl) return;
    
    const initialW = targetEl.w || 25;
    const initialH = targetEl.h || 10;
    
    const move = (me: any) => {
      if (me.cancelable) me.preventDefault();
      const cx = 'touches' in me ? me.touches[0].clientX : me.clientX;
      const cy = 'touches' in me ? me.touches[0].clientY : me.clientY;
      
      const newW = Math.max(5, Math.min(95, initialW + ((cx - initialX) / rect.width) * 100));
      const newH = Math.max(2, Math.min(95, initialH + ((cy - initialY) / rect.height) * 100));
      
      setPlacedElements(prev => prev.map(p => p.id === id ? { ...p, w: newW, h: newH } : p));
    };

    const end = () => { 
      window.removeEventListener('mousemove', move); 
      window.removeEventListener('touchmove', move); 
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  };

  const downloadDataUrl = async (data: string | Blob, fileName: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        let base64Data = '';
        if (data instanceof Blob) {
           base64Data = await new Promise((resolve, reject) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
             reader.onerror = reject;
             reader.readAsDataURL(data);
           });
        } else {
           base64Data = data.includes(',') ? data.split(',')[1] : data;
        }

        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents
          });
          alert(`Saved: ${fileName}`);
        } catch (innerErr) {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          await Share.share({ title: fileName, url: result.uri });
        }
      } else {
        const url = data instanceof Blob ? URL.createObjectURL(data) : data;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const generateProcessedBlob = async (doc: DocumentRecord): Promise<Blob | null> => {
    const fileToUse = doc.fileData;
    if (!fileToUse) return null;
    const docPlacedSigs = doc.placedSignatures || [];
    const pdfOutput = new jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const loadingTask = pdfjsLib.getDocument(fileToUse);
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: 2 });
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      const orientation = baseViewport.width > baseViewport.height ? 'l' : 'p';
      if (i === 1) pdfOutput.deletePage(1);
      pdfOutput.addPage([baseViewport.width, baseViewport.height], orientation);
      pdfOutput.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, baseViewport.width, baseViewport.height);
      const elementsOnPage = docPlacedSigs.filter(s => s.pageNumber === i);
      for (const el of elementsOnPage) {
        if (el.type === 'SIGNATURE' && el.dataUrl) {
           pdfOutput.addImage(el.dataUrl, 'PNG', (baseViewport.width * el.x)/100, (baseViewport.height * el.y)/100, (baseViewport.width * (el.w || 25)) / 100, ((baseViewport.width * (el.w || 25)) / 100) * 0.5);
        } else if (el.type === 'TEXT' && el.text) {
           pdfOutput.setFontSize(14);
           pdfOutput.setTextColor(0, 0, 0);
           const textLines = pdfOutput.splitTextToSize(el.text, (baseViewport.width * (el.w || 30)) / 100);
           pdfOutput.text(textLines, (baseViewport.width * el.x)/100, (baseViewport.height * el.y)/100 + 12);
        }
      }
    }
    return pdfOutput.output('blob');
  };

  const processAndDownloadDoc = async (doc: DocumentRecord) => {
    setIsLoading(true);
    try {
      const blob = await generateProcessedBlob(doc);
      if (blob) await downloadDataUrl(blob, `${doc.name}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (docToShare?: DocumentRecord, isRequest: boolean = false, customData?: { dataUrl: string, name: string }) => {
    const targetDoc = docToShare || activeDoc;
    if (!targetDoc && !customData) return;
    setIsLoading(true);
    try {
      let blob: Blob | null = null;
      let fileName = "";
      let base64Data = "";
      if (customData) {
        const response = await fetch(customData.dataUrl);
        blob = await response.blob();
        fileName = customData.name;
        base64Data = customData.dataUrl.split(',')[1];
      } else if (targetDoc) {
        blob = await generateProcessedBlob(targetDoc);
        if (blob) {
           fileName = targetDoc.name;
           const reader = new FileReader();
           base64Data = await new Promise((resolve) => {
             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
             reader.readAsDataURL(blob as Blob);
           });
        }
      }
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
        await Share.share({ title: fileName, url: result.uri });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }}>
          <AppLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-0.5">
              <h1 className="text-lg font-black text-[#1e3a8a] leading-none tracking-tight">SignX</h1>
              <h1 className="text-lg font-bold text-[#14b8a6] leading-none tracking-tight">PDF</h1>
            </div>
          </div>
        </div>
        <button onClick={() => setShowProfileMenu(true)} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-lg active:scale-90 transition-all">👤</button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-3">
        {isLoading && (
          <div className="fixed inset-0 bg-white/90 z-[150] flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-gray-900">Processing...</p>
          </div>
        )}

        {showSuccessScreen ? (
          <div className="max-w-md mx-auto text-center py-10 px-6 bg-white rounded-3xl shadow-xl border mt-4">
            <div className="w-16 h-16 bg-emerald-50 text-[#14b8a6] rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">✓</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Signed!</h2>
            <div className="space-y-2 mt-6">
              <button onClick={() => activeDoc && processAndDownloadDoc(activeDoc)} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all">Download</button>
              <button onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }} className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-xl">Dashboard</button>
            </div>
          </div>
        ) : (
          <>
            {currentView === AppView.DASHBOARD && (
              <Dashboard 
                documents={documents} 
                onAction={(view) => setCurrentView(view)} 
                onViewDoc={(doc) => { resetSigningState(); setActiveDoc(doc); setPlacedElements(doc.placedSignatures || []); setCurrentView(AppView.SIGN_DOC); }} 
                onDeleteDoc={handleDeleteDoc}
                onDownloadDoc={processAndDownloadDoc}
              />
            )}

            {currentView === AppView.IMAGE_TO_PDF && <ImageToPdfConverter onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />}
            {currentView === AppView.MERGE_PDF && <PdfMerger onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />}
            {currentView === AppView.COMPRESS_PDF && <PdfCompressor initialFile={uploadFile} onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />}

            {currentView === AppView.SIGN_DOC && (
              <div className="animate-in slide-in-from-bottom-4 duration-300 pb-32">
                <div className="flex justify-between items-center mb-4 px-1">
                   <h2 className="text-xl font-black text-gray-900">Sign Document</h2>
                   <button onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }} className="p-2 text-gray-400">✕</button>
                </div>

                {!uploadFile && !activeDoc && (
                   <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <label className="bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white px-8 py-4 rounded-xl font-black cursor-pointer inline-block active:scale-95">
                      Select PDF
                      <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}

                {(uploadFile || activeDoc) && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-4 px-1">
                      {Array.from({ length: numPages }).map((_, idx) => (
                        <div key={idx + 1} className="relative bg-white shadow-xl border border-slate-200 rounded-sm leading-[0]">
                          <canvas ref={el => { pageRefs.current[idx + 1] = el; }} className="max-w-full h-auto" />
                          <div className="absolute inset-0 z-20 pointer-events-none">
                            {placedElements.filter(s => s.pageNumber === idx + 1).map(ps => (
                              <div key={ps.id} style={{ left: `${ps.x}%`, top: `${ps.y}%`, width: `${ps.w || 25}%`, height: ps.type === 'TEXT' ? `${ps.h || 10}%` : 'auto' }} className="absolute z-30 touch-none pointer-events-auto" onMouseDown={(e) => handleDrag(ps.id, idx + 1, e)} onTouchStart={(e) => handleDrag(ps.id, idx + 1, e)}>
                                <div className={`relative h-full ${activeDoc?.status !== 'SIGNED' ? 'border-2 border-dashed border-[#14b8a6]/40 rounded-lg' : ''}`}>
                                  {ps.type === 'SIGNATURE' ? <img src={ps.dataUrl} className="w-full mix-blend-multiply" /> : <textarea value={ps.text} onChange={(e) => updateText(ps.id, e.target.value)} disabled={activeDoc?.status === 'SIGNED'} className="w-full h-full bg-transparent outline-none font-bold text-sm px-1 py-1 resize-none" />}
                                  {activeDoc?.status !== 'SIGNED' && <button onClick={(e) => { e.stopPropagation(); setPlacedElements(p => p.filter(x => x.id !== ps.id)); }} className="absolute -top-3 -right-3 bg-red-500 text-white w-6 h-6 rounded-full text-[10px]">✕</button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-white/90 backdrop-blur-md border-t flex flex-col gap-3">
                       {activeDoc?.status === 'SIGNED' ? (
                         <button onClick={() => activeDoc && processAndDownloadDoc(activeDoc)} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-4 rounded-xl shadow-lg">Download</button>
                       ) : (
                         <div className="max-w-lg mx-auto w-full space-y-3">
                            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                              <button onClick={placeText} className="flex-shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200 font-black">T</button>
                              {signatures.map(s => (
                                <button key={s.id} onClick={() => placeSignature(s)} className="flex-shrink-0 w-20 h-12 bg-white border border-slate-200 rounded-xl p-1 overflow-hidden">
                                  <img src={s.dataUrl} className="max-h-full mix-blend-multiply object-contain" />
                                </button>
                              ))}
                              <button onClick={() => setShowSignaturePad(true)} className="flex-shrink-0 w-12 h-12 bg-slate-50 text-slate-400 rounded-xl border border-dashed border-slate-300 font-bold">+</button>
                            </div>
                            <button onClick={handleSignFinish} disabled={placedElements.length === 0} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-4 rounded-xl disabled:opacity-30">Complete & Save</button>
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
      {showSignaturePad && <SignaturePad onSave={saveSignature} onCancel={() => setShowSignaturePad(false)} />}
    </div>
  );
};

export default App;
