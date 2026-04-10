import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, Clock, AlertCircle, Download, Calendar, Layers, ArrowUpRight, User as UserIcon, ShieldCheck, Zap, Crown, FileText } from 'lucide-react';
import { paymentService } from '../../services/apiService';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  created: { label: 'Incomplete', bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)', icon: Clock },
  captured: { label: 'Successful', bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)', icon: CheckCircle2 },
  failed: { label: 'Failed', bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)', icon: AlertCircle },
};
const PLAN_MAP = { Free: { icon: ShieldCheck, color: '#6b7280' }, Pro: { icon: Zap, color: '#a78bfa' }, Premium: { icon: Crown, color: '#fbbf24' } };

const dk = {
  root: { fontFamily: 'system-ui,-apple-system,sans-serif', backgroundColor: '#111111' },
  headerGrad: { background: 'linear-gradient(135deg, #1a1030 0%, #0f0f1a 100%)', padding: '56px 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(109,91,250,0.15)' },
  headerTitle: (overlay) => ({ fontSize: 22, fontWeight: 800, color: overlay ? '#f9fafb' : '#f9fafb', letterSpacing: '-0.2px', margin: '0 0 6px' }),
  headerSub: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 },
  closeBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  contentWrap: { backgroundColor: '#111111', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 16px 0' },
  txCard: { backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 18, padding: '16px', marginBottom: 10 },
  txLabel: { fontSize: 9, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  txVal: { fontSize: 13, fontWeight: 800, color: '#f3f4f6' },
  txAmount: { fontSize: 16, fontWeight: 800, color: '#f9fafb' },
  statusChip: (s) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, border: `1px solid ${s.border}`, backgroundColor: s.bg, color: s.color, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }),
  footer: { padding: '16px 16px 32px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111111' },
};

export default function PaymentHistory({ onClose, isAdmin = false, isOverlay = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const data = isAdmin ? await paymentService.getAdminHistory() : await paymentService.getHistory();
      setHistory(data);
    } catch { toast.error('Failed to load transaction history'); }
    finally { setLoading(false); }
  };

  const content = (
    <div style={{ ...dk.root, width: '100%', maxWidth: isOverlay ? 440 : '100%', height: isOverlay ? '100%' : '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isOverlay ? { borderRadius: 0 } : {}) }}>
      <div style={dk.headerGrad}>
        <div>
          <h2 style={dk.headerTitle(isOverlay)}>{isAdmin ? 'Global Revenue' : 'Payment History'}</h2>
          <p style={dk.headerSub}>{isAdmin ? 'Marketplace Audit Log' : 'Billing & Lifecycle'}</p>
        </div>
        {isOverlay && (
          <button onClick={onClose} style={dk.closeBtn}><X size={18} /></button>
        )}
      </div>

      <div style={{ ...dk.contentWrap, flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#8b5cf6', borderRadius: '50%' }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Synchronizing Accounts</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#1a1a1a', borderRadius: 20, border: '2px dashed #222', margin: '16px 0' }}>
            <FileText size={44} style={{ color: '#222', margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No transaction records found</p>
          </div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            {history.map(tx => {
              const status = STATUS_MAP[tx.status] || STATUS_MAP.created;
              const PlanIcon = PLAN_MAP[tx.plan]?.icon || ShieldCheck;
              const planColor = PLAN_MAP[tx.plan]?.color || '#6b7280';
              return (
                <div key={tx._id} style={dk.txCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <p style={dk.txLabel}>Order ID</p>
                      <p style={{ ...dk.txVal, fontFamily: 'monospace', fontSize: 12 }}>{tx.razorpayOrderId}</p>
                    </div>
                    <div style={dk.statusChip(status)}><status.icon size={11} />{status.label}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                    <div>
                      <p style={dk.txLabel}>Date</p>
                      <p style={{ ...dk.txVal, fontSize: 12 }}>{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p style={dk.txLabel}>Tier</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PlanIcon size={13} style={{ color: planColor }} />
                        <span style={{ ...dk.txVal, fontSize: 12 }}>{tx.plan}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div>
                        <p style={dk.txLabel}>Client</p>
                        <p style={{ ...dk.txVal, fontSize: 12 }}>{tx.userId?.displayName || tx.userId?.username}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1f1f1f', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={dk.txAmount}>₹{tx.amount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={dk.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <ShieldCheck size={13} style={{ color: '#34d399' }} /> Standard Audit
        </div>
        {isAdmin && (
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Download size={13} /> Export Ledger
          </button>
        )}
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
        {content}
      </div>
    );
  }
  return content;
}