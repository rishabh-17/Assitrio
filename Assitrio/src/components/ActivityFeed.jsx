import React, { useState, useMemo } from 'react';
import { Search, Mic, Calendar, Shield, CheckCircle2, X } from 'lucide-react';
import * as chrono from 'chrono-node';
import LiveTimer from './LiveTimer';

export default function ActivityFeed({ activities = [], notes = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const upcomingEvents = useMemo(() => {
    const events = [];
    notes.forEach(n => {
      n.tasks?.forEach(t => {
        if (t.date && !t.done) {
          const creationDate = new Date(`${n.date} ${n.time}`);
          const parsed = chrono.parse(t.date, creationDate);
          const targetDateObj = parsed.length > 0 ? parsed[0].start.date() : null;
          events.push({
            id: t.id,
            time: n.time,
            title: t.text,
            sub: `Scheduled for: ${t.date}`,
            icon: 'calendar',
            created: creationDate.getTime() || Date.now(),
            targetDateObj
          });
        }
      });
    });
    return events.sort((a, b) => {
      if (a.targetDateObj && b.targetDateObj) return a.targetDateObj - b.targetDateObj;
      if (a.targetDateObj) return -1;
      if (b.targetDateObj) return 1;
      return b.created - a.created;
    });
  }, [notes]);

  const sourceList = activeTab === 'all' ? activities : upcomingEvents;

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return sourceList;
    const q = searchQuery.toLowerCase();
    return sourceList.filter(
      a => a.title.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)
    );
  }, [sourceList, searchQuery]);

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'mic': return <Mic size={12} style={{ color: '#a78bfa' }} />;
      case 'calendar': return <Calendar size={12} style={{ color: '#60a5fa' }} />;
      case 'shield': return <Shield size={12} style={{ color: '#34d399' }} />;
      case 'task': return <CheckCircle2 size={12} style={{ color: '#fbbf24' }} />;
      default: return <Mic size={12} style={{ color: '#a78bfa' }} />;
    }
  };

  /* ── inline styles matching CraftNote dark theme ── */
  const s = {
    root: {
      minHeight: '100%',
      backgroundColor: '#111111',
      padding: '20px 16px 32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingTop: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: 800,
      color: '#ffffff',
      letterSpacing: '-0.3px',
      margin: 0,
    },
    searchBtn: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      backgroundColor: '#1e1e1e',
      border: '1px solid #2a2a2a',
      color: '#9ca3af',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    tabRow: {
      display: 'flex',
      gap: 8,
      marginBottom: 16,
      backgroundColor: '#1a1a1a',
      borderRadius: 14,
      padding: 4,
    },
    tabActive: {
      flex: 1,
      padding: '9px 0',
      fontSize: 12,
      fontWeight: 700,
      borderRadius: 11,
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #6d5bfa 0%, #9b5de5 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(109,91,250,0.4)',
    },
    tabInactive: {
      flex: 1,
      padding: '9px 0',
      fontSize: 12,
      fontWeight: 600,
      borderRadius: 11,
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: '#6b7280',
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#1e1e1e',
      borderRadius: 14,
      border: '1px solid #2a2a2a',
      padding: '10px 14px',
      marginBottom: 16,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontSize: 13,
      color: '#e5e7eb',
    },
    emptyBox: {
      backgroundColor: '#1a1a1a',
      borderRadius: 18,
      border: '1px solid #222',
      padding: '36px 24px',
      textAlign: 'center',
      marginTop: 16,
    },
    timeline: {
      position: 'relative',
      marginLeft: 14,
    },
    timelineLine: {
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 0,
      width: 1,
      backgroundColor: '#2a2a2a',
    },
    item: {
      position: 'relative',
      paddingLeft: 28,
      marginBottom: 20,
    },
    dot: {
      position: 'absolute',
      left: 0,
      top: 6,
      width: 9,
      height: 9,
      borderRadius: '50%',
      border: '2px solid #3a3a3a',
      backgroundColor: '#111111',
      transform: 'translateX(-50%)',
      zIndex: 10,
    },
    itemMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    itemTime: {
      fontSize: 10,
      fontWeight: 700,
      color: '#a78bfa',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    card: {
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      border: '1px solid #222222',
      padding: '14px 16px',
    },
    cardTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: '#f3f4f6',
      lineHeight: 1.4,
      margin: 0,
    },
    cardSub: {
      fontSize: 11,
      color: '#6b7280',
      lineHeight: 1.5,
      margin: 0,
    },
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Activity</h1>
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
        <button
          onClick={() => setActiveTab('all')}
          style={activeTab === 'all' ? s.tabActive : s.tabInactive}
        >
          All Activity
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={activeTab === 'events' ? s.tabActive : s.tabInactive}
        >
          Upcoming Events
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div style={s.searchBar}>
          <Search size={15} style={{ color: '#4b5563', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            style={s.searchInput}
            autoFocus
          />
        </div>
      )}

      {/* Empty State */}
      {filteredActivities.length === 0 ? (
        <div style={s.emptyBox}>
          <Search size={28} style={{ color: '#374151', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>
            No matching activities
          </p>
          <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>
            Try a different search term
          </p>
        </div>
      ) : (
        /* Timeline */
        <div style={s.timeline}>
          <div style={s.timelineLine} />
          {filteredActivities.map((act, i) => (
            <div key={act.id} style={s.item}>
              <div style={s.dot} />
              <div style={s.itemMeta}>
                <span style={s.itemTime}>{act.time}</span>
                {getIcon(act.icon)}
              </div>
              <div style={s.card}>
                <div style={s.cardTop}>
                  <p style={s.cardTitle}>{act.title}</p>
                  {act.targetDateObj && <LiveTimer targetDate={act.targetDateObj} />}
                </div>
                <p style={s.cardSub}>{act.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}