
import React, { useState } from 'react';

interface RentReceiptData {
  tenantName: string;
  landlordName: string;
  rentAmount: string;
  month: string;
  address: string;
  panNumber: string;
}

interface RentReceiptCreatorProps {
  onGenerate: (data: RentReceiptData) => void;
  onCancel: () => void;
}

const RentReceiptCreator: React.FC<RentReceiptCreatorProps> = ({ onGenerate, onCancel }) => {
  const [data, setData] = useState<RentReceiptData>({
    tenantName: '',
    landlordName: '',
    rentAmount: '',
    month: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    address: '',
    panNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl rounded-[2.5rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Create Rent Receipt</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">HRA Compliant</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-slate-50 rounded-2xl text-slate-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tenant Name</label>
              <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all" value={data.tenantName} onChange={e => setData({...data, tenantName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Landlord Name</label>
              <input required type="text" placeholder="Owner Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all" value={data.landlordName} onChange={e => setData({...data, landlordName: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rent Amount</label>
            <input required type="number" placeholder="5000" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all" value={data.rentAmount} onChange={e => setData({...data, rentAmount: e.target.value})} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Property Address</label>
            <textarea required placeholder="House No, City, State" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none h-24" value={data.address} onChange={e => setData({...data, address: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rent Month</label>
              <input required type="text" placeholder="Jan 2024" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all" value={data.month} onChange={e => setData({...data, month: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Landlord ID (Optional)</label>
              <input type="text" placeholder="ID Number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all uppercase" value={data.panNumber} onChange={e => setData({...data, panNumber: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-100 active:scale-95 transition-all mt-6">Generate Receipt</button>
        </form>
      </div>
    </div>
  );
};

export default RentReceiptCreator;
