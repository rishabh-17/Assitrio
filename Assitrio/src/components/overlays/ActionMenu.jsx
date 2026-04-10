import React from 'react';
import { Mic, AudioLines, Plus } from 'lucide-react';

export default function ActionMenu({ onClose, onSelect }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: 40, paddingLeft: 20, paddingRight: 20,
        fontFamily: 'system-ui,-apple-system,sans-serif',
      }}
      role="dialog"
      aria-label="Action menu"
    >
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} aria-label="Close menu" />

      <div style={{ width: '100%', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Listen */}
        <button
          onClick={() => onSelect('listen')}
          style={{
            width: '100%', padding: '20px 22px', borderRadius: 28,
            background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)',
            border: 'none', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 8px 28px rgba(109,91,250,0.45)',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Give Command
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f87171', display: 'inline-block' }} />
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 500 }}>Passive Offline Capture</p>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={24} />
          </div>
        </button>

        {/* Talk */}
        <button
          onClick={() => onSelect('talk')}
          style={{
            width: '100%', padding: '20px 22px', borderRadius: 28,
            backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
            cursor: 'pointer', color: '#f9fafb',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Talk to AI
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
            </h2>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0, fontWeight: 500 }}>Voice Chat with Memory</p>
          </div>
          <div style={{ backgroundColor: 'rgba(109,91,250,0.12)', padding: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
            <AudioLines size={24} />
          </div>
        </button>

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <button
            onClick={onClose}
            style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
            aria-label="Close action menu"
          >
            <Plus size={22} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}