import React, { useState, useEffect } from 'react';
import { adminService } from '../services/apiService';
import { 
  Plus, 
  UserPlus, 
  Settings, 
  Save, 
  Trash2, 
  ChevronRight, 
  Shield, 
  Users, 
  Variable, 
  Cpu, 
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminManagement() {
  const [activeView, setActiveView] = useState('plans'); // plans, users
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // User creation state
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user', plan: 'Free' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await adminService.getGlobalConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.username || !newUser.password) throw new Error('Username and password are required');
      await adminService.createUser(newUser);
      setMessage({ type: 'success', text: 'User created successfully' });
      setNewUser({ username: '', password: '', email: '', role: 'user', plan: 'Free' });
      setIsCreatingUser(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in space-y-8 bg-slate-50 min-h-full">
      {/* View Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button 
          onClick={() => setActiveView('plans')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeView === 'plans' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <CreditCard size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Plans & LLM</span>
        </button>
        <button 
          onClick={() => setActiveView('users')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeView === 'users' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <UserPlus size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Account Forge</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-slide-up ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
        </div>
      )}

      {activeView === 'plans' && config && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter">Plan Architecture</h2>
            <button 
                onClick={saveConfig}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95 transition-transform"
            >
                <Save size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Save Config</span>
            </button>
          </div>

          <div className="space-y-4">
            {config.plans.map((plan, index) => (
              <div key={plan.name} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl overflow-hidden relative group">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-1.5 h-6 rounded-full ${plan.name === 'Premium' ? 'bg-amber-500' : plan.name === 'Pro' ? 'bg-brand-500' : 'bg-slate-300'}`} />
                  <h3 className="text-lg font-black text-slate-900">{plan.name} Tier</h3>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Consumption Limit (Minutes)</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="number"
                        value={plan.monthlyLimit}
                        onChange={(e) => handleUpdatePlan(index, 'monthlyLimit', parseInt(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Foundation Model (LLM)</label>
                    <div className="relative">
                      <Cpu size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select 
                        value={plan.aiModel}
                        onChange={(e) => handleUpdatePlan(index, 'aiModel', e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all appearance-none"
                      >
                        <option value="gpt-4o">GPT-4o (Omni)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-35-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-sonnet">Claude 3.5 Sonnet</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Realtime Infrastructure</label>
                    <div className="relative">
                      <Variable size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select 
                        value={plan.realtimeModel}
                        onChange={(e) => handleUpdatePlan(index, 'realtimeModel', e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all appearance-none"
                      >
                        <option value="gpt-realtime-1.5">GPT Realtime v1.5</option>
                        <option value="gpt-4-realtime-preview">GPT-4 Realtime Preview</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Pricing (INR)</label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="number"
                        value={plan.price}
                        onChange={(e) => handleUpdatePlan(index, 'price', parseInt(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'users' && (
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tighter">Account Provisioning</h2>
          
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / Identifier</label>
              <input 
                type="text"
                placeholder="e.g. rahul_dx"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 px-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Credentials</label>
              <input 
                type="password"
                placeholder="Secure access key"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 px-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Privilege Level</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 px-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all appearance-none"
                >
                  <option value="user">Standard Client</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Tier</label>
                <select 
                  value={newUser.plan}
                  onChange={(e) => setNewUser({...newUser, plan: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 px-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all appearance-none"
                >
                  <option value="Free">Free Tier</option>
                  <option value="Pro">Pro Access</option>
                  <option value="Premium">Premium Elite</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleCreateUser}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl shadow-brand-500/20"
            >
              <Plus size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Provision New Account</span>
            </button>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <Shield size={14} className="text-brand-400" />
                    <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">Protocol Intelligence</span>
                </div>
                <h4 className="text-lg font-black mb-2">Platform Integrity</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Account provisioning triggers backend protocol initialization. Ensure the identifier matches the client's corporate designation.
                </p>
             </div>
          </div>
        </div>
      )}

      <div className="pb-20" />
    </div>
  );
}
