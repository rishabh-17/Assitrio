import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, Link2, Bell, LogOut, HelpCircle, FileText, Camera, Pencil, Check, X, User, Mail, Phone, Zap, CreditCard, Trash2, RefreshCw, AlertCircle, Calendar, Cpu, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getUsageStats, syncGlobalConfig } from '../services/usageTracker';
import * as calendarService from '../services/calendarService';
import { userService } from '../services/apiService';

const dk = {
  root: { padding: '20px 16px 100px', backgroundColor: '#111111', minHeight: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' },
  title: { fontSize: 22, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', paddingTop: 24, marginBottom: 20 },
  profileCard: { display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#1a1a1a', borderRadius: 20, border: '1px solid #222', padding: '20px 16px', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #6d5bfa, #9b5de5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 17, fontWeight: 800, color: '#f9fafb', margin: '0 0 3px' },
  userSub: { fontSize: 11, color: '#4b5563', fontWeight: 600, margin: '0 0 8px' },
  progressWrap: { height: 4, backgroundColor: '#222', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  progressBar: (pct, warn) => ({ height: '100%', borderRadius: 99, background: warn ? '#ef4444' : 'linear-gradient(90deg,#6d5bfa,#9b5de5)', width: `${Math.max(2, pct)}%`, transition: 'width 0.4s' }),
  sectionLabel: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, paddingLeft: 4 },
  settingItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px', backgroundColor: '#1a1a1a', borderRadius: 14, border: '1px solid #222', marginBottom: 8, cursor: 'pointer', width: '100%', textAlign: 'left' },
  settingIcon: (bg) => ({ padding: 9, borderRadius: 10, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  settingTitle: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', marginBottom: 2 },
  settingSubtitle: { fontSize: 11, color: '#4b5563' },
  logoutBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 20 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: '#111111', zIndex: 120, display: 'flex', flexDirection: 'column' },
  overlayHeader: { backgroundColor: '#161616', padding: '40px 20px 14px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  overlayBack: { display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' },
  overlaySave: { display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg, #6d5bfa, #9b5de5)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer' },
  overlayBody: { flex: 1, overflowY: 'auto', padding: '20px 20px 40px' },
  inputLabel: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  input: { width: '100%', height: 46, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '0 14px', fontSize: 14, color: '#f3f4f6', fontWeight: 500, outline: 'none', boxSizing: 'border-box', marginBottom: 18 },
  toggle: (on) => ({ width: 44, height: 24, borderRadius: 99, position: 'relative', backgroundColor: on ? '#6d5bfa' : '#2a2a2a', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.2s' }),
  toggleKnob: (on) => ({ width: 18, height: 18, backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: on ? 22 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }),
  heroCard: { background: 'linear-gradient(135deg, #1a1030 0%, #0f0f1a 100%)', borderRadius: 24, padding: '24px', border: '1px solid rgba(109,91,250,0.2)', marginBottom: 20 },
  planCard: (active) => ({ backgroundColor: '#1a1a1a', borderRadius: 20, border: `2px solid ${active ? '#6d5bfa' : '#222'}`, padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }),
};

function Toggle({ value, onToggle }) {
  return (
    <button style={dk.toggle(value)} onClick={onToggle} role="switch" aria-checked={value}>
      <div style={dk.toggleKnob(value)} />
    </button>
  );
}

function SettingItem({ icon: Icon, iconBg, iconColor, title, subtitle, trailing, onClick }) {
  return (
    <button style={dk.settingItem} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={dk.settingIcon(iconBg)}><Icon size={17} style={{ color: iconColor }} /></div>
        <div style={{ minWidth: 0 }}>
          <p style={dk.settingTitle}>{title}</p>
          {subtitle && <p style={dk.settingSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {trailing || <ChevronRight size={15} style={{ color: '#2a2a2a', flexShrink: 0 }} />}
    </button>
  );
}

export default function Profile({ user, onLogout, deletedNotes = [], restoreNote, permanentlyDeleteNote, notesCount = 0 }) {
  const { updateProfile } = useAuth();
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [globalConfig, setGlobalConfig] = useState(null);
  const [googleCal, setGoogleCal] = useState(calendarService.isGoogleConnected());
  const [msCal, setMsCal] = useState(calendarService.isMicrosoftConnected());

  useEffect(() => { syncGlobalConfig().then(setGlobalConfig); }, []);

  const usage = useMemo(() => getUsageStats(user?.plan || 'Free'), [user, globalConfig]);

  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editMobile, setEditMobile] = useState(user?.mobile || '');
  const [editPhoto, setEditPhoto] = useState(user?.profilePhoto || '');
  const fileInputRef = useRef(null);

  const openEditProfile = () => { setEditName(user?.displayName || ''); setEditEmail(user?.email || ''); setEditMobile(user?.mobile || ''); setEditPhoto(user?.profilePhoto || ''); setShowEditProfile(true); };
  const handlePhotoUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setEditPhoto(ev.target.result); r.readAsDataURL(f); };
  const saveProfile = () => { updateProfile({ displayName: editName.trim() || user?.username, email: editEmail.trim(), mobile: editMobile.trim(), profilePhoto: editPhoto }); setShowEditProfile(false); };

  const initials = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();
  const isComplete = user?.email && user?.mobile && user?.displayName;

  return (
    <div style={dk.root}>
      <h1 style={dk.title}>Profile</h1>

      {/* Profile Card */}
      <div style={dk.profileCard}>
        <div style={dk.avatar}>
          {user?.profilePhoto ? <img src={user.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={dk.userName}>{user?.displayName || user?.username || 'User'}</h2>
          <p style={dk.userSub}>@{user?.username || 'user'} · {user?.plan || 'Free'} Plan</p>
          {user?.email && <p style={{ fontSize: 11, color: '#374151', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>}
          <div style={dk.progressWrap}><div style={dk.progressBar(usage.usagePercent, usage.usagePercent > 80)} /></div>
          <p style={{ fontSize: 10, color: '#4b5563', margin: 0 }}>{usage.minutesRemaining >= 9000 ? '∞' : usage.minutesRemaining} min remaining</p>
        </div>
      </div>

      {/* Edit Profile CTA */}
      <button onClick={openEditProfile} style={{ ...dk.settingItem, marginBottom: 24, borderColor: isComplete ? '#222' : 'rgba(109,91,250,0.25)', backgroundColor: isComplete ? '#1a1a1a' : 'rgba(109,91,250,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={dk.settingIcon(isComplete ? 'rgba(52,211,153,0.1)' : 'rgba(109,91,250,0.12)')}><Pencil size={17} style={{ color: isComplete ? '#34d399' : '#a78bfa' }} /></div>
          <div>
            <p style={{ ...dk.settingTitle, color: isComplete ? '#f3f4f6' : '#c4b5fd' }}>{isComplete ? 'Edit Profile' : 'Complete Your Profile'}</p>
            <p style={dk.settingSubtitle}>{isComplete ? 'Update name, email & photo' : 'Add photo, email & mobile'}</p>
          </div>
        </div>
        <ChevronRight size={15} style={{ color: '#2a2a2a' }} />
      </button>

      {/* Calendar */}
      <p style={dk.sectionLabel}>Calendar Integrations</p>
      <div style={{ marginBottom: 20 }}>
        <SettingItem icon={Link2} iconBg="rgba(109,91,250,0.1)" iconColor="#a78bfa" title="Connected Calendars" subtitle={`${googleCal ? '✓ Google' : ''} ${msCal ? '✓ Outlook' : ''} ${!googleCal && !msCal ? 'None connected' : ''}`.trim()} onClick={() => setShowIntegrations(!showIntegrations)} />
        {showIntegrations && (
          <div style={{ backgroundColor: '#161616', borderRadius: 14, border: '1px solid #1f1f1f', padding: 14, marginTop: 4 }}>
            {[{ label: 'Google Calendar', connected: googleCal, onConnect: async () => { try { await calendarService.connectGoogle(); setGoogleCal(true); } catch { } }, onDisconnect: () => { calendarService.disconnectGoogle(); setGoogleCal(false); }, color: '#34d399', glyph: <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg> },
            { label: 'Microsoft Outlook', connected: msCal, onConnect: async () => { try { await calendarService.connectMicrosoft(); setMsCal(true); } catch { } }, onDisconnect: () => { calendarService.disconnectMicrosoft(); setMsCal(false); }, color: '#60a5fa', glyph: <svg width="14" height="14" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg> }
            ].map(({ label, connected, onConnect, onDisconnect, color, glyph }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1f1f1f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, backgroundColor: '#1e1e1e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a2a2a' }}>{glyph}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', margin: '0 0 2px' }}>{label}</p>
                    <p style={{ fontSize: 10, color: '#4b5563', margin: 0 }}>{connected ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>
                <button onClick={connected ? onDisconnect : onConnect} style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: connected ? 'rgba(239,68,68,0.1)' : `rgba(${color === '#34d399' ? '52,211,153' : '96,165,250'},0.1)`, color: connected ? '#f87171' : color }}>
                  {connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription */}
      <p style={dk.sectionLabel}>Subscription & Billing</p>
      <div style={{ marginBottom: 20 }}>
        <SettingItem icon={Zap} iconBg="rgba(251,191,36,0.1)" iconColor="#fbbf24" title="Subscription & Plan" subtitle={`${usage.planName} · ${usage.totalMinutes}/${usage.minutesLimit >= 9000 ? '∞' : usage.minutesLimit} min`} onClick={() => setShowSubscription(true)} />
      </div>

      {/* Support */}
      <p style={dk.sectionLabel}>Support</p>
      <div style={{ marginBottom: 24 }}>
        <SettingItem icon={HelpCircle} iconBg="rgba(96,165,250,0.1)" iconColor="#60a5fa" title="Help & FAQ" subtitle="How Assistrio works" onClick={() => { }} />
        <SettingItem icon={FileText} iconBg="rgba(167,139,250,0.1)" iconColor="#a78bfa" title="Terms & Policies" subtitle="Privacy policy, terms of use" onClick={() => { }} />
      </div>

      {/* Logout */}
      <button style={dk.logoutBtn} onClick={onLogout}><LogOut size={17} /> Sign Out</button>

      <p style={{ textAlign: 'center', color: '#1f1f1f', fontSize: 10 }}>Assistrio v1.0.0 · Built for India</p>

      {/* Edit Profile Overlay */}
      {showEditProfile && (
        <div style={dk.overlay}>
          <div style={dk.overlayHeader}>
            <button style={dk.overlayBack} onClick={() => setShowEditProfile(false)}><ChevronLeft size={19} /> Back</button>
            <button style={dk.overlaySave} onClick={saveProfile}><Check size={15} /> Save</button>
          </div>
          <div style={dk.overlayBody}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', marginBottom: 28 }}>Edit Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
              <div style={{ position: 'relative' }}>
                {editPhoto ? <img src={editPhoto} alt="Profile" style={{ width: 88, height: 88, borderRadius: 24, objectFit: 'cover' }} /> : <div style={{ width: 88, height: 88, borderRadius: 24, background: 'linear-gradient(135deg,#6d5bfa,#9b5de5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>{initials}</div>}
                <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: -8, right: -8, backgroundColor: '#6d5bfa', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><Camera size={14} /></button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>
              {editPhoto && <button onClick={() => setEditPhoto('')} style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10 }}>Remove Photo</button>}
            </div>

            {[{ label: 'Display Name', icon: User, val: editName, set: setEditName, type: 'text', ph: 'Your name' }, { label: 'Email Address', icon: Mail, val: editEmail, set: setEditEmail, type: 'email', ph: 'your@email.com' }, { label: 'Mobile Number', icon: Phone, val: editMobile, set: setEditMobile, type: 'tel', ph: '+91 9876543210' }].map(({ label, icon: Icon, val, set, type, ph }) => (
              <div key={label}>
                <label style={dk.inputLabel}><Icon size={11} />{label}</label>
                <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={dk.input} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Overlay */}
      {showSubscription && (
        <div style={dk.overlay}>
          <div style={dk.overlayHeader}>
            <button style={dk.overlayBack} onClick={() => setShowSubscription(false)}><ChevronLeft size={19} /> Back</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f9fafb' }}>Plan Details</span>
            <div style={{ width: 60 }} />
          </div>
          <div style={dk.overlayBody}>
            <div style={dk.heroCard}>
              <span style={{ display: 'inline-block', backgroundColor: 'rgba(109,91,250,0.15)', color: '#a78bfa', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, marginBottom: 14, letterSpacing: '0.08em' }}>{usage.planName} Plan Active</span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb', margin: '0 0 4px' }}>Assistrio {usage.planName}</h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>{usage.minutesRemaining >= 9000 ? 'Unlimited session' : `${usage.minutesRemaining} min remaining`}</p>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600 }}>Usage This Month</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>{usage.totalMinutes} / {usage.minutesLimit >= 9000 ? '∞' : usage.minutesLimit} <span style={{ fontSize: 10, color: '#4b5563' }}>mins</span></span>
                </div>
                <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: usage.usagePercent > 80 ? '#ef4444' : 'linear-gradient(90deg,#6d5bfa,#9b5de5)', width: `${Math.max(2, usage.usagePercent)}%` }} />
                </div>
              </div>
            </div>

            <p style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Upgrade Tiers</p>
            {globalConfig?.plans?.map((plan) => (
              <div key={plan.name} style={dk.planCard(user?.plan === plan.name)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#f9fafb', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>{plan.name}</h4>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}><Cpu size={10} style={{ color: '#374151' }} />{plan.aiModel || 'GPT-4o'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb' }}>₹{plan.price || 0}</span>
                    <span style={{ fontSize: 11, color: '#4b5563', display: 'block' }}>/ month</span>
                  </div>
                </div>
                <div style={{ backgroundColor: '#111', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                  {plan.monthlyLimit >= 9000 ? 'Unlimited Processing' : `${plan.monthlyLimit} Minutes / Month`}
                </div>
                <button disabled={user?.plan === plan.name} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: user?.plan === plan.name ? 'default' : 'pointer', backgroundColor: user?.plan === plan.name ? '#222' : 'transparent', background: user?.plan === plan.name ? '#222' : 'linear-gradient(135deg,#6d5bfa,#9b5de5)', color: user?.plan === plan.name ? '#4b5563' : '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {user?.plan === plan.name ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}