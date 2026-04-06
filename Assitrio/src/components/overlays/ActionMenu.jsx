import React from 'react';
import { Mic, AudioLines, Plus } from 'lucide-react';

export default function ActionMenu({ onClose, onSelect }) {
  return (
    <div
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-end pb-10 px-5 animate-fade-in"
      role="dialog"
      aria-label="Action menu"
    >
      {/* Backdrop close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className="w-full space-y-3 z-10 animate-slide-from-bottom-8">
        {/* Listen */}
        <button
          onClick={() => onSelect('listen')}
          className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white p-5 rounded-[28px] flex items-center justify-between shadow-xl hover:from-brand-700 hover:to-brand-800 transition-all active:scale-[0.97] group"
        >
          <div className="text-left">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              Give Command
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            </h2>
            <p className="text-brand-200 text-[12px] mt-1 font-medium">Passive Offline Capture</p>
          </div>
          <div className="bg-white/15 p-3.5 rounded-full group-active:scale-90 transition-transform">
            <Mic size={24} />
          </div>
        </button>

        {/* Talk */}
        <button
          onClick={() => onSelect('talk')}
          className="w-full bg-white text-slate-900 p-5 rounded-[28px] flex items-center justify-between shadow-xl hover:bg-slate-50 transition-all active:scale-[0.97] group"
        >
          <div className="text-left">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              Talk to AI
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-slate-400 text-[12px] mt-1 font-medium">Voice Chat with Memory</p>
          </div>
          <div className="bg-slate-100 p-3.5 rounded-full text-brand-600 group-active:scale-90 transition-transform">
            <AudioLines size={24} />
          </div>
        </button>

        {/* Close */}
        <div className="flex justify-center pt-3">
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md hover:bg-white/30 transition-colors"
            aria-label="Close action menu"
          >
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
