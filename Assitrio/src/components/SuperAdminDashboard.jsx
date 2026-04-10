import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/apiService';
import { Users, ShieldCheck, Zap, Trash2, Search, Clock, CheckCircle2, AlertCircle, X, ChevronLeft, Archive, Activity, ArrowUpRight, User as UserIcon, TrendingUp, Database, Edit2, Mail, UserCircle } from 'lucide-react';

const PLAN_COLORS = { Free: { bg: 'rgba(100,116,139,0.1)', text: '#6b7280', border: 'rgba(100,116,139,0.2)' }, Pro: { bg: 'rgba(109,91,250,0.1)', text: '#a78bfa', border: 'rgba(109,91,250,0.2)' }, Premium: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' } };

const dk = {
  root: { padding: '16px 16px 100px', backgroundColor: '#111111', minHeight: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' },
  searchCard: { backgroundColor: '#1a1a1a', borderRadius: 24, border: '1px solid #222', padding: '22px 18px', marginBottom: 20, position: 'relative', overflow: 'hidden' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  statBox: { backgroundColor: '#161616', border: '1px solid #1f1f1f', borderRadius: 14, padding: '14px 12px' },
  statMeta: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 8, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' },
  statNum: { fontSize: 20, fontWeight: 800, color: '#f9fafb' },
  searchInput: { width: '100%', backgroundColor: '#161616', border: '1px solid #1f1f1f', borderRadius: 12, padding: '12px 14px 12px 42px', fontSize: 13, fontWeight: 600, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' },
  searchIconAbs: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userCard: { backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  userAvatar: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#161616', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', fontSize: 16, fontWeight: 800, color: '#374151' },
  planBadge: (plan) => ({ ...PLAN_COLORS[plan] || PLAN_COLORS.Free, display: 'inline-block', fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 6, border: `1px solid ${(PLAN_COLORS[plan] || PLAN_COLORS.Free).border}`, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: (PLAN_COLORS[plan] || PLAN_COLORS.Free).bg }),
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161616', border: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4b5563', flexShrink: 0 },
  streamCard: { backgroundColor: '#1a1a1a', borderRadius: 20, border: '1px solid #222', overflow: 'hidden', marginBottom: 8 },
  streamItem: { display: 'flex', gap: 12, padding: '12px 14px', borderBottom: '1px solid #1a1a1a' },
  syncBtn: { width: '100%', padding: '14px', backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 16, color: '#a78bfa', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' },
  modal: { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' },
  modalBox: { backgroundColor: '#161616', width: '100%', maxWidth: 360, borderRadius: 24, border: '1px solid #222', padding: '28px 24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' },
  modalInput: { width: '100%', backgroundColor: '#111', border: '1px solid #222', borderRadius: 12, padding: '11px 14px 11px 40px', fontSize: 13, fontWeight: 600, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' },
  radioCard: (sel) => ({ display: 'block', padding: '14px', borderRadius: 14, border: `2px solid ${sel ? '#6d5bfa' : '#222'}`, backgroundColor: sel ? 'rgba(109,91,250,0.06)' : '#111', cursor: 'pointer', marginBottom: 8 }),
  cancelBtn: { flex: 1, padding: '12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' },
  applyBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#6d5bfa,#9b5de5)', color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(109,91,250,0.3)' },
};

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [globalActivities, setGlobalActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState('');
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [userEditData, setUserEditData] = useState({ displayName: '', email: '', role: 'user' });
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => { fetchData(); fetchGlobalActivities(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { const [u, s] = await Promise.all([adminService.getAllUsers(), adminService.getStats()]); setUsers(Array.isArray(u) ? u : []); setStats(s); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchGlobalActivities = async () => { try { setGlobalActivities(await adminService.getGlobalActivities()); } catch { } };
  const handleFetchUserDetails = async (user) => { try { setDetailUser(await adminService.getUserDetails(user._id)); } catch { alert('Failed to fetch user history'); } };
  const handleUpdatePlan = async () => { if (!selectedUser || !editingPlan) return; try { await adminService.updateUserPlan(selectedUser._id, editingPlan); setIsEditModalOpen(false); fetchData(); if (detailUser?.user._id === selectedUser._id) setDetailUser(p => ({ ...p, user: { ...p.user, plan: editingPlan } })); } catch { alert('Failed to update plan'); } };
  const handleUpdateUserProfile = async () => { if (!selectedUser) return; try { await adminService.updateUser({ userId: selectedUser._id, ...userEditData }); setIsUserEditModalOpen(false); fetchData(); if (detailUser?.user._id === selectedUser._id) setDetailUser(p => ({ ...p, user: { ...p.user, ...userEditData } })); } catch { alert('Failed to update user'); } };
  const handleDeleteUser = async (userId) => { if (!window.confirm('Delete this user? This cannot be undone.')) return; try { await adminService.deleteUser(userId); if (detailUser?.user._id === userId) setDetailUser(null); fetchData(); } catch { alert('Failed to delete user'); } };

  const filteredUsers = useMemo(() => (Array.isArray(users) ? users : []).filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);

  if (loading && !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', backgroundColor: '#111111', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #222', borderTopColor: '#8b5cf6', borderRadius: '50%' }} />
      <p style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fetching System State</p>
    </div>
  );

  if (detailUser) {
    const { user, notes, activities } = detailUser;
    const totalMins = Math.round(((user.usage?.listenSeconds || 0) + (user.usage?.talkSeconds || 0)) / 60);
    return (
      <div style={dk.root}>
        <button onClick={() => setDetailUser(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, paddingTop: 24 }}>
          <ChevronLeft size={15} /> Back to Directory
        </button>

        <div style={{ ...dk.searchCard, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <button onClick={() => { setSelectedUser(user); setUserEditData({ displayName: user.displayName || '', email: user.email || '', role: user.role || 'user' }); setIsUserEditModalOpen(true); }} style={{ ...dk.actionBtn, backgroundColor: 'transparent' }}><Edit2 size={15} /></button>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: '#161616', border: '3px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', overflow: 'hidden' }}>
            {user.profilePhoto ? <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={28} style={{ color: '#374151' }} />}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', margin: '0 0 8px' }}>{user.displayName || user.username}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span style={dk.planBadge(user.plan)}>{user.plan || 'FREE'}</span>
            <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 700 }}>@{user.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11, color: '#4b5563', fontWeight: 600, marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} style={{ color: '#8b5cf6' }} />{user.email || 'No email'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} style={{ color: '#8b5cf6' }} />{user.role === 'admin' ? 'Super Admin' : 'Standard'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[{ label: 'Consumption', val: `${totalMins}m` }, { label: 'Memories', val: notes.length }].map(({ label, val }) => (
              <div key={label} style={dk.statBox}><p style={{ ...dk.statMeta, justifyContent: 'center' }}>{label}</p><p style={{ ...dk.statNum, textAlign: 'center' }}>{val}</p></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setSelectedUser(user); setEditingPlan(user.plan || 'Free'); setIsEditModalOpen(true); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#6d5bfa,#9b5de5)', color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12, border: 'none', cursor: 'pointer' }}>Adjust Plan</button>
            <button onClick={() => handleDeleteUser(user._id)} style={{ flex: 1, padding: '12px', backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Delete</button>
          </div>
        </div>

        <p style={{ ...dk.sectionLabel, marginBottom: 10 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Archive size={12} style={{ color: '#8b5cf6' }} />Recent Memories</span></p>
        <div style={{ marginBottom: 20 }}>
          {notes.slice(0, 5).map(note => (
            <div key={note._id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{note.title}</h4>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#8b5cf6', backgroundColor: 'rgba(109,91,250,0.1)', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>{note.date}</span>
              </div>
              <p style={{ fontSize: 11, color: '#4b5563', margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.summary}</p>
            </div>
          ))}
          {notes.length === 0 && <p style={{ fontSize: 10, color: '#2a2a2a', fontWeight: 700, textAlign: 'center', padding: '16px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No records found</p>}
        </div>

        <p style={{ ...dk.sectionLabel, marginBottom: 10 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={12} style={{ color: '#8b5cf6' }} />Activity Stream</span></p>
        <div style={dk.streamCard}>
          {activities.slice(0, 5).map(act => (
            <div key={act._id} style={dk.streamItem}>
              <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={11} style={{ color: '#374151' }} /></div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f3f4f6', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</p>
                <p style={{ fontSize: 10, color: '#4b5563', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {renderEditModal()}
        {renderUserEditModal()}
      </div>
    );
  }

  return (
    <div style={dk.root}>
      <div style={{ paddingTop: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Administrative Matrix</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', margin: 0 }}>Nexus <span style={{ color: '#8b5cf6' }}>Core</span></h1>
      </div>

      <div style={dk.statsGrid}>
        {[
          { icon: Users, color: '#8b5cf6', label: 'Total Clients', val: stats?.totalUsers || 0 },
          { icon: TrendingUp, color: '#34d399', label: 'Total Revenue', val: `₹${stats?.totalRevenue || 0}` },
          { icon: Database, color: '#60a5fa', label: 'Total Memories', val: stats?.totalNotes || 0 },
          { icon: Zap, color: '#fbbf24', label: 'Mins Consumed', val: `${stats?.totalMinutesUsed || 0}m` },
        ].map(({ icon: Icon, color, label, val }) => (
          <div key={label} style={dk.statBox}>
            <div style={dk.statMeta}><Icon size={11} style={{ color }} />{label}</div>
            <p style={dk.statNum}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={17} style={dk.searchIconAbs} />
        <input type="text" placeholder="Locate user profile..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={dk.searchInput} />
      </div>

      <p style={dk.sectionLabel}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserIcon size={12} style={{ color: '#8b5cf6' }} />User Directory</span><span style={{ color: '#2a2a2a' }}>{filteredUsers.length} Results</span></p>
      <div style={{ marginBottom: 24 }}>
        {filteredUsers.map(user => (
          <div key={user._id} style={dk.userCard}>
            <div style={dk.userAvatar}>{user.profilePhoto ? <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.displayName?.charAt(0) || user.username?.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#f3f4f6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || user.username}</h3>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: user.plan === 'Premium' ? '#f59e0b' : user.plan === 'Pro' ? '#8b5cf6' : '#374151', flexShrink: 0 }} />
              </div>
              <span style={dk.planBadge(user.plan)}>{user.plan || 'FREE'}</span>
            </div>
            <button style={dk.actionBtn} onClick={() => handleFetchUserDetails(user)}><ArrowUpRight size={17} /></button>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', backgroundColor: '#1a1a1a', borderRadius: 20, border: '2px dashed #222' }}>
            <Search size={28} style={{ color: '#222', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 9, color: '#2a2a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>No matching records</p>
          </div>
        )}
      </div>

      <p style={{ ...dk.sectionLabel, marginBottom: 10 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={12} style={{ color: '#8b5cf6' }} />Platform Stream</span></p>
      <div style={{ ...dk.streamCard, marginBottom: 20 }}>
        {globalActivities.slice(0, 10).map(act => (
          <div key={act._id} style={dk.streamItem}>
            <div style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #1f1f1f', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#374151', overflow: 'hidden' }}>
              {act.userId?.profilePhoto ? <img src={act.userId.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (act.userId?.displayName?.charAt(0) || act.userId?.username?.charAt(0))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#f3f4f6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.userId?.displayName || act.userId?.username}</p>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#374151', textTransform: 'uppercase', flexShrink: 0, marginLeft: 8 }}>{act.time}</span>
              </div>
              <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</p>
              <p style={{ fontSize: 9, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{act.sub}</p>
            </div>
          </div>
        ))}
        <div style={{ padding: '12px', backgroundColor: '#161616', borderTop: '1px solid #1f1f1f', textAlign: 'center' }}>
          <button onClick={fetchGlobalActivities} style={{ fontSize: 9, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer' }}>Refresh Stream</button>
        </div>
      </div>

      <button style={dk.syncBtn} onClick={() => { fetchData(); fetchGlobalActivities(); }}>
        <Clock size={15} /> Synchronize All Matrices
      </button>

      {renderEditModal()}
      {renderUserEditModal()}
    </div>
  );

  function renderEditModal() {
    if (!isEditModalOpen) return null;
    return (
      <div style={dk.modal}>
        <div style={dk.modalBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', margin: '0 0 4px' }}>Plan Settings</h2>
              <p style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Target: {selectedUser?.username}</p>
            </div>
            <button onClick={() => setIsEditModalOpen(false)} style={{ ...dk.actionBtn, border: 'none', backgroundColor: '#222' }}><X size={16} /></button>
          </div>
          {['Free', 'Pro', 'Premium'].map(plan => (
            <label key={plan} style={dk.radioCard(editingPlan === plan)}>
              <input type="radio" name="plan" value={plan} checked={editingPlan === plan} onChange={(e) => setEditingPlan(e.target.value)} style={{ display: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: editingPlan === plan ? '#a78bfa' : '#9ca3af', margin: '0 0 2px' }}>{plan}</p>
                  <p style={{ fontSize: 9, color: '#4b5563', margin: 0 }}>{plan === 'Free' ? '60 mins' : plan === 'Pro' ? '500 mins' : 'Unlimited'}</p>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${editingPlan === plan ? '#6d5bfa' : '#2a2a2a'}`, backgroundColor: editingPlan === plan ? '#6d5bfa' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingPlan === plan && <div style={{ width: 6, height: 6, backgroundColor: '#fff', borderRadius: '50%' }} />}
                </div>
              </div>
            </label>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setIsEditModalOpen(false)} style={dk.cancelBtn}>Cancel</button>
            <button onClick={handleUpdatePlan} style={dk.applyBtn}>Apply</button>
          </div>
        </div>
      </div>
    );
  }

  function renderUserEditModal() {
    if (!isUserEditModalOpen) return null;
    return (
      <div style={dk.modal}>
        <div style={dk.modalBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', margin: '0 0 4px' }}>Edit Identity</h2>
              <p style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>UID: {selectedUser?._id}</p>
            </div>
            <button onClick={() => setIsUserEditModalOpen(false)} style={{ ...dk.actionBtn, border: 'none', backgroundColor: '#222' }}><X size={16} /></button>
          </div>
          {[{ label: 'Display Name', icon: UserCircle, val: userEditData.displayName, key: 'displayName', type: 'text' }, { label: 'Email Address', icon: Mail, val: userEditData.email, key: 'email', type: 'email' }].map(({ label, icon: Icon, val, key, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</p>
              <div style={{ position: 'relative' }}>
                <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                <input type={type} value={val} onChange={(e) => setUserEditData({ ...userEditData, [key]: e.target.value })} style={dk.modalInput} />
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Platform Role</p>
            <select value={userEditData.role} onChange={(e) => setUserEditData({ ...userEditData, role: e.target.value })} style={{ ...dk.modalInput, paddingLeft: 14, appearance: 'none' }}>
              <option value="user">Standard User</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setIsUserEditModalOpen(false)} style={dk.cancelBtn}>Cancel</button>
            <button onClick={handleUpdateUserProfile} style={dk.applyBtn}>Save Identity</button>
          </div>
        </div>
      </div>
    );
  }
}