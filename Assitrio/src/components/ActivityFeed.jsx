import React, { useState, useMemo } from 'react';
import { Search, Mic, Calendar, Shield, CheckCircle2, X, Clock, Archive, Zap, AlertTriangle } from 'lucide-react';
import * as chrono from 'chrono-node';
import LiveTimer from './LiveTimer';

export default function ActivityFeed({ activities = [], notes = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  /* ── Upcoming Events: scan all note tasks with dates ── */
  const upcomingEvents = useMemo(() => {
    const events = [];
    notes.forEach(n => {
      (n.tasks || []).forEach(t => {
        if (t.date) {
          const creationDate = new Date(`${n.date} ${n.time}`);
          const parsed = chrono.parse(t.date, isNaN(creationDate) ? new Date() : creationDate);
          const targetDateObj = parsed.length > 0 ? parsed[0].start.date() : null;

          // Format time from targetDateObj if available, else note time
          let displayTime = n.time || '';
          if (targetDateObj) {
            displayTime = targetDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          }

          events.push({
            id: t.id || `${n.id}-${Math.random()}`,
            time: displayTime,
            title: t.text || 'Untitled task',
            sub: t.date,
            icon: 'calendar',
            noteTitle: n.title || 'Unknown meeting',
            created: isNaN(creationDate) ? Date.now() : creationDate.getTime(),
            targetDateObj,
            isDone: !!t.done,
            priority: t.priority || 'Normal',
          });
        }
      });
    });
    return events.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      if (a.targetDateObj && b.targetDateObj) return a.targetDateObj - b.targetDateObj;
      if (a.targetDateObj) return -1;
      if (b.targetDateObj) return 1;
      return b.created - a.created;
    });
  }, [notes]);

  /* ── Filter logic ── */
  const sourceList = activeTab === 'activity' ? activities : upcomingEvents;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return sourceList;
    const q = searchQuery.toLowerCase();
    return sourceList.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.sub || '').toLowerCase().includes(q) ||
      (a.noteTitle || '').toLowerCase().includes(q)
    );
  }, [sourceList, searchQuery]);

  /* ── Icon for activity log ── */
  const getActivityIcon = (iconType) => {
    switch (iconType) {
      case 'mic': return <Mic size={13} style={{ color: '#a78bfa' }} />;
      case 'calendar': return <Calendar size={13} style={{ color: '#60a5fa' }} />;
      case 'shield': return <Shield size={13} style={{ color: '#34d399' }} />;
      case 'task': return <CheckCircle2 size={13} style={{ color: '#fbbf24' }} />;
      case 'archive': return <Archive size={13} style={{ color: '#9ca3af' }} />;
      default: return <Zap size={13} style={{ color: '#a78bfa' }} />;
    }
  };

  const displayTime = (act) => {
    if (act?.time) return act.time;
    const raw = act?.createdAt || act?.created;
    if (!raw) return 'Recent';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return 'Recent';
    try {
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recent';
    }
  };

  const priorityColor = (p) => {
    if (p === 'Critical') return '#ef4444';
    if (p === 'Important') return '#f59e0b';
    return '#60a5fa';
  };

  /* ── Styles ── */
  const s = {
    root: { minHeight: '100%', backgroundColor: '#111111', padding: '20px 16px 120px', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 24 },
    title: { fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 },
    searchBtn: { width: 38, height: 38, borderRadius: '50%', backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    tabRow: { display: 'flex', gap: 8, marginBottom: 20, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 4 },
    tabActive: { flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)', color: '#ffffff', boxShadow: '0 2px 8px rgba(109,91,250,0.4)' },
    tabInactive: { flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'transparent', color: '#6b7280' },
    searchBar: { display: 'flex', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 14, border: '1px solid #2a2a2a', padding: '10px 14px', marginBottom: 16, gap: 10 },
    searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#e5e7eb' },
    emptyBox: { backgroundColor: '#1a1a1a', borderRadius: 18, border: '1px solid #222', padding: '48px 24px', textAlign: 'center', marginTop: 8 },
    // Activity log timeline
    timeline: { position: 'relative', marginLeft: 14 },
    timelineLine: { position: 'absolute', left: 0, top: 10, bottom: 0, width: 1, backgroundColor: '#2a2a2a' },
    item: { position: 'relative', paddingLeft: 28, marginBottom: 18 },
    dot: { position: 'absolute', left: 0, top: 6, width: 9, height: 9, borderRadius: '50%', border: '2px solid #3a3a3a', backgroundColor: '#111111', transform: 'translateX(-50%)', zIndex: 10 },
    itemMeta: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 },
    itemTime: { fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' },
    actCard: { backgroundColor: '#1a1a1a', borderRadius: 14, border: '1px solid #222', padding: '12px 14px' },
    actCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 },
    actCardTitle: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.4, margin: 0 },
    actCardSub: { fontSize: 11, color: '#6b7280', margin: 0 },
    // Event cards
    eventCard: (isDone) => ({
      backgroundColor: '#1a1a1a',
      borderRadius: 18,
      border: `1px solid ${isDone ? '#222' : '#2a2a2a'}`,
      padding: 16,
      marginBottom: 12,
      opacity: isDone ? 0.55 : 1,
    }),
    eventHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
    eventTitle: (isDone) => ({ fontSize: 14, fontWeight: 700, color: isDone ? '#6b7280' : '#f3f4f6', lineHeight: 1.4, margin: 0, textDecoration: isDone ? 'line-through' : 'none', flex: 1 }),
    eventMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    eventMetaLeft: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    chip: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }),
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>{activeTab === 'activity' ? 'Activity Log' : 'Upcoming Events'}</h1>
        <button
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
          style={s.searchBtn}
          aria-label="Toggle search"
        >
          {showSearch ? <X size={16} /> : <Search size={16} />}
        </button>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        <button onClick={() => setActiveTab('activity')} style={activeTab === 'activity' ? s.tabActive : s.tabInactive}>
          Activity Log
        </button>
        <button onClick={() => setActiveTab('events')} style={activeTab === 'events' ? s.tabActive : s.tabInactive}>
          Upcoming Events
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={s.searchBar}>
          <Search size={15} style={{ color: '#4b5563', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'activity' ? 'Search logs...' : 'Search events...'}
            style={s.searchInput}
            autoFocus
          />
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ── */}
      {activeTab === 'activity' && (
        filteredList.length === 0 ? (
          <div style={s.emptyBox}>
            <Zap size={28} style={{ color: '#374151', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>No activity yet</p>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Actions like recordings, tasks and notes will appear here.</p>
          </div>
        ) : (
          <div style={s.timeline}>
            <div style={s.timelineLine} />
            {filteredList.map(act => (
              <div key={act.id} style={s.item}>
                <div style={s.dot} />
                <div style={s.itemMeta}>
                  <span style={s.itemTime}>{displayTime(act)}</span>
                  {getActivityIcon(act.icon)}
                </div>
                <div style={s.actCard}>
                  <div style={s.actCardTop}>
                    <p style={s.actCardTitle}>{act.title}</p>
                  </div>
                  {act.sub && <p style={s.actCardSub}>{act.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── UPCOMING EVENTS TAB ── */}
      {activeTab === 'events' && (
        filteredList.length === 0 ? (
          <div style={s.emptyBox}>
            <Calendar size={28} style={{ color: '#374151', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>No upcoming events</p>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Tasks with a due date from your recordings will appear here.</p>
          </div>
        ) : (
          <div>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, border: '1px solid #222', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>
                {filteredList.filter(e => !e.isDone).length} pending
              </div>
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, border: '1px solid #222', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#34d399' }}>
                {filteredList.filter(e => e.isDone).length} done
              </div>
            </div>

            {filteredList.map(evt => (
              <div key={evt.id} style={s.eventCard(evt.isDone)}>
                {/* Title row with timer */}
                <div style={s.eventHeader}>
                  <p style={s.eventTitle(evt.isDone)}>{evt.title}</p>
                  <LiveTimer targetDate={evt.targetDateObj} isDone={evt.isDone} />
                </div>

                {/* Meta row */}
                <div style={s.eventMeta}>
                  <div style={s.eventMetaLeft}>
                    {/* Priority chip */}
                    <span style={s.chip(
                      `${priorityColor(evt.priority)}18`,
                      priorityColor(evt.priority),
                      `${priorityColor(evt.priority)}30`
                    )}>
                      {evt.priority}
                    </span>

                    {/* Date chip */}
                    <span style={s.chip('rgba(96,165,250,0.1)', '#60a5fa', 'rgba(96,165,250,0.2)')}>
                      <Clock size={9} /> {evt.sub}
                    </span>
                  </div>

                  {/* Source note */}
                  <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                    {evt.noteTitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
