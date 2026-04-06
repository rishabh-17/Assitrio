import React, { useMemo } from 'react';
import { getUsageStats } from '../services/usageTracker';
import * as chrono from 'chrono-node';
import LiveTimer from './LiveTimer';
import {
  LayoutDashboard,
  Zap,
  Target,
  Users,
  Circle,
  TrendingUp,
  ChevronRight,
  Calendar,
  Clock,
  Mic,
  FileText,
  MessageCircle,
  AlertTriangle,
  Flag,
  Mail
} from 'lucide-react';

export default function Dashboard({ pendingTasks = [], notes = [], deletedNotes = [], toggleTask, openNote, goToLocker }) {
  // Add priority filter for critical tasks
  const criticalTasks = useMemo(() => {
    const criticals = pendingTasks.filter(t => t.priority === 'Critical');
    // Fast fallback: if no critical tasks explicitly exist yet but there are pending tasks, 
    // we show the topmost pending task until AI starts tagging
    return criticals.length > 0 ? criticals.slice(0, 3) : pendingTasks.slice(0, 3);
  }, [pendingTasks]);
  const recentNotes = notes.slice(0, 3);

  // Dynamic date
  const today = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Chart data dynamic based on combined usage volume (mins) per day of week
  const chartBars = useMemo(() => {
    // Initialize empty buckets for Monday through Sunday
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    
    // Combine active and deleted notes to track full historical usage
    const allNotes = [...notes, ...deletedNotes];
    
    allNotes.forEach(n => {
      let d = new Date(n.date);
      if (isNaN(d.getTime())) {
         d = new Date(); // fallback
      }
      let dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday...
      dayIndex = dayIndex === 0 ? 6 : dayIndex - 1; 

      // Extract raw integer minutes from the "15 mins" or "1m" string
      const parsedMins = parseInt(String(n.duration).replace(/\D/g, '')) || 1;
      buckets[dayIndex] += parsedMins;
    });

    const maxVal = Math.max(...buckets, 1); // Avoid division by zero
    
    // Scale buckets to a minimum height of 10% and max of 95%
    return buckets.map((count, i) => {
      const height = count === 0 ? 10 : Math.max(20, Math.round((count / maxVal) * 95));
      return {
        height,
        day: days[i],
      };
    });
  }, [notes]);

  const actionablePercent = useMemo(() => {
    const total = Array.isArray(notes) ? notes.flatMap(n => n.tasks || []) : [];
    if (total.length === 0) return 0;
    return Math.round((total.filter(t => !t.done).length / total.length) * 100);
  }, [notes]);

  const upcomingContexts = useMemo(() => {
    const contexts = [];
    notes.forEach(note => {
      note.tasks?.forEach(task => {
        if (task.date && !task.done) {
          const creationDate = new Date(`${note.date} ${note.time}`);
          const parsed = chrono.parse(task.date, creationDate);
          const targetDateObj = parsed.length > 0 ? parsed[0].start.date() : null;

          contexts.push({
            id: task.id,
            noteId: note.id,
            title: task.text,
            time: note.time, // from transcription created time
            dateLabel: task.date,
            created: creationDate.getTime() || Date.now(),
            targetDateObj
          });
        }
      });
    });
    // Sort by target date if available, otherwise by creation date
    return contexts.sort((a, b) => {
      if (a.targetDateObj && b.targetDateObj) return a.targetDateObj - b.targetDateObj;
      if (a.targetDateObj) return -1;
      if (b.targetDateObj) return 1;
      return b.created - a.created;
    }).slice(0, 3);
  }, [notes]);

  // Real usage stats
  const usage = useMemo(() => getUsageStats('free'), [notes]);

  return (
    <div className="p-4 sm:p-6 animate-slide-up min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4 sm:pt-6">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mb-1">{today}</p>
          <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">Assistrio</h1>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border border-emerald-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> READY
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-[24px] p-5 text-white mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="flex justify-between items-start relative z-10 mb-4">
          <div>
            <p className="text-brand-200 text-xs font-semibold">Monthly Usage</p>
            <h2 className="text-3xl font-extrabold mt-1">{usage.totalMinutes}<span className="text-lg font-bold text-brand-200">/{usage.minutesLimit === Infinity ? '∞' : usage.minutesLimit} min</span></h2>
          </div>
          <div className="bg-white/15 px-3 py-1.5 rounded-full text-[10px] font-bold">{usage.planName} Plan</div>
        </div>
        <div className="flex items-end gap-1.5 h-16 mb-3 relative z-10">
          {chartBars.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                style={{ height: `${bar.height}%` }}
                className="w-full bg-gradient-to-t from-white/40 to-white/15 rounded-t-md hover:from-white/60 hover:to-white/30 transition-all cursor-pointer"
              />
              <span className="text-[8px] text-brand-300 font-medium">{bar.day}</span>
            </div>
          ))}
        </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex gap-4 text-[11px]">
              <span className="text-brand-200"><Mic size={11} className="inline mr-1" />{usage.listenMinutes}m command</span>
              <span className="text-brand-200"><Users size={11} className="inline mr-1" />{usage.talkMinutes}m talk</span>
            </div>
            <div className="flex items-center gap-1.5 text-brand-200 text-[11px]">
              <TrendingUp size={14} />
              {/* Using native usage total to prevent count dropping when a note is deleted */}
              {usage.totalSessions} sessions
            </div>
          </div>
        {/* Progress bar */}
        <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 relative z-10">
          <div
            className={`h-1.5 rounded-full transition-all ${
              usage.usagePercent > 80 ? 'bg-red-400' : usage.usagePercent > 50 ? 'bg-amber-300' : 'bg-emerald-300'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, usage.usagePercent))}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-slate-800">{notes.length}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Notes</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-brand-600">{pendingTasks.length}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pending</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-slate-800">{actionablePercent}%</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Actionable</p>
        </div>
      </div>

      {/* Critical Action Items */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[15px] text-slate-900">Most Critical Actions</h3>
        <button onClick={goToLocker} className="text-brand-600 text-xs font-bold px-2 py-1">View All</button>
      </div>
      <div className="space-y-4 mb-8">
        {criticalTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={20} className="text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No critical tasks pending</p>
          </div>
        ) : (
          criticalTasks.map((task, idx) => (
            <div
              key={task.id}
              className={`border-l-[3px] p-4 rounded-r-2xl shadow-sm bg-white cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                idx === 0 ? 'border-red-500' : idx === 1 ? 'border-amber-400' : 'border-blue-400'
              }`}
              onClick={() => openNote(task.noteId)}
            >
              <p className={`text-[9px] font-extrabold uppercase tracking-[0.15em] mb-2 ${
                idx === 0 ? 'text-red-500' : idx === 1 ? 'text-amber-500' : 'text-blue-500'
              }`}>
                {idx === 0 ? 'HIGH PRIORITY' : idx === 1 ? 'ACTION REQUIRED' : 'FOLLOW UP'}
              </p>
              <div className="flex gap-3 items-start">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTask(task.noteId, task.id); }}
                  className="mt-0.5 text-slate-300 hover:text-brand-500 transition-colors"
                  aria-label={`Mark "${task.text}" as complete`}
                >
                  <Circle size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-[13px] leading-tight">{task.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <p className="text-[11px] text-slate-400 line-clamp-1">{task.noteTitle}</p>
                    {task.date && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">
                        <Calendar size={8} />
                        {task.date}
                      </span>
                    )}
                    {task.priority && task.priority !== 'Normal' && (
                      <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        task.priority === 'Critical'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        <Flag size={7} />
                        {task.priority}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                        <Mail size={7} />
                        {task.assignee.split('@')[0]}
                      </span>
                    )}
                    <button
                      className="flex items-center gap-1 text-[9px] hover:text-brand-700 font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded transition-colors"
                    >
                      <FileText size={10} /> VIEW SOURCE MOM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upcoming Contexts */}
      {upcomingContexts.length > 0 && (
        <>
          <h3 className="font-bold text-[15px] text-slate-900 mb-4">Upcoming Contexts</h3>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-8 space-y-4">
            {upcomingContexts.map((ctx, idx) => (
              <React.Fragment key={ctx.id}>
                {idx > 0 && <div className="w-full h-px bg-slate-100" />}
                <div
                  className={`flex gap-4 items-center cursor-pointer transition-all active:scale-[0.98] ${idx > 0 ? 'opacity-60 hover:opacity-100' : ''}`}
                  onClick={() => openNote(ctx.noteId)}
                >
                  <div className={`flex flex-col items-center justify-center w-11 h-11 ${idx === 0 ? 'bg-brand-50' : 'bg-slate-50'} rounded-xl shrink-0`}>
                    <span className={`text-[10px] font-bold ${idx === 0 ? 'text-brand-600' : 'text-slate-400'}`}>{ctx.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-800 text-[13px] truncate pr-2">{ctx.title}</p>
                      {ctx.targetDateObj && <LiveTimer targetDate={ctx.targetDateObj} />}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <Clock size={11} /> Scheduled for: {ctx.dateLabel}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {/* Recent Memories */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[15px] text-slate-900">Recent Memories</h3>
        <button onClick={goToLocker} className="text-brand-600 text-xs font-bold px-2 py-1">Locker</button>
      </div>
      <div className="space-y-4 pb-6">
        {recentNotes.map(note => (
          <div
            key={note.id}
            onClick={() => openNote(note.id)}
            className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm cursor-pointer hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <h4 className="font-bold text-slate-800 text-[13px] mb-1">{note.title}</h4>
            <p className="text-[12px] text-slate-500 line-clamp-2 mb-2.5 leading-relaxed">{note.summary}</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Calendar size={10} /> {note.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {note.duration}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {note.source === 'talk' ? <MessageCircle size={10} /> : <Mic size={10} />}
                {note.source === 'talk' ? 'Talk' : 'Listen'}
              </span>
              <span>•</span>
              <span>{note.tasks.length} tasks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
