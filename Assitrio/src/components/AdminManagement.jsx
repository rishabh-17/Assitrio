import React, { useState, useEffect } from 'react';
import { adminService } from '../services/apiService';
import { Plus, UserPlus, Save, CreditCard, Clock, CheckCircle2, AlertCircle, Cpu, Variable, Shield } from 'lucide-react';

const s = {
  root: { minHeight: '100%', backgroundColor: '#111111', padding: '20px 16px 100px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  title: { fontSize: 22, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', marginBottom: 20, paddingTop: 24 },
  tabRow: { display: 'flex', backgroundColor: '#1a1a1a', borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 },
  tabActive: { flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(109,91,250,0.4)', letterSpacing: '0.05em' },
  tabInactive: { flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 600, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent', color: '#4b5563', letterSpacing: '0.05em' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 20, border: '1px solid #222', padding: '20px 16px', marginBottom: 16 },
  label: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 },
  inputWrap: { position: 'relative', marginBottom: 16 },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' },
  input: { width: '100%', backgroundColor: '#222', border: '1px solid #2a2a2a', borderRadius: 12, padding: '12px 14px 12px 42px', fontSize: 13, fontWeight: 600, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', backgroundColor: '#222', border: '1px solid #2a2a2a', borderRadius: 12, padding: '12px 14px 12px 42px', fontSize: 13, fontWeight: 600, color: '#f3f4f6', outline: 'none', appearance: 'none', boxSizing: 'border-box' },
  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#f9fafb', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  planAccent: (name) => ({ width: 4, height: 20, borderRadius: 99, backgroundColor: name === 'Premium' ? '#f59e0b' : name === 'Pro' ? '#8b5cf6' : '#374151', marginRight: 10, flexShrink: 0 }),
  planTitle: { fontSize: 15, fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, color: '#a78bfa', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' },
  primaryBtn: { width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.08em', boxShadow: '0 4px 16px rgba(109,91,250,0.35)', marginTop: 8 },
  toast: (type) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, marginBottom: 16, backgroundColor: type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${type === 'success' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`, color: type === 'success' ? '#34d399' : '#f87171', fontSize: 11, fontWeight: 700 }),
  infoCard: { backgroundColor: '#161616', border: '1px solid #222', borderRadius: 16, padding: '16px', marginTop: 8 },
};

export default function AdminManagement() {
  const [activeView, setActiveView] = useState('plans');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user', plan: 'Free' });

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try { const data = await adminService.getGlobalConfig(); setConfig(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdatePlan = (index, field, value) => {
    const newPlans = [...config.plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setConfig({ ...config, plans: newPlans });
  };

  const saveConfig = async () => {
    try {
      await adminService.updateGlobalConfig(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch { setMessage({ type: 'error', text: 'Failed to save configuration' }); }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.username || !newUser.password) throw new Error('Username and password required');
      await adminService.createUser(newUser);
      setMessage({ type: 'success', text: 'User created successfully' });
      setNewUser({ username: '', password: '', email: '', role: 'user', plan: 'Free' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Failed to create user' }); }
  };

  if (loading && !config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', backgroundColor: '#111111' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #2a2a2a', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={s.root}>
      <h1 style={s.title}>Admin Panel</h1>

      <div style={s.tabRow}>
        <button style={activeView === 'plans' ? s.tabActive : s.tabInactive} onClick={() => setActiveView('plans')}>
          Plans & LLM
        </button>
        <button style={activeView === 'users' ? s.tabActive : s.tabInactive} onClick={() => setActiveView('users')}>
          Account Forge
        </button>
      </div>

      {message && (
        <div style={s.toast(message.type)}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {activeView === 'plans' && config && (
        <div>
          <div style={s.sectionTitle}>
            <span>Plan Architecture</span>
            <button style={s.saveBtn} onClick={saveConfig}>
              <Save size={14} /> Save Config
            </button>
          </div>

          {config.plans.map((plan, index) => (
            <div key={plan.name} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={s.planAccent(plan.name)} />
                <span style={s.planTitle}>{plan.name} Tier</span>
              </div>

              <label style={s.label}>Consumption Limit (Minutes)</label>
              <div style={s.inputWrap}>
                <Clock size={15} style={s.inputIcon} />
                <input type="number" value={plan.monthlyLimit} onChange={(e) => handleUpdatePlan(index, 'monthlyLimit', parseInt(e.target.value))} style={s.input} />
              </div>

              <label style={s.label}>Foundation Model (LLM)</label>
              <div style={s.inputWrap}>
                <Cpu size={15} style={s.inputIcon} />
                <select value={plan.aiModel} onChange={(e) => handleUpdatePlan(index, 'aiModel', e.target.value)} style={s.select}>
                  <option value="gpt-4o">GPT-4o (Omni)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-35-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>

              <label style={s.label}>Realtime Infrastructure</label>
              <div style={s.inputWrap}>
                <Variable size={15} style={s.inputIcon} />
                <select value={plan.realtimeModel} onChange={(e) => handleUpdatePlan(index, 'realtimeModel', e.target.value)} style={s.select}>
                  <option value="gpt-realtime-1.5">GPT Realtime v1.5</option>
                  <option value="gpt-4-realtime-preview">GPT-4 Realtime Preview</option>
                </select>
              </div>

              <label style={s.label}>Monthly Pricing (INR)</label>
              <div style={s.inputWrap}>
                <CreditCard size={15} style={s.inputIcon} />
                <input type="number" value={plan.price} onChange={(e) => handleUpdatePlan(index, 'price', parseInt(e.target.value))} style={s.input} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'users' && (
        <div>
          <div style={s.sectionTitle}>Account Provisioning</div>
          <div style={s.card}>
            <label style={s.label}>Username / Identifier</label>
            <input type="text" placeholder="e.g. rahul_dx" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} style={{ ...s.input, paddingLeft: 14, marginBottom: 16 }} />

            <label style={s.label}>Security Credentials</label>
            <input type="password" placeholder="Secure access key" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} style={{ ...s.input, paddingLeft: 14, marginBottom: 16 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
              <div>
                <label style={s.label}>Privilege Level</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ ...s.select, paddingLeft: 14 }}>
                  <option value="user">Standard Client</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Assigned Tier</label>
                <select value={newUser.plan} onChange={(e) => setNewUser({ ...newUser, plan: e.target.value })} style={{ ...s.select, paddingLeft: 14 }}>
                  <option value="Free">Free Tier</option>
                  <option value="Pro">Pro Access</option>
                  <option value="Premium">Premium Elite</option>
                </select>
              </div>
            </div>

            <button style={s.primaryBtn} onClick={handleCreateUser}>
              <Plus size={18} /> Provision New Account
            </button>
          </div>

          <div style={s.infoCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Shield size={13} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protocol Intelligence</span>
            </div>
            <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
              Account provisioning triggers backend protocol initialization. Ensure the identifier matches the client's corporate designation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}