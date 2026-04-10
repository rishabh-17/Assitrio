import React, { useState } from 'react';
import { X, Check, Zap, Crown, ShieldCheck, CreditCard, Target } from 'lucide-react';
import { paymentService } from '../../services/apiService';
import toast from 'react-hot-toast';

const PLANS = [
  { id: 'Free', name: 'Essential', price: '0', description: 'Perfect for light users and occasional meetings.', features: ['60 minutes monthly limit', 'Basic RAG indexing', 'Cloud sync across 2 devices', 'Email support'], accent: '#374151', icon: ShieldCheck },
  { id: 'Pro', name: 'Professional', price: '999', description: 'Supercharge your productivity and recall speed.', features: ['500 minutes monthly limit', 'Advanced AI summaries', 'Priority extraction queue', 'Early access to features'], accent: '#6d5bfa', icon: Zap, popular: true },
  { id: 'Premium', name: 'Executive', price: '1999', description: 'Unlimited bandwidth for enterprise power users.', features: ['Unlimited recording minutes', 'Deep Audit MOM generation', 'Global context across all notes', '24/7 dedicated support'], accent: '#f59e0b', icon: Crown },
];

export default function SubscriptionPlans({ currentPlan, onClose, onSuccess }) {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    if (plan.id === currentPlan) { toast('You are already on this plan'); return; }
    if (plan.id === 'Free') { toast('Please contact support to downgrade'); return; }
    setLoading(plan.id);
    try {
      const order = await paymentService.createOrder(plan.id);
      const options = {
        key: 'rzp_test_YourKeyHere', amount: order.amount, currency: order.currency,
        name: 'Assistrio AI', description: `Upgrade to ${plan.name} Tier`, order_id: order.id,
        handler: async (response) => {
          try {
            const v = await paymentService.verifyPayment({ ...response, plan: plan.id });
            if (v.success) { toast.success(`Welcome to ${plan.name}!`); onSuccess?.(plan.id); onClose(); }
          } catch { toast.error('Payment verification failed'); }
        },
        theme: { color: '#6d5bfa' }
      };
      new window.Razorpay(options).open();
    } catch { toast.error('Failed to initiate checkout'); }
    finally { setLoading(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ backgroundColor: '#111111', width: '100%', maxWidth: 960, borderRadius: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', border: '1px solid #1f1f1f' }}>

        {/* Header */}
        <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1a1a1a', paddingBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 4, height: 32, background: 'linear-gradient(180deg, #6d5bfa, #9b5de5)', borderRadius: 99 }} />
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.5px', margin: 0 }}>
                Choose Your <span style={{ color: '#a78bfa' }}>Power</span>
              </h2>
            </div>
            <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: 16 }}>Scale your AI memory core as your bandwidth grows.</p>
          </div>
          <button onClick={onClose} style={{ padding: 12, backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 16, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={22} /></button>
        </div>

        {/* Plans */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id;
            return (
              <div key={plan.id} style={{ position: 'relative', backgroundColor: '#1a1a1a', borderRadius: 28, padding: '28px 24px', border: `2px solid ${plan.popular ? plan.accent : isActive ? '#34d399' : '#222'}`, display: 'flex', flexDirection: 'column', boxShadow: plan.popular ? `0 8px 32px rgba(109,91,250,0.2)` : 'none' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: 0, right: 28, transform: 'translateY(-50%)', padding: '5px 14px', background: 'linear-gradient(135deg,#6d5bfa,#9b5de5)', color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', borderRadius: 99, boxShadow: '0 4px 14px rgba(109,91,250,0.4)' }}>Best Value</div>
                )}

                <div style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `rgba(${plan.accent === '#6d5bfa' ? '109,91,250' : plan.accent === '#f59e0b' ? '245,158,11' : '55,65,81'},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <plan.icon size={26} style={{ color: plan.accent }} />
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', margin: '0 0 6px', letterSpacing: '-0.2px' }}>{plan.name}</h3>
                <p style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, lineHeight: 1.6, margin: '0 0 20px' }}>{plan.description}</p>

                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.5px' }}>₹{plan.price}</span>
                  <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: 6 }}>/ month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Check size={11} style={{ color: '#34d399' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={!!loading || isActive}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: isActive ? 'default' : 'pointer',
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: isActive ? 'rgba(52,211,153,0.1)' : plan.popular ? undefined : '#222',
                    background: isActive ? 'rgba(52,211,153,0.1)' : plan.popular ? `linear-gradient(135deg, #6d5bfa, #9b5de5)` : undefined,
                    color: isActive ? '#34d399' : '#fff',
                    boxShadow: plan.popular && !isActive ? '0 6px 20px rgba(109,91,250,0.35)' : 'none',
                  }}
                >
                  {loading === plan.id ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : isActive ? <><ShieldCheck size={13} /> Active Plan</> : 'Select Tier'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[{ icon: ShieldCheck, label: 'PCI-DSS Compliant' }, { icon: Target, label: 'Razorpay Secure' }].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Icon size={14} /> {label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 9, color: '#374151', maxWidth: 320, textAlign: 'right', lineHeight: 1.7, margin: 0 }}>
            By subscribing, you agree to our terms. You can cancel anytime. Subscriptions are billed monthly and renew automatically.
          </p>
        </div>
      </div>
    </div>
  );
}