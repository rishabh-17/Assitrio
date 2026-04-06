import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Link2,
  Globe,
  Shield,
  Bell,
  LogOut,
  HelpCircle,
  FileText,
  Lock,
  Camera,
  Pencil,
  Check,
  X,
  User,
  Mail,
  Phone,
  Zap,
  CreditCard,
  Trash2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getUsageStats, syncGlobalConfig } from '../services/usageTracker';
import * as calendarService from '../services/calendarService';
import { userService, paymentService } from '../services/apiService';

export default function Profile({ user, onLogout, deletedNotes = [], restoreNote, permanentlyDeleteNote, notesCount = 0 }) {
  const { updateProfile } = useAuth();
  const [privacyOn, setPrivacyOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showDeletedItems, setShowDeletedItems] = useState(false);
  const [showHelpFAQ, setShowHelpFAQ] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  
  // Dynamic Global Config
  const [globalConfig, setGlobalConfig] = useState(null);

  // Consent & Privacy persistent settings
  const [consentReminder, setConsentReminder] = useLocalStorage('assistrio_consent_reminder', true);
  const [autoDeleteRecordings, setAutoDeleteRecordings] = useLocalStorage('assistrio_auto_delete_recordings', false);
  const [anonymousAnalytics, setAnonymousAnalytics] = useLocalStorage('assistrio_anonymous_analytics', true);
  const [shareAIData, setShareAIData] = useLocalStorage('assistrio_share_ai_data', false);

  // Calendar integration state
  const [googleCal, setGoogleCal] = useState(calendarService.isGoogleConnected());
  const [msCal, setMsCal] = useState(calendarService.isMicrosoftConnected());
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    // Initial fetch of dynamic plans
    syncGlobalConfig().then(setGlobalConfig);
  }, []);

  // Load upcoming events when integrations panel is opened
  useEffect(() => {
    if (showIntegrations && (googleCal || msCal)) {
      calendarService.getAllUpcomingEvents(3).then(setUpcomingEvents).catch(() => { });
    }
  }, [showIntegrations, googleCal, msCal]);

  // Real usage stats
  const usage = useMemo(() => getUsageStats(user?.plan || 'Free'), [user, globalConfig]);

  // Edit profile state
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editMobile, setEditMobile] = useState(user?.mobile || '');
  const [editPhoto, setEditPhoto] = useState(user?.profilePhoto || '');
  const fileInputRef = useRef(null);

  const openEditProfile = () => {
    setEditName(user?.displayName || '');
    setEditEmail(user?.email || '');
    setEditMobile(user?.mobile || '');
    setEditPhoto(user?.profilePhoto || '');
    setShowEditProfile(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditPhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    updateProfile({
      displayName: editName.trim() || user?.username,
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      profilePhoto: editPhoto
    });
    setShowEditProfile(false);
  };

  const handleExportData = async () => {
    try {
      const data = await userService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assistrio-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleDeleteAllData = async () => {
    if (window.confirm('WARNING: This will permanently delete ALL your notes, tasks, and activity history. This action CANNOT be undone. Are you absolutely sure?')) {
      try {
        await userService.eraseAllData();
        window.location.reload(); 
      } catch (err) {
        console.error('Data erasure failed:', err);
        alert('Failed to erase data. Please try again.');
      }
    }
  };

  const Toggle = ({ value, onToggle, label }) => (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${value ? 'bg-brand-500' : 'bg-slate-200'
        }`}
    >
      <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] shadow-sm transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`} />
    </button>
  );

  const SettingsItem = ({ icon: Icon, iconBg, iconColor, title, subtitle, trailing, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer w-full text-left active:scale-[0.98]"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-[13px]">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {trailing || <ChevronRight size={16} className="text-slate-300 shrink-0" />}
    </button>
  );

  const initials = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();
  const isProfileComplete = user?.email && user?.mobile && user?.displayName;

  return (
    <div className="p-4 sm:p-6 animate-fade-in min-h-full">
      <h1 className="text-[24px] font-extrabold mb-6 pt-4 sm:pt-6 text-slate-900 tracking-tight">Profile</h1>

      {/* Profile Card */}
      <div className="flex items-center gap-4 mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative shrink-0">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt="Profile" className="w-16 h-16 rounded-2xl object-cover shadow-inner" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-extrabold shadow-inner">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-slate-900">{user?.displayName || user?.username || 'User'}</h2>
          <p className="text-slate-400 text-[12px] font-semibold mt-0.5">@{user?.username || 'user'} • {user?.plan || 'Free'} Plan</p>
          {user?.email && <p className="text-slate-400 text-[11px] mt-0.5 truncate">{user.email}</p>}
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${usage.usagePercent > 80 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.max(2, usage.usagePercent)}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{usage.minutesRemaining >= 9000 ? '∞' : usage.minutesRemaining} min remaining this month</p>
        </div>
      </div>

      {/* Complete Profile CTA */}
      <button
        onClick={openEditProfile}
        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 mb-6 transition-all active:scale-[0.98] ${isProfileComplete
            ? 'border-slate-100 bg-white hover:border-brand-200'
            : 'border-brand-200 bg-brand-50 hover:border-brand-400'
          }`}
      >
        <div className={`p-2 rounded-xl ${isProfileComplete ? 'bg-emerald-50' : 'bg-brand-100'}`}>
          <Pencil size={18} className={isProfileComplete ? 'text-emerald-500' : 'text-brand-600'} />
        </div>
        <div className="text-left flex-1">
          <p className={`font-bold text-[13px] ${isProfileComplete ? 'text-slate-700' : 'text-brand-700'}`}>
            {isProfileComplete ? 'Edit Profile' : 'Complete Your Profile'}
          </p>
          <p className="text-[11px] text-slate-400">
            {isProfileComplete ? 'Update name, email, photo & mobile' : 'Add photo, email & mobile number'}
          </p>
        </div>
        <ChevronRight size={16} className="text-slate-300" />
      </button>

      {/* Edit Profile Overlay */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-slate-50 z-[120] flex flex-col animate-slide-right">
          <div className="flex justify-center">
            <div className="w-full max-w-md flex flex-col h-screen">
              <div className="bg-white px-5 pt-10 pb-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex items-center gap-1 text-slate-500 font-bold text-[13px] hover:text-brand-600 transition-colors"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={saveProfile}
                  className="flex items-center gap-1 bg-brand-600 text-white text-[13px] font-bold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors"
                >
                  <Check size={16} /> Save
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-20 scrollbar-hide">
                <h2 className="text-xl font-extrabold text-slate-900 mb-6">Edit Profile</h2>

                <div className="flex flex-col items-center mb-8">
                  <div className="relative">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Profile" className="w-24 h-24 rounded-3xl object-cover shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                        {initials}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 bg-brand-600 text-white p-2 rounded-full shadow-lg hover:bg-brand-700 transition-colors"
                      aria-label="Upload photo"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  {editPhoto && (
                    <button
                      onClick={() => setEditPhoto('')}
                      className="text-[11px] text-red-400 font-semibold mt-3 hover:text-red-500"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="mb-5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <User size={12} /> Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                  />
                </div>

                <div className="mb-5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Mail size={12} /> Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                  />
                </div>

                <div className="mb-5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Phone size={12} /> Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-[14px] text-slate-800 font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 pl-1">Calendar Integrations</p>
      <div className="space-y-2.5 mb-6">
        <SettingsItem
          icon={Link2}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          title="Connected Calendars"
          subtitle={`${googleCal ? '✓ Google' : ''} ${msCal ? '✓ Outlook' : ''} ${!googleCal && !msCal ? 'None connected' : ''}`.trim()}
          onClick={() => setShowIntegrations(!showIntegrations)}
        />
        {showIntegrations && (
          <div className="bg-white rounded-2xl p-4 space-y-3 border border-slate-100 shadow-sm animate-slide-up">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-green-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Google Calendar</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{googleCal ? 'Connected — events sync automatically' : 'Connect to auto-schedule meetings'}</p>
                </div>
              </div>
              {googleCal ? (
                <button
                  onClick={() => { calendarService.disconnectGoogle(); setGoogleCal(false); }}
                  className="text-[11px] font-bold text-red-400 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await calendarService.connectGoogle();
                      setGoogleCal(true);
                    } catch (err) {
                      console.warn('Google Calendar connect failed:', err);
                    }
                  }}
                  className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200"
                >
                  Connect
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Microsoft Outlook</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{msCal ? 'Connected — events sync automatically' : 'Connect to auto-schedule meetings'}</p>
                </div>
              </div>
              {msCal ? (
                <button
                  onClick={() => { calendarService.disconnectMicrosoft(); setMsCal(false); }}
                  className="text-[11px] font-bold text-red-400 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await calendarService.connectMicrosoft();
                      setMsCal(true);
                    } catch (err) {
                      console.warn('Microsoft Calendar connect failed:', err);
                    }
                  }}
                  className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 pl-1">Subscription & Billing</p>
      <div className="space-y-2.5 mb-6">
        <SettingsItem
          icon={Zap}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Subscription & Plan"
          subtitle={`${usage.planName} Plan · ${usage.totalMinutes}/${usage.minutesLimit >= 9000 ? '∞' : usage.minutesLimit} min used`}
          onClick={() => setShowSubscription(true)}
        />
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 pl-1">Support</p>
      <div className="space-y-2.5 mb-8">
        <SettingsItem
          icon={HelpCircle}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title="Help & FAQ"
          subtitle="How Assistrio works"
          onClick={() => setShowHelpFAQ(true)}
        />
        <SettingsItem
          icon={FileText}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          title="Terms & Policies"
          subtitle="Privacy policy, terms of use"
          onClick={() => setShowTerms(true)}
        />
      </div>

      {/* Logout */}
      <div className="mb-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-red-100 text-red-500 font-bold text-[13px] hover:bg-red-50 hover:border-red-200 transition-all active:scale-[0.97]"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="text-[10px] text-slate-300 font-medium">Assistrio v1.0.0 • Built for India</p>
      </div>

      {/* Subscription Overlay */}
      {showSubscription && (
        <div className="fixed inset-0 bg-slate-50 z-[120] flex flex-col animate-slide-right">
          <div className="flex justify-center h-full">
            <div className="w-full max-w-md flex flex-col h-full bg-slate-50">
              <div className="bg-white px-5 pt-10 pb-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <button
                  onClick={() => setShowSubscription(false)}
                  className="flex items-center gap-1 text-slate-500 font-bold text-[13px] hover:text-brand-600 transition-colors"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <div className="text-[13px] font-extrabold text-slate-800">Plan Details</div>
                <div className="w-16" />
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-20 scrollbar-hide space-y-6">
                <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden">
                  <Zap className="absolute top-[-20px] right-[-20px] text-white/10 w-32 h-32" />
                  <div className="relative z-10">
                    <span className="bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 inline-block">
                      {usage.planName} Plan Active
                    </span>
                    <h2 className="text-2xl font-extrabold mb-1">Assistrio {usage.planName}</h2>
                    <p className="text-sm text-brand-100 font-medium mb-5">{usage.minutesRemaining >= 9000 ? 'Unlimited usage session' : `${usage.minutesRemaining} min remaining`}</p>

                    <div className="bg-black/20 rounded-2xl p-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold text-brand-50">Usage This Month</span>
                        <span className="text-sm font-bold">{usage.totalMinutes} / {usage.minutesLimit >= 9000 ? '∞' : usage.minutesLimit} <span className="text-[10px] font-medium text-brand-200">mins</span></span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${usage.usagePercent > 80 ? 'bg-red-400' : usage.usagePercent > 50 ? 'bg-emerald-400' : 'bg-brand-300'
                          }`} style={{ width: `${Math.max(2, usage.usagePercent)}%` }} />
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-brand-200">
                        <span>{usage.listenMinutes}m command · {usage.talkMinutes}m talk</span>
                        <span>{usage.totalSessions} sessions</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-4 flex items-center justify-between">
                    Upgrade Tiers
                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg">LIVE PLANS</span>
                  </h3>

                  <div className="space-y-4">
                    {globalConfig?.plans?.map((plan) => (
                      <div 
                        key={plan.name}
                        className={`bg-white rounded-[28px] border-2 p-6 shadow-sm transition-all relative overflow-hidden ${
                          user?.plan === plan.name ? 'border-brand-500 ring-2 ring-brand-50 shadow-brand-100' : 'border-slate-100 hover:border-brand-200'
                        }`}
                      >
                        {plan.name === 'Premium' && (
                          <div className="absolute top-0 right-0 bg-brand-600 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-[0.2em]">
                            Foundry Elite
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">{plan.name}</h4>
                                {user?.plan === plan.name && <CheckCircle2 size={16} className="text-emerald-500" />}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                               <Cpu size={12} className="text-slate-300" /> {plan.aiModel || 'GPT-4o'} Powered
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-slate-900">₹{plan.price || 0}</span>
                            <span className="text-xs text-slate-400 font-medium block">/ month</span>
                          </div>
                        </div>

                        <div className="space-y-3 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                            <div className="flex items-center gap-3 text-[12px] text-slate-600 font-bold">
                                <Zap size={14} className="text-brand-600" />
                                {plan.monthlyLimit >= 9000 ? 'Unlimited Processing' : `${plan.monthlyLimit} Minutes / Month`}
                            </div>
                            <div className="flex items-center gap-3 text-[12px] text-slate-600 font-bold">
                                <MessageCircle size={14} className="text-brand-600" />
                                Custom Support Channels
                            </div>
                            <div className="flex items-center gap-3 text-[12px] text-slate-600 font-bold">
                                <FileSpreadsheet size={14} className="text-brand-600" />
                                Enterprise Data Export
                            </div>
                        </div>

                        <button 
                          disabled={user?.plan === plan.name}
                          className={`w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${
                            user?.plan === plan.name 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 active:scale-95'
                          }`}
                        >
                          {user?.plan === plan.name ? 'Active Core' : `Upgrade to ${plan.name}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2({ size, className }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function MessageCircle({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
        </svg>
    )
}

function FileSpreadsheet({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 13h2"/>
            <path d="M14 13h2"/>
            <path d="M8 17h2"/>
            <path d="M14 17h2"/>
        </svg>
    )
}
