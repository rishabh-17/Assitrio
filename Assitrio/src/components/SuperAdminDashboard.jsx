import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/apiService';
import { 
  Users, 
  Settings, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  Search, 
  Clock, 
  Mic, 
  CheckCircle2, 
  AlertCircle,
  X,
  CreditCard,
  ChevronLeft,
  Calendar,
  Archive,
  Activity,
  ArrowUpRight,
  User as UserIcon,
  MessageCircle,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Database,
  Edit2,
  Mail,
  UserCircle
} from 'lucide-react';
import PaymentHistory from './overlays/PaymentHistory';

const PLAN_COLORS = {
  Free: 'bg-slate-100 text-slate-600 border-slate-200',
  Pro: 'bg-brand-50 text-brand-600 border-brand-100',
  Premium: 'bg-amber-50 text-amber-600 border-amber-100'
};

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [globalActivities, setGlobalActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Selection States
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState('');
  
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [userEditData, setUserEditData] = useState({ displayName: '', email: '', role: 'user' });

  // Detail View State
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    fetchData();
    fetchGlobalActivities();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getStats()
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalActivities = async () => {
    try {
      const data = await adminService.getGlobalActivities();
      setGlobalActivities(data);
    } catch (err) {
      console.error('Failed to fetch global activities:', err);
    }
  };

  const handleFetchUserDetails = async (user) => {
    try {
      const details = await adminService.getUserDetails(user._id);
      setDetailUser(details);
    } catch (err) {
      alert('Failed to fetch user history');
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser || !editingPlan) return;
    try {
      await adminService.updateUserPlan(selectedUser._id, editingPlan);
      setIsEditModalOpen(false);
      fetchData();
      if (detailUser && detailUser.user._id === selectedUser._id) {
        setDetailUser(prev => ({ ...prev, user: { ...prev.user, plan: editingPlan } }));
      }
    } catch (err) {
      alert('Failed to update plan');
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!selectedUser) return;
    try {
        await adminService.updateUser({ userId: selectedUser._id, ...userEditData });
        setIsUserEditModalOpen(false);
        fetchData();
        if (detailUser && detailUser.user._id === selectedUser._id) {
            setDetailUser(prev => ({ ...prev, user: { ...prev.user, ...userEditData } }));
        }
    } catch (err) {
        alert('Failed to update user profile');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await adminService.deleteUser(userId);
      if (detailUser && detailUser.user._id === userId) setDetailUser(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const filteredUsers = useMemo(() => {
    return Array.isArray(users) ? users.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : [];
  }, [users, searchQuery]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">Fetching System State</p>
        </div>
      </div>
    );
  }

  // --- RENDERING DETAIL VIEW ---
  if (detailUser) {
    const { user, notes, activities } = detailUser;
    return (
      <div className="p-4 sm:p-6 animate-fade-in min-h-full bg-slate-50">
          <button 
              onClick={() => setDetailUser(null)}
              className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 hover:text-brand-600 transition-colors"
          >
              <ChevronLeft size={16} /> Back to Directory
          </button>

          <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 mb-6 relative overflow-hidden group">
              <div className="absolute top-4 right-4 z-20">
                  <button 
                      onClick={() => {
                          setSelectedUser(user);
                          setUserEditData({ displayName: user.displayName || '', email: user.email || '', role: user.role || 'user' });
                          setIsUserEditModalOpen(true);
                      }}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all"
                      title="Edit Profile"
                  >
                      <Edit2 size={16} />
                  </button>
              </div>

              <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center mb-4 border-4 border-white shadow-lg overflow-hidden">
                      {user.profilePhoto ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-slate-200" />}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter mb-1">{user.displayName || user.username}</h2>
                  <div className="flex items-center gap-2 mb-6">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${PLAN_COLORS[user.plan]}`}>
                          {user.plan || 'FREE'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-tight">@{user.username}</span>
                  </div>

                  <div className="flex items-center gap-4 mb-8 text-[11px] font-bold text-slate-500">
                      <div className="flex items-center gap-1.5"><Mail size={12} className="text-brand-500" /> {user.email || 'No Email'}</div>
                      <div className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-brand-500" /> {user.role === 'admin' ? 'Super Admin' : 'Standard'}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 w-full mb-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Consumption</p>
                          <p className="text-base font-black text-slate-900">{Math.round(((user.usage?.listenSeconds || 0) + (user.usage?.talkSeconds || 0)) / 60)}m</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Memories</p>
                          <p className="text-base font-black text-slate-900">{notes.length}</p>
                      </div>
                  </div>

                  <div className="w-full flex gap-2">
                      <button 
                          onClick={() => {
                              setSelectedUser(user);
                              setEditingPlan(user.plan || 'Free');
                              setIsEditModalOpen(true);
                          }}
                          className="flex-1 py-3 bg-brand-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                      >
                          Adjust Plan
                      </button>
                      <button 
                          onClick={() => handleDeleteUser(user._id)}
                          className="flex-1 py-3 bg-white text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-50 hover:bg-red-50 transition-all"
                      >
                          Delete
                      </button>
                  </div>
              </div>
          </div>

          <div className="space-y-6 pb-10">
              <div>
                  <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Archive size={14} className="text-brand-600" /> Recent Memories
                  </h3>
                  <div className="space-y-3">
                      {notes.slice(0, 5).map(note => (
                          <div key={note._id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-black text-[13px] text-slate-800 tracking-tight truncate">{note.title}</h4>
                                  <span className="text-[8px] font-black text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">{note.date}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 italic">"{note.summary}"</p>
                          </div>
                      ))}
                      {notes.length === 0 && <p className="text-[10px] text-slate-300 font-bold text-center py-4 uppercase">No records found</p>}
                  </div>
              </div>

              <div>
                  <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity size={14} className="text-brand-600" /> Activity Stream
                  </h3>
                  <div className="space-y-2">
                      {activities.slice(0, 5).map(act => (
                          <div key={act._id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                              <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                  <Clock size={10} className="text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                  <p className="text-[11px] font-black text-slate-800 leading-tight mb-0.5">{act.title}</p>
                                  <p className="text-[9px] text-slate-400 font-medium truncate">{act.sub}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
          {renderEditModal()}
          {renderUserEditModal()}
      </div>
    );
  }

  // --- RENDERING DIRECTORY VIEW ---
  return (
    <div className="p-4 sm:p-6 animate-fade-in space-y-6 bg-slate-50 min-h-full">
      {/* Search & Stats Card */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-[60px] -mr-16 -mt-16 opacity-40" />
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-brand-600 rounded-full" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Matrix</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 mb-6">Nexus <span className="text-brand-600">Core</span></h1>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={12} className="text-brand-600" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Clients</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={12} className="text-emerald-600" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-tight">₹{stats?.totalRevenue || 0}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Database size={12} className="text-indigo-600" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Memories</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{stats?.totalNotes || 0}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap size={12} className="text-amber-600" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutes Consumed</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{stats?.totalMinutesUsed || 0}m</p>
                </div>
            </div>

            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                    type="text" 
                    placeholder="Locate user profile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:border-brand-100 transition-all placeholder:text-slate-300"
                />
            </div>
        </div>
      </div>

      {/* User Directory */}
      <div>
        <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><UserIcon size={14} className="text-brand-600" /> User Directory</span>
            <span className="text-slate-300 text-[9px]">{filteredUsers.length} Results</span>
        </h3>
        <div className="space-y-3">
            {filteredUsers.map(user => (
                <div 
                    key={user._id} 
                    className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-brand-300 transition-all shadow-sm group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden text-slate-300 font-black text-lg">
                            {user.profilePhoto ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-[13px] font-black text-slate-900 tracking-tight truncate">{user.displayName || user.username}</h3>
                                <div className={`w-1.5 h-1.5 rounded-full ${user.plan === 'Premium' ? 'bg-amber-500' : user.plan === 'Pro' ? 'bg-brand-500' : 'bg-slate-300'}`} />
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{user.username} • {user.plan} Tier</p>
                        </div>
                        <button 
                            onClick={() => handleFetchUserDetails(user)}
                            className="bg-slate-50 w-9 h-9 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center"
                        >
                            <ArrowUpRight size={18} />
                        </button>
                    </div>
                </div>
            ))}

            {filteredUsers.length === 0 && (
                <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                    <Search size={32} className="text-slate-100 mx-auto mb-3" />
                    <p className="text-slate-300 font-bold uppercase text-[9px] tracking-widest">No matching records found</p>
                </div>
            )}
        </div>
      </div>

      {/* Global Activity Stream */}
      <div>
        <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
             <Activity size={14} className="text-brand-600" /> Platform Stream
        </h3>
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-2 space-y-1">
                {globalActivities.slice(0, 10).map(act => (
                    <div key={act._id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300">
                            {act.userId?.profilePhoto ? <img src={act.userId.profilePhoto} alt="" className="w-full h-full object-cover" /> : (act.userId?.displayName?.charAt(0) || act.userId?.username?.charAt(0))}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[11px] font-black text-slate-800 leading-tight truncate">
                                    {act.userId?.displayName || act.userId?.username}
                                </p>
                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter shrink-0">{act.time}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{act.title}</p>
                            <p className="text-[9px] text-slate-400 font-medium truncate italic">{act.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                <button 
                    onClick={fetchGlobalActivities}
                    className="text-[9px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                >
                    Refresh Real-time Stream
                </button>
            </div>
        </div>
      </div>

      <div className="pb-10 pt-4">
          <button 
              onClick={() => {
                   fetchData();
                   fetchGlobalActivities();
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl shadow-slate-900/10"
          >
              <Clock size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronize All Matrices</span>
          </button>
      </div>

      {renderEditModal()}
      {renderUserEditModal()}
    </div>
  );

  function renderEditModal() {
    if (!isEditModalOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-slide-up p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black tracking-tighter">Plan Settings</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Target: {selectedUser?.username}
                  </p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-8">
                {['Free', 'Pro', 'Premium'].map(plan => (
                  <label 
                    key={plan}
                    className={`block p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        editingPlan === plan 
                        ? 'border-brand-500 bg-brand-50/50' 
                        : 'border-slate-50 bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="plan" 
                      value={plan} 
                      checked={editingPlan === plan}
                      onChange={(e) => setEditingPlan(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex justify-between items-center">
                        <div>
                            <p className={`font-black text-sm ${editingPlan === plan ? 'text-brand-700' : 'text-slate-700'}`}>{plan}</p>
                            <p className="text-[9px] text-slate-400 font-medium">
                                {plan === 'Free' ? '60 mins' : plan === 'Pro' ? '500 mins' : 'Unlimited'}
                            </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editingPlan === plan ? 'border-brand-500 bg-brand-500' : 'border-slate-200'}`}>
                            {editingPlan === plan && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdatePlan}
                  className="flex-1 py-3 bg-brand-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                >
                  Apply
                </button>
              </div>
          </div>
        </div>
    );
  }

  function renderUserEditModal() {
      if (!isUserEditModalOpen) return null;
      return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-slide-up p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-black tracking-tighter">Edit Identity</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      UID: {selectedUser?._id}
                    </p>
                  </div>
                  <button onClick={() => setIsUserEditModalOpen(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                    <div className="relative">
                        <UserCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                            type="text"
                            value={userEditData.displayName}
                            onChange={(e) => setUserEditData({...userEditData, displayName: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-12 text-sm font-black text-slate-900"
                        />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                            type="email"
                            value={userEditData.email}
                            onChange={(e) => setUserEditData({...userEditData, email: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-12 text-sm font-black text-slate-900"
                        />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Role</label>
                    <select 
                        value={userEditData.role}
                        onChange={(e) => setUserEditData({...userEditData, role: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-6 text-sm font-black text-slate-900 appearance-none"
                    >
                        <option value="user">Standard User</option>
                        <option value="admin">Super Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsUserEditModalOpen(false)}
                    className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateUserProfile}
                    className="flex-1 py-3 bg-brand-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                  >
                    Save Identity
                  </button>
                </div>
            </div>
          </div>
      );
  }
}
