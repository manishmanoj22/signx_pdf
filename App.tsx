
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
      {/* Background rounded square */}
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#2563eb" />
      
      {/* Document */}
      <rect x="25" y="20" width="50" height="65" rx="4" fill="#ffffff" />
      
      {/* Document lines */}
      <rect x="32" y="38" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="32" y="46" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="32" y="54" width="36" height="2.5" rx="1" fill="#e2e8f0" />
      
      {/* Signature line (green) */}
      <rect x="32" y="68" width="28" height="3.5" rx="1.5" fill="#10b981" />
      
      {/* Signature squiggle */}
      <path 
        d="M36 78 C 40 72, 45 72, 50 78 S 60 84, 65 78" 
        fill="none" 
        stroke="#10b981" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      
      {/* Pen */}
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

  const refreshDocuments = async () => {
    try {
      const docs = await db.getAllDocs();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to refresh documents:", err);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [docs, sigs] = await Promise.all([db.getAllDocs(), db.getAllSigs()]);
        setDocuments(docs);
        setSignatures(sigs);
      } catch (err) {
        console.error("Failed to load data from IndexedDB:", err);
      }
    };
    loadInitialData();
  }, []);

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
    if (!customName) {
        if (currentView === AppView.IMAGE_TO_PDF) toolName = 'Converted_Images.pdf';
        else if (currentView === AppView.MERGE_PDF) toolName = 'Merged_Document.pdf';
        else if (currentView === AppView.COMPRESS_PDF) toolName = 'Optimized_Document.pdf';
    }
    
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
      text: '', // Removed pre-filled 'Click to edit' text
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
    
    // Check if we are interacting with the drag handle area specifically for text
    const isDragHandle = e.target.closest('.drag-handle');
    const targetElement = placedElements.find(p => p.id === id);
    
    // For signatures, we can drag the image. For text, we only drag via the handle to allow clicking the textarea to focus.
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

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.target = '_blank'; // Sometimes helps in WebViews
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  const generateProcessedBlob = async (doc: DocumentRecord): Promise<Blob | null> => {
    const fileToUse = doc.fileData;
    if (!fileToUse) return null;

    const docPlacedSigs = doc.placedSignatures || [];

    const pdfOutput = new jspdf.jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    });
    
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
      if (i === 1) {
        pdfOutput.deletePage(1);
      }
      pdfOutput.addPage([baseViewport.width, baseViewport.height], orientation);

      pdfOutput.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, baseViewport.width, baseViewport.height);
      
      const elementsOnPage = docPlacedSigs.filter(s => s.pageNumber === i);
      for (const el of elementsOnPage) {
        if (el.type === 'SIGNATURE' && el.dataUrl) {
           pdfOutput.addImage(el.dataUrl, 'PNG', (baseViewport.width * el.x)/100, (baseViewport.height * el.y)/100, (baseViewport.width * (el.w || 25)) / 100, ((baseViewport.width * (el.w || 25)) / 100) * 0.5);
        } else if (el.type === 'TEXT' && el.text) {
           pdfOutput.setFontSize(14);
           pdfOutput.setTextColor(0, 0, 0);
           // Split text to size to handle multi-line textarea baking
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
      if (blob) {
        const url = URL.createObjectURL(blob);
        downloadDataUrl(url, `${doc.name}`);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Critical download error:", err);
      alert("Error generating high-quality PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompressAfterSign = async () => {
    if (!activeDoc) return;
    setIsLoading(true);
    try {
      const blob = await generateProcessedBlob(activeDoc);
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setUploadFile(result);
          setShowSuccessScreen(false); // FIXED: Must hide success modal to see the new tool view
          setCurrentView(AppView.COMPRESS_PDF);
          setIsLoading(false);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error("Navigation error:", err);
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

      if (customData) {
        // Handle direct dataUrl sharing (from tools)
        const response = await fetch(customData.dataUrl);
        blob = await response.blob();
        fileName = customData.name.endsWith('.pdf') ? customData.name : `${customData.name}.pdf`;
      } else if (targetDoc) {
        // Handle document record sharing
        blob = await generateProcessedBlob(targetDoc);
        fileName = targetDoc.name.endsWith('.pdf') ? targetDoc.name : `${targetDoc.name}.pdf`;
      }

      if (!blob) throw new Error("Could not generate file");
      
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      const shareData: any = {
        files: [file],
        title: customData?.name || targetDoc?.name || "Document",
        text: isRequest 
          ? `Hello! I have sent a document for you: ${customData?.name || targetDoc?.name}.`
          : `Hi, here is the signed document: ${customData?.name || targetDoc?.name}.`
      };

      // Try native share first
      if (navigator.share) {
        // Some browsers require checking canShare specifically for files
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share(shareData);
        } else if (navigator.canShare && navigator.canShare({ text: shareData.text })) {
          // If files can't be shared, at least share the text and maybe trigger a download
          await navigator.share({ title: shareData.title, text: shareData.text });
          const url = URL.createObjectURL(blob);
          downloadDataUrl(url, fileName);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          throw new Error("Native share not supported for this content");
        }
      } else {
        // Fallback for text-only share or WhatsApp link
        const text = encodeURIComponent(shareData.text);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        
        // Also trigger a download as a secondary fallback if share fails
        const url = URL.createObjectURL(blob);
        downloadDataUrl(url, fileName);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      // If sharing fails, try to at least download
      try {
        if (customData) {
          downloadDataUrl(customData.dataUrl, customData.name);
        } else if (targetDoc) {
          const blob = await generateProcessedBlob(targetDoc);
          if (blob) {
            const url = URL.createObjectURL(blob);
            downloadDataUrl(url, targetDoc.name);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }
      } catch (innerErr) {
        alert("Sharing and download failed. Please check app permissions.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }}>
          <AppLogo className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-black text-[#1e3a8a] leading-none tracking-tight">SignX</h1>
              <h1 className="text-xl font-bold text-[#14b8a6] leading-none tracking-tight">PDF</h1>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center">Securely Local</span>
          </div>
        </div>
        <button onClick={() => setShowProfileMenu(true)} className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shadow-sm active:scale-90 transition-all hover:bg-white">👤</button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {isLoading && (
          <div className="fixed inset-0 bg-white/95 z-[150] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 border-[6px] border-[#14b8a6] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-gray-900 tracking-tight text-lg">Processing...</p>
            <p className="text-sm text-slate-500 font-medium">Finalizing your document.</p>
          </div>
        )}

        {showSuccessScreen ? (
          <div className="max-w-md mx-auto text-center py-16 px-8 bg-white rounded-[3rem] shadow-2xl border mt-10 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-50 text-[#14b8a6] rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner shadow-emerald-100">✓</div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Securely Signed</h2>
            <p className="text-gray-500 font-medium mb-10">Your document is ready.</p>
            <div className="space-y-3">
              <button onClick={() => activeDoc && processAndDownloadDoc(activeDoc)} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">Download PDF</button>
              <button onClick={() => handleShare()} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-xl shadow-slate-200">Attach & Share PDF</button>
              <button onClick={handleCompressAfterSign} className="w-full bg-emerald-50 text-[#14b8a6] font-bold py-5 rounded-2xl hover:bg-emerald-100 transition-all">Compress Signed PDF</button>
              <button onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }} className="w-full bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all">Dashboard</button>
            </div>
          </div>
        ) : currentView === AppView.TOOL_SUCCESS ? (
          <div className="max-w-md mx-auto text-center py-16 px-8 bg-white rounded-[3rem] shadow-2xl border mt-10 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-50 text-[#14b8a6] rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner shadow-emerald-100">✓</div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Ready!</h2>
            <p className="text-gray-500 font-medium mb-10">Document processed and saved locally.</p>
            <div className="space-y-3">
              <button onClick={() => toolResultData && downloadDataUrl(toolResultData.dataUrl, toolResultData.name)} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">Download PDF</button>
              <button onClick={() => toolResultData && handleShare(undefined, false, { dataUrl: toolResultData.dataUrl, name: toolResultData.name })} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-xl shadow-slate-200">Attach & Share PDF</button>
              <div className="flex gap-2">
                <button onClick={proceedToSignFromTool} className="flex-1 bg-slate-800 text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-lg text-xs">Add Signature</button>
                {toolResultData?.sourceTool !== AppView.COMPRESS_PDF && (
                  <button onClick={startCompressingFromTool} className="flex-1 bg-[#14b8a6] text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-lg text-xs">Compress PDF</button>
                )}
              </div>
              <button onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }} className="w-full bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all">Go to Dashboard</button>
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

            {currentView === AppView.CREATE_RECEIPT && (
              <RentReceiptCreator onGenerate={handleReceiptGenerate} onCancel={() => setCurrentView(AppView.DASHBOARD)} />
            )}

            {currentView === AppView.IMAGE_TO_PDF && (
              <ImageToPdfConverter onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />
            )}

            {currentView === AppView.MERGE_PDF && (
              <PdfMerger onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />
            )}

            {currentView === AppView.COMPRESS_PDF && (
              <PdfCompressor initialFile={uploadFile} onComplete={handleToolComplete} onCancel={() => setCurrentView(AppView.DASHBOARD)} />
            )}

            {currentView === AppView.SIGN_DOC && (
              <div className="animate-in slide-in-from-bottom-6 duration-500 pb-32">
                <div className="flex justify-between items-center mb-6 px-2">
                   <h2 className="text-2xl font-black text-gray-900">{activeDoc?.status === 'SIGNED' ? 'Document View' : 'Signing Area'}</h2>
                   <button onClick={() => { resetSigningState(); setCurrentView(AppView.DASHBOARD); }} className="p-3 bg-white rounded-2xl shadow-sm border text-gray-400 hover:text-gray-900 transition-colors">✕</button>
                </div>

                {!uploadFile && !activeDoc && (
                   <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-16 text-center shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">📄</div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">Upload PDF</h3>
                    <p className="text-sm text-gray-400 font-medium mb-10">Select a PDF to sign and add text.</p>
                    <label className="bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white px-12 py-5 rounded-2xl font-black cursor-pointer shadow-2xl shadow-blue-100 inline-block transition-transform active:scale-95">
                      Browse PDFs
                      <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}

                {(uploadFile || activeDoc) && (
                  <div className="flex flex-col gap-10">
                    <div className="flex flex-col items-center gap-8 px-2 overflow-y-auto scrollbar-hide">
                      {Array.from({ length: numPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <div key={pageNum} className="relative bg-white shadow-2xl leading-[0] border border-slate-200 rounded-sm">
                            <canvas 
                              ref={el => { pageRefs.current[pageNum] = el; }} 
                              className="max-w-full h-auto"
                            />
                            <div className="absolute inset-0 z-20 pointer-events-none">
                              {placedElements.filter(s => s.pageNumber === pageNum).map(ps => (
                                <div 
                                  key={ps.id} 
                                  style={{ 
                                    left: `${ps.x}%`, 
                                    top: `${ps.y}%`, 
                                    width: `${ps.w || 25}%`,
                                    height: ps.type === 'TEXT' ? `${ps.h || 10}%` : 'auto'
                                  }} 
                                  className={`absolute z-30 touch-none pointer-events-auto animate-pulse-once group ${activeDoc?.status !== 'SIGNED' ? 'hover:z-40' : ''}`} 
                                  onMouseDown={(e) => handleDrag(ps.id, pageNum, e)} 
                                  onTouchStart={(e) => handleDrag(ps.id, pageNum, e)}
                                >
                                  <div className={`relative h-full transition-all rounded-lg ${activeDoc?.status !== 'SIGNED' ? 'border-2 border-dashed border-transparent hover:border-[#14b8a6]/40 hover:shadow-lg' : ''}`}>
                                    {ps.type === 'SIGNATURE' ? (
                                      <img src={ps.dataUrl} className={`w-full h-auto mix-blend-multiply border-2 border-dashed ${activeDoc?.status === 'SIGNED' ? 'border-transparent' : 'border-[#14b8a6]/50'} p-0.5 cursor-move`} />
                                    ) : (
                                      <div className="flex flex-col h-full">
                                        {activeDoc?.status !== 'SIGNED' && (
                                          <div className="drag-handle h-5 w-full bg-[#2563eb]/10 border-t-2 border-x-2 border-dashed border-[#2563eb]/20 rounded-t-md flex items-center justify-center cursor-move">
                                             <div className="w-8 h-1 bg-[#2563eb]/30 rounded-full"></div>
                                          </div>
                                        )}
                                        <textarea 
                                          value={ps.text}
                                          placeholder="Type text here..."
                                          onChange={(e) => updateText(ps.id, e.target.value)}
                                          disabled={activeDoc?.status === 'SIGNED'}
                                          className={`w-full h-full bg-transparent outline-none font-bold text-sm px-2 py-1.5 resize-none border-2 border-dashed ${activeDoc?.status === 'SIGNED' ? 'border-transparent text-black' : 'border-[#2563eb]/30 text-indigo-900 focus:border-indigo-600 rounded-b-md'}`}
                                        />
                                      </div>
                                    )}
                                    
                                    {activeDoc?.status !== 'SIGNED' && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); setPlacedElements(p => p.filter(x => x.id !== ps.id)); }} className="absolute -top-4 -right-4 bg-red-500 text-white w-8 h-8 rounded-full text-xs flex items-center justify-center shadow-lg font-bold border-2 border-white z-[60] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                        <div 
                                          onMouseDown={(e) => handleResize(ps.id, pageNum, e)} 
                                          onTouchStart={(e) => handleResize(ps.id, pageNum, e)} 
                                          className="resize-handle absolute -bottom-5 -right-5 w-12 h-12 bg-[#14b8a6] border-4 border-white rounded-full cursor-nwse-resize shadow-xl flex items-center justify-center z-[70] opacity-100 transition-transform active:scale-125"
                                        >
                                          <div className="w-3 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1 mr-1"></div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                              Page {pageNum} / {numPages}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-white/80 backdrop-blur-md border-t border-slate-100 flex flex-col gap-4">
                       {activeDoc?.status === 'SIGNED' ? (
                         <div className="flex gap-3 max-w-lg mx-auto w-full">
                           <button onClick={() => activeDoc && processAndDownloadDoc(activeDoc)} className="flex-[2] bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">Download PDF</button>
                           <button onClick={() => handleShare()} className="flex-1 bg-slate-900 text-white font-black py-5 rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest">Share</button>
                         </div>
                       ) : (
                         <div className="max-w-lg mx-auto w-full space-y-4">
                            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide items-center">
                              <button onClick={placeText} className="flex-shrink-0 w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl border-2 border-indigo-200 flex flex-col items-center justify-center shadow-sm hover:bg-indigo-100 transition-all active:scale-90">
                                <span className="text-xl font-black">T</span>
                                <span className="text-[7px] font-black uppercase tracking-widest">Text</span>
                              </button>
                              
                              <div className="h-10 w-px bg-slate-200 mx-1 flex-shrink-0"></div>

                              {signatures.map(s => (
                                <button key={s.id} onClick={() => placeSignature(s)} className="flex-shrink-0 w-24 h-14 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center p-2 shadow-sm hover:border-[#14b8a6] transition-all active:scale-90 overflow-hidden">
                                  <img src={s.dataUrl} className="max-h-full mix-blend-multiply object-contain" />
                                </button>
                              ))}
                              <button onClick={() => setShowSignaturePad(true)} className="flex-shrink-0 w-14 h-14 bg-slate-50 text-slate-400 rounded-xl border-2 border-dashed border-slate-200 text-xl font-bold flex items-center justify-center active:bg-blue-50 transition-colors">+</button>
                            </div>
                            <button onClick={handleSignFinish} disabled={placedElements.length === 0} className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-100 disabled:opacity-30 transition-all active:scale-95">Complete & Save</button>
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

      <style>{`
        @keyframes pulse-once {
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pulse-once {
          animation: pulse-once 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
