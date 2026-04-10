import React from 'react';
import { Home, LayoutGrid, MessageSquare, User, Mic, History, ShieldCheck, Settings } from 'lucide-react';

export default function BottomNav({ currentTab, onTabChange, onActionClick, userRole = 'user' }) {
  const navStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: 28,
    paddingLeft: 24,
    paddingRight: 24,
    pointerEvents: 'none',
  };

  const pillStyle = {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(20,20,20,0.92)',
    backdropFilter: 'blur(20px)',
    borderRadius: 32,
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    pointerEvents: 'auto',
  };

  if (userRole === 'admin') {
    return (
      <div style={navStyle}>
        <div style={pillStyle}>
          <NavButton active={currentTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<ShieldCheck size={20} />} label="Nexus" />
          <NavButton active={currentTab === 'transactions'} onClick={() => onTabChange('transactions')} icon={<History size={20} />} label="Ledger" />
          <NavButton active={currentTab === 'management'} onClick={() => onTabChange('management')} icon={<Settings size={20} />} label="Manage" />
          <NavButton active={currentTab === 'profile'} onClick={() => onTabChange('profile')} icon={<User size={20} />} label="Admin" />
        </div>
      </div>
    );
  }

  return (
    <div style={navStyle}>
      <div style={{ ...pillStyle, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
          <NavButton active={currentTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<Home size={20} />} label="Home" />
          <NavButton active={currentTab === 'locker'} onClick={() => onTabChange('locker')} icon={<LayoutGrid size={20} />} label="Locker" />
        </div>

        {/* FAB */}
        <button
          onClick={onActionClick}
          style={{
            position: 'relative',
            top: -4,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(109,91,250,0.5)',
            border: '3px solid #111111',
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: 8,
            marginRight: 8,
          }}
        >
          <Mic size={22} fill="currentColor" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
          <NavButton active={currentTab === 'activity'} onClick={() => onTabChange('activity')} icon={<MessageSquare size={20} />} label="Activity" />
          <NavButton active={currentTab === 'profile'} onClick={() => onTabChange('profile')} icon={<User size={20} />} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 14px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: active ? 'rgba(109,91,250,0.15)' : 'transparent',
        color: active ? '#a78bfa' : '#4b5563',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{label}</span>
    </button>
  );
}