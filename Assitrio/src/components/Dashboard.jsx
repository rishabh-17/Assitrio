import React, { useMemo } from 'react';
import { getUsageStats } from '../services/usageTracker';
import { useAuth } from '../context/AuthContext';
import * as chrono from 'chrono-node';
import LiveTimer from './LiveTimer';
import { Zap, Users, TrendingUp, Calendar, Clock, Mic, FileText, MessageCircle, Flag, Mail, Circle, Trash2 } from 'lucide-react';

const dark = {
  root: { padding: '16px 16px 100px', backgroundColor: '#111111', minHeight: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' },
  headerDate: { fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 99, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#34d399' },
  heroCard: { background: 'linear-gradient(135deg, #1a1030 0%, #0f0f1a 100%)', borderRadius: 24, padding: '20px', marginBottom: 20, border: '1px solid rgba(109,91,250,0.2)', position: 'relative', overflow: 'hidden' },
  heroOverlay1: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(109,91,250,0.08)', borderRadius: '50%', pointerEvents: 'none' },
  heroOverlay2: { position: 'absolute', bottom: -32, left: -32, width: 120, height: 120, background: 'rgba(109,91,250,0.06)', borderRadius: '50%', pointerEvents: 'none' },
  heroLabel: { fontSize: 11, color: '#6d5bfa', fontWeight: 600, marginBottom: 4 },
  heroNum: { fontSize: 30, fontWeight: 800, color: '#f9fafb' },
  heroPlan: { backgroundColor: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#a78bfa' },
  barWrap: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, marginBottom: 12 },
  bar: (h, hovered) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }),
  barInner: (h) => ({ width: '100%', height: `${h}%`, background: 'linear-gradient(to top, rgba(109,91,250,0.5), rgba(109,91,250,0.15))', borderRadius: '4px 4px 0 0' }),
  barLabel: { fontSize: 8, color: '#4b5563', fontWeight: 500 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 },
  statCard: { backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #222', padding: 16, textAlign: 'center' },
  statNum: (accent) => ({ fontSize: 22, fontWeight: 800, color: accent || '#f9fafb', marginBottom: 4 }),
  statLabel: { fontSize: 9, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' },
  sectionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#f3f4f6' },
  sectionLink: { fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' },
  taskCard: (idx) => ({ backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #222', borderLeft: `3px solid ${idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#60a5fa'}`, padding: '14px 14px', marginBottom: 12, cursor: 'pointer' }),
  taskPrioLabel: (idx) => ({ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#60a5fa', marginBottom: 8 }),
  taskTitle: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.4 },
  chip: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: 99, padding: '3px 7px' }),
  noteCard: { backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #222', padding: '14px', marginBottom: 10, cursor: 'pointer' },
  progressBar: (pct) => ({ height: 4, borderRadius: 99, background: 'linear-gradient(90deg, #6d5bfa, #9b5de5)', width: `${Math.max(2, Math.min(100, pct))}%`, transition: 'width 0.4s' }),
  contextCard: { backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #222', padding: 16, marginBottom: 20 },
};

export default function Dashboard({ pendingTasks = [], notes = [], deletedNotes = [], toggleTask, deleteTask, openNote, goToLocker }) {
  const { currentUser } = useAuth();
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }, []);

  const criticalTasks = useMemo(() => {
    const c = pendingTasks.filter(t => t.priority === 'Critical');
    return c.length > 0 ? c.slice(0, 3) : pendingTasks.slice(0, 3);
  }, [pendingTasks]);

  const recentNotes = notes.slice(0, 3);

  const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), []);

  const chartBars = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toDateString() });
    }
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    [...notes, ...deletedNotes].forEach(n => {
      let d = new Date(n.date); if (isNaN(d.getTime())) d = new Date();
      const ds = d.toDateString();
      const index = days.findIndex(day => day.date === ds);
      if (index !== -1) {
        buckets[index] += parseInt(String(n.duration).replace(/\\D/g, '')) || 1;
      }
    });
    const maxVal = Math.max(...buckets, 1);
    return buckets.map((count, i) => ({ height: count === 0 ? 10 : Math.max(20, Math.round((count / maxVal) * 95)), day: days[i].name }));
  }, [notes, deletedNotes]);

  const actionablePercent = useMemo(() => {
    const total = notes.flatMap(n => n.tasks || []);
    if (!total.length) return 0;
    return Math.round((total.filter(t => !t.done).length / total.length) * 100);
  }, [notes]);

  const upcomingContexts = useMemo(() => {
    const ctxs = [];
    notes.forEach(note => {
      note.tasks?.forEach(task => {
        let dateLabel = task.date;
        let parsed = null;
        const cd = new Date(`${note.date} ${note.time}`);
        
        if (dateLabel) {
            parsed = chrono.parse(dateLabel, cd);
        } else {
            const tempParsed = chrono.parse(task.text, cd);
            if (tempParsed && tempParsed.length > 0) {
                dateLabel = tempParsed[0].text;
                parsed = tempParsed;
            }
        }

        if (dateLabel && parsed && parsed.length > 0) {
          ctxs.push({ id: task.id, noteId: note.id, title: task.text, time: note.time, dateLabel: dateLabel, created: cd.getTime() || Date.now(), targetDateObj: parsed[0]?.start.date() || null, isDone: task.done });
        }
      });
    });
    return ctxs.sort((a, b) => {
      if (a.targetDateObj && b.targetDateObj) return a.targetDateObj - b.targetDateObj;
      if (a.targetDateObj) return -1; if (b.targetDateObj) return 1;
      return b.created - a.created;
    }).slice(0, 3);
  }, [notes]);

  const usage = useMemo(() => getUsageStats('free'), [notes]);

  return (
    <div style={dark.root}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 24 }}>
        <div>
          <p style={dark.headerDate}>{today}</p>
          <h1 style={{ ...dark.headerTitle, fontSize: 26, letterSpacing: '-0.5px' }}>
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>{greeting}</span><br />
            {currentUser?.displayName || currentUser?.username || 'Boss'}
          </h1>
        </div>
        <div style={dark.statusBadge}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399' }} />
          READY
        </div>
      </div>

      {/* Hero Card */}
      <div style={dark.heroCard}>
        <div style={dark.heroOverlay1} /><div style={dark.heroOverlay2} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={dark.heroLabel}>Monthly Usage</p>
              <h2 style={dark.heroNum}>
                {usage.totalMinutes}
                <span style={{ fontSize: 15, fontWeight: 600, color: '#6d5bfa' }}>/{usage.minutesLimit === Infinity ? '∞' : usage.minutesLimit} min</span>
              </h2>
            </div>
            <div style={dark.heroPlan}>{usage.planName} Plan</div>
          </div>

          <div style={dark.barWrap}>
            {chartBars.map((bar, i) => (
              <div key={i} style={dark.bar(bar.height)}>
                <div style={dark.barInner(bar.height)} />
                <span style={dark.barLabel}>{bar.day}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#6b7280' }}>
              <span><Mic size={10} style={{ display: 'inline', marginRight: 3 }} />{usage.listenMinutes}m cmd</span>
              <span><Users size={10} style={{ display: 'inline', marginRight: 3 }} />{usage.talkMinutes}m talk</span>
            </div>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} /> {usage.totalSessions} sessions
            </span>
          </div>

          <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ ...dark.progressBar(usage.usagePercent), background: usage.usagePercent > 80 ? '#ef4444' : usage.usagePercent > 50 ? '#f59e0b' : 'linear-gradient(90deg,#6d5bfa,#9b5de5)' }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={dark.statGrid}>
        <div style={dark.statCard}><p style={dark.statNum()}>{notes.length}</p><p style={dark.statLabel}>Notes</p></div>
        <div style={dark.statCard}><p style={dark.statNum('#a78bfa')}>{pendingTasks.length}</p><p style={dark.statLabel}>Pending</p></div>
        <div style={dark.statCard}><p style={dark.statNum()}>{actionablePercent}%</p><p style={dark.statLabel}>Actionable</p></div>
      </div>

      {/* Critical Tasks */}
      <div style={dark.sectionRow}>
        <h3 style={dark.sectionTitle}>Most Critical Actions</h3>
        <button style={dark.sectionLink} onClick={goToLocker}>View All</button>
      </div>
      <div style={{ marginBottom: 24 }}>
        {criticalTasks.length === 0 ? (
          <div style={{ ...dark.noteCard, textAlign: 'center', padding: 32 }}>
            <Zap size={22} style={{ color: '#34d399', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>All caught up!</p>
            <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>No critical tasks pending</p>
          </div>
        ) : criticalTasks.map((task, idx) => (
          <div key={task.id} style={dark.taskCard(idx)} onClick={() => openNote(task.noteId, 'mom')}>
            <p style={dark.taskPrioLabel(idx)}>{idx === 0 ? 'HIGH PRIORITY' : idx === 1 ? 'ACTION REQUIRED' : 'FOLLOW UP'}</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <button onClick={(e) => { e.stopPropagation(); toggleTask(task.noteId, task.id); }} style={{ color: '#374151', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}>
                <Circle size={18} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={dark.taskTitle}>{task.text}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {task.date && <span style={dark.chip('rgba(109,91,250,0.1)', '#8b5cf6', 'rgba(109,91,250,0.2)')}><Calendar size={8} />{task.date}</span>}
                  {task.priority && task.priority !== 'Normal' && <span style={dark.chip('rgba(239,68,68,0.1)', '#f87171', 'rgba(239,68,68,0.2)')}><Flag size={7} />{task.priority}</span>}
                  {task.assignee && <span style={dark.chip('rgba(167,139,250,0.1)', '#a78bfa', 'rgba(167,139,250,0.2)')}><Mail size={7} />{task.assignee.split('@')[0]}</span>}
                  <span style={dark.chip('rgba(109,91,250,0.08)', '#8b5cf6', 'rgba(109,91,250,0.15)')}><FileText size={9} style={{ display: 'inline' }} /> VIEW SOURCE</span>
                </div>
              </div>
              {deleteTask && (
                <button onClick={(e) => { e.stopPropagation(); deleteTask(task.noteId, task.id); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, flexShrink: 0, opacity: 0.6 }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Contexts */}
      {upcomingContexts.length > 0 && (
        <>
          <h3 style={{ ...dark.sectionTitle, marginBottom: 12 }}>Upcoming Contexts</h3>
          <div style={dark.contextCard}>
            {upcomingContexts.map((ctx, idx) => (
              <React.Fragment key={ctx.id}>
                {idx > 0 && <div style={{ height: 1, backgroundColor: '#222', margin: '12px 0' }} />}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', opacity: idx > 0 ? 0.6 : 1 }} onClick={() => openNote(ctx.noteId, 'mom')}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: idx === 0 ? 'rgba(109,91,250,0.12)' : '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: idx === 0 ? '#a78bfa' : '#4b5563' }}>{ctx.time}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ctx.isDone ? '#9ca3af' : '#f3f4f6', textDecoration: ctx.isDone ? 'line-through' : 'none', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{ctx.title}</p>
                      {ctx.targetDateObj && <LiveTimer targetDate={ctx.targetDateObj} isDone={ctx.isDone} />}
                    </div>
                    <p style={{ fontSize: 11, color: '#4b5563', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> Scheduled for: {ctx.dateLabel}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {/* Recent Notes */}
      <div style={dark.sectionRow}>
        <h3 style={dark.sectionTitle}>Recent Memories</h3>
        <button style={dark.sectionLink} onClick={goToLocker}>Locker</button>
      </div>
      <div>
        {recentNotes.map(note => (
          <div key={note.id} style={dark.noteCard} onClick={() => openNote(note.id)}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', marginBottom: 6 }}>{note.title}</h4>
            <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.summary}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#4b5563', fontWeight: 500, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} />{note.date}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{note.duration}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{note.source === 'talk' ? <MessageCircle size={10} /> : <Mic size={10} />}{note.source === 'talk' ? 'Talk' : 'Listen'}</span>
              <span>•</span>
              <span>{note.tasks.length} tasks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}