import React from 'react';
import { Home, LayoutGrid, MessageSquare, User, Mic, History, ShieldCheck, Settings } from 'lucide-react';

export default function BottomNav({ currentTab, onTabChange, onActionClick, userRole = 'user' }) {
  if (userRole === 'admin') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 px-6 pointer-events-none">
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 flex items-center justify-around pointer-events-auto">
          <NavButton 
            active={currentTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')} 
            icon={<ShieldCheck size={20} />} 
            label="Nexus" 
          />
          <NavButton 
            active={currentTab === 'transactions'} 
            onClick={() => onTabChange('transactions')} 
            icon={<History size={20} />} 
            label="Ledger" 
          />
          <NavButton 
            active={currentTab === 'management'} 
            onClick={() => onTabChange('management')} 
            icon={<Settings size={20} />} 
            label="Manage" 
          />
          <NavButton 
            active={currentTab === 'profile'} 
            onClick={() => onTabChange('profile')} 
            icon={<User size={20} />} 
            label="Admin" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 px-6 pointer-events-none">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center justify-around flex-1">
          <NavButton 
            active={currentTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')} 
            icon={<Home size={20} />} 
            label="Home" 
          />
          <NavButton 
            active={currentTab === 'locker'} 
            onClick={() => onTabChange('locker')} 
            icon={<LayoutGrid size={20} />} 
            label="Locker" 
          />
        </div>

        {/* Floating Action Button for regular users */}
        <button
          onClick={onActionClick}
          className="relative -top-1 w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)] active:scale-90 transition-all hover:bg-brand-700 mx-2 ring-4 ring-white"
        >
          <Mic size={24} fill="currentColor" />
        </button>

        <div className="flex items-center justify-around flex-1">
          <NavButton 
            active={currentTab === 'activity'} 
            onClick={() => onTabChange('activity')} 
            icon={<MessageSquare size={20} />} 
            label="Activity" 
          />
          <NavButton 
            active={currentTab === 'profile'} 
            onClick={() => onTabChange('profile')} 
            icon={<User size={20} />} 
            label="Profile" 
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 ${
        active 
          ? 'text-brand-600 bg-brand-50/50' 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
  );
}
