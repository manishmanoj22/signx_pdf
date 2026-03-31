
import React, { useState } from 'react';

interface ProfileMenuProps {
  onClose: () => void;
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

const ProfileMenu: React.FC<ProfileMenuProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'ABOUT' | 'PRIVACY' | 'HELP'>('ABOUT');

  const content = {
    ABOUT: (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="text-center py-6">
          <AppLogo className="w-24 h-24 mx-auto mb-4 drop-shadow-xl" />
          <div className="flex items-center justify-center gap-1">
            <h4 className="text-2xl font-black text-[#1e3a8a]">SignX</h4>
            <h4 className="text-2xl font-bold text-[#14b8a6]">PDF</h4>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version 1.3.0 (Stable)</p>
        </div>
        
        <p className="text-sm text-slate-600 leading-relaxed font-medium mt-6 text-center">
          SignX PDF is a premium digital signature solution. Replace paper-based workflows with secure, local digital alternatives.
        </p>
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-center">
          <p className="text-xs font-bold text-[#1e3a8a] flex items-center gap-2">
            Built with Love
          </p>
        </div>
      </div>
    ),
    PRIVACY: (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Privacy First</h4>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-[#14b8a6] rounded-lg flex items-center justify-center text-xs flex-shrink-0">✓</div>
            <p className="text-xs text-slate-600 font-medium">No files are uploaded to any server. All processing happens on your device.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-[#14b8a6] rounded-lg flex items-center justify-center text-xs flex-shrink-0">✓</div>
            <p className="text-xs text-slate-600 font-medium">Signatures are stored securely in local browser storage.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-[#14b8a6] rounded-lg flex items-center justify-center text-xs flex-shrink-0">✓</div>
            <p className="text-xs text-slate-600 font-medium">We do not track your activity or document content.</p>
          </div>
        </div>
      </div>
    ),
    HELP: (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Support</h4>
        <div className="space-y-2">
          <details className="group bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <summary className="p-4 list-none font-bold text-xs text-slate-800 cursor-pointer flex justify-between items-center group-open:bg-white">
              How to sign a PDF?
              <span className="group-open:rotate-180 transition-transform">↓</span>
            </summary>
            <div className="p-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100">
              Go to Dashboard, click '+ Sign New', upload your PDF, and drag elements onto the page.
            </div>
          </details>
          <details className="group bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <summary className="p-4 list-none font-bold text-xs text-slate-800 cursor-pointer flex justify-between items-center group-open:bg-white">
              Where are my files?
              <span className="group-open:rotate-180 transition-transform">↓</span>
            </summary>
            <div className="p-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100">
              Your files are stored locally in your browser cache.
            </div>
          </details>
        </div>
      </div>
    )
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
        <div className="p-8 border-b border-slate-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">SignX Profile</h3>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-gray-900 transition-colors">✕</button>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {(['ABOUT', 'PRIVACY', 'HELP'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#2563eb] shadow-md' : 'text-slate-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {content[activeTab]}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenu;
