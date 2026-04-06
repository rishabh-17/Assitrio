import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  User as UserIcon,
  ShieldCheck,
  Zap,
  Crown,
  FileText
} from 'lucide-react';
import { paymentService } from '../../services/apiService';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  created: { label: 'Incomplete', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
  captured: { label: 'Successful', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle }
};

const PLAN_MAP = {
  Free: { icon: ShieldCheck, color: 'text-slate-400' },
  Pro: { icon: Zap, color: 'text-brand-500' },
  Premium: { icon: Crown, color: 'text-amber-500' }
};

export default function PaymentHistory({ onClose, isAdmin = false, isOverlay = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = isAdmin 
        ? await paymentService.getAdminHistory()
        : await paymentService.getHistory();
      setHistory(data);
    } catch (err) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className={`w-full ${isOverlay ? 'max-w-md bg-slate-50 h-full sm:h-auto sm:max-h-[90vh] relative flex flex-col overflow-hidden sm:rounded-[48px] sm:border-x sm:border-slate-800 shadow-2xl' : 'flex flex-col h-full bg-slate-50'}`}>
        
        {isOverlay && (
          <>
            {/* Background gradient (Login Style) */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-600 via-brand-700 to-slate-900 opacity-95" />

            {/* Decorative circles (Login Style) */}
            <div className="absolute top-[-40px] right-[-30px] w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute bottom-[100px] left-[-20px] w-32 h-32 bg-white/5 rounded-full" />
          </>
        )}

        {/* Content Header */}
        <div className={`relative z-10 p-8 pb-4 flex justify-between items-center shrink-0 ${isOverlay ? '' : 'pt-12 sm:pt-14'}`}>
          <div className="flex flex-col">
            <h2 className={`text-2xl font-black tracking-tighter leading-none ${isOverlay ? 'text-white' : 'text-slate-900'}`}>
                {isAdmin ? 'Global Revenue' : 'Payment History'}
            </h2>
            <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mt-2 ${isOverlay ? 'text-brand-200' : 'text-slate-400'}`}>
                {isAdmin ? 'Marketplace Audit Log' : 'Billing & Lifecycle'}
            </p>
          </div>
          {isOverlay && (
            <button 
              onClick={onClose} 
              className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white/70 hover:text-white border border-white/10 transition-all hover:rotate-90 active:scale-90"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Form Area / Table Card */}
        <div className={`relative z-10 flex-1 bg-white rounded-t-[40px] sm:rounded-[40px] flex flex-col overflow-hidden shadow-2xl ${isOverlay ? 'm-0 sm:m-3 p-6' : 'm-3 p-6 mb-28'}`}>
          <div className="overflow-y-auto scrollbar-hide flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-brand-600 rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Accounts</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                <FileText size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transaction records found</p>
            </div>
          ) : (
            <div className="space-y-4">
                {/* Table Header (Desktop) */}
                <div className="hidden sm:grid grid-cols-12 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] items-center">
                    <div className="col-span-4 flex items-center gap-2"><CreditCard size={12}/> Order ID</div>
                    <div className="col-span-2 flex items-center gap-2"><Calendar size={12}/> Date</div>
                    <div className={`col-span-${isAdmin ? 2 : 3} flex items-center gap-2`}><Layers size={12}/> Tier</div>
                    {isAdmin && <div className="col-span-2 flex items-center gap-2"><UserIcon size={12}/> Client</div>}
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2 text-right pr-4">Status</div>
                </div>

                {/* Rows */}
                {history.map(tx => {
                    const status = STATUS_MAP[tx.status] || STATUS_MAP.created;
                    const PlanIcon = PLAN_MAP[tx.plan]?.icon || ShieldCheck;
                    
                    return (
                        <div key={tx._id} className="grid grid-cols-1 sm:grid-cols-12 px-6 py-5 bg-white border border-slate-100 rounded-3xl items-center hover:border-brand-200 hover:shadow-md transition-all group">
                            <div className="col-span-4 mb-2 sm:mb-0">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Order ID</p>
                                <p className="text-[13px] font-extrabold text-slate-800 font-mono tracking-tight">{tx.razorpayOrderId}</p>
                            </div>
                            
                            <div className="col-span-2 mb-2 sm:mb-0">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 sm:hidden">Date</p>
                                <p className="text-[12px] font-bold text-slate-600">{new Date(tx.createdAt).toLocaleDateString()}</p>
                            </div>

                            <div className={`col-span-${isAdmin ? 2 : 3} mb-2 sm:mb-0`}>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 sm:hidden">Tier</p>
                                <div className="flex items-center gap-2">
                                    <PlanIcon size={14} className={PLAN_MAP[tx.plan]?.color} />
                                    <span className="text-[12px] font-black text-slate-800">{tx.plan}</span>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="col-span-2 mb-2 sm:mb-0">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 sm:hidden">Client</p>
                                    <div className="flex flex-col">
                                        <p className="text-[12px] font-extrabold text-slate-800 leading-tight">{tx.userId?.displayName || tx.userId?.username}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase -mt-0.5">{tx.userId?.username}</p>
                                    </div>
                                </div>
                            )}

                            <div className="col-span-2 mb-4 sm:mb-0 sm:text-right">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 sm:hidden">Amount</p>
                                <p className="text-base font-black text-slate-900 group-hover:text-brand-600 transition-colors">₹{tx.amount}</p>
                            </div>

                            <div className="col-span-2 text-right">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                    <status.icon size={12} />
                                    {status.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          )}
          </div>

          {/* Footer (Login Style) */}
          <div className="pt-6 border-t border-slate-50 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck size={14} className="text-emerald-500" /> 
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Standard Audit</span>
                </div>
                {isAdmin && (
                  <button className="flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">
                    <Download size={14} /> Export Ledger
                  </button>
                )}
            </div>
          </div>
        </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md animate-fade-in sm:p-4">
        {content}
      </div>
    );
  }

  return content;
}
