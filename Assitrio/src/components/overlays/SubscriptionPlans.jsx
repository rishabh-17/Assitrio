import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Zap, 
  Crown, 
  ShieldCheck, 
  ChevronRight, 
  CreditCard,
  Target
} from 'lucide-react';
import { paymentService } from '../../services/apiService';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'Free',
    name: 'Essential',
    price: '0',
    description: 'Perfect for light users and occasional meetings.',
    features: ['60 minutes monthly limit', 'Basic RAG indexing', 'Cloud sync across 2 devices', 'Email support'],
    color: 'slate',
    icon: ShieldCheck
  },
  {
    id: 'Pro',
    name: 'Professional',
    price: '999',
    description: 'Supercharge your productivity and recall speed.',
    features: ['500 minutes monthly limit', 'Advanced AI summaries', 'Priority extraction queue', 'Early access to features'],
    color: 'brand',
    icon: Zap,
    popular: true
  },
  {
    id: 'Premium',
    name: 'Executive',
    price: '1999',
    description: 'Unlimited bandwidth for enterprise power users.',
    features: ['Unlimited recording minutes', 'Deep Audit MOM generation', 'Global context across all notes', '24/7 dedicated support'],
    color: 'amber',
    icon: Crown
  }
];

export default function SubscriptionPlans({ currentPlan, onClose, onSuccess }) {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    if (plan.id === currentPlan) {
      toast('You are already on this plan');
      return;
    }
    if (plan.id === 'Free') {
        toast('Please contact support to downgrade');
        return;
    }

    setLoading(plan.id);
    try {
      const order = await paymentService.createOrder(plan.id);
      
      const options = {
        key: 'rzp_test_YourKeyHere', // Replace with dynamic config from backend if possible
        amount: order.amount,
        currency: order.currency,
        name: 'Assitrio AI',
        description: `Upgrade to ${plan.name} Tier`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verification = await paymentService.verifyPayment({
              ...response,
              plan: plan.id
            });
            if (verification.success) {
              toast.success(`Welcome to ${plan.name}!`);
              onSuccess && onSuccess(plan.id);
              onClose();
            }
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Failed to initiate checkout');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-50 w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-10 pb-0 flex justify-between items-start relative z-10 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-8 bg-brand-600 rounded-full" />
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Choose Your <span className="text-brand-600">Power</span></h2>
            </div>
            <p className="text-[12px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-2 ml-4">Scale your AI memory core as your bandwidth requirements grow.</p>
          </div>
          <button onClick={onClose} className="p-4 bg-white/50 backdrop-blur-xl rounded-2xl text-slate-400 hover:text-slate-600 shadow-xl border border-white transition-all hover:rotate-90 active:scale-95">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div 
                key={plan.id}
                className={`relative bg-white rounded-[32px] p-8 border-2 transition-all flex flex-col h-full ${
                    plan.popular ? 'border-brand-500 shadow-xl shadow-brand-500/10' : 'border-slate-100 shadow-sm'
                } ${currentPlan === plan.id ? 'ring-4 ring-emerald-500/10 border-emerald-500' : ''}`}
              >
                {plan.popular && (
                    <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                        Best Value
                    </div>
                )}
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                    plan.color === 'slate' ? 'bg-slate-100 text-slate-600' : 
                    plan.color === 'brand' ? 'bg-brand-50 text-brand-600' : 
                    'bg-amber-50 text-amber-600'
                }`}>
                  <plan.icon size={28} />
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">{plan.description}</p>

                <div className="mb-10">
                    <div className="flex items-end gap-1.5">
                        <span className="text-5xl font-black text-slate-900 tracking-tighter">₹{plan.price}</span>
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2.5">/ Month</span>
                    </div>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                    {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={12} className="text-emerald-500" />
                            </div>
                            <span className="text-[12px] text-slate-600 font-medium leading-tight">{f}</span>
                        </div>
                    ))}
                </div>

                <button 
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading || currentPlan === plan.id}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                    currentPlan === plan.id 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : plan.color === 'brand'
                    ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {loading === plan.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
                   currentPlan === plan.id ? <><ShieldCheck size={14}/> Active Plan</> : 'Select Tier'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-8 bg-slate-100/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">PCI-DSS Compliant</span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                    <Target size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Razorpay Secure</span>
                </div>
            </div>
            <p className="text-[9px] text-slate-400 max-w-sm text-center sm:text-right font-medium leading-relaxed">
                By subscribing, you agree to our terms of service. You can cancel anytime. Subscriptions are billed monthly and renew automatically.
            </p>
        </div>
      </div>
    </div>
  );
}
