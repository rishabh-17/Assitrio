import React, { useState, useMemo } from 'react';
import { Search, Mic, Calendar, Shield, CheckCircle2, X } from 'lucide-react';
import * as chrono from 'chrono-node';
import LiveTimer from './LiveTimer';

export default function ActivityFeed({ activities = [], notes = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'events'

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
      case 'mic': return <Mic size={12} className="text-brand-500" />;
      case 'calendar': return <Calendar size={12} className="text-blue-500" />;
      case 'shield': return <Shield size={12} className="text-emerald-500" />;
      case 'task': return <CheckCircle2 size={12} className="text-amber-500" />;
      default: return <Mic size={12} className="text-brand-500" />;
    }
  };

  return (
    <div className="p-5 animate-fade-in min-h-full">
      <div className="flex justify-between items-center mb-6 pt-6">
        <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Activity</h1>
        <button
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
          className="p-2.5 bg-white rounded-full shadow-sm border border-slate-100 text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all"
          aria-label="Toggle search"
        >
          {showSearch ? <X size={16} /> : <Search size={16} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-colors ${
            activeTab === 'all' ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-colors ${
            activeTab === 'events' ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
          }`}
        >
          Upcoming Events
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-5 animate-slide-up">
          <div className="flex items-center bg-white rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-brand-400 transition-colors shadow-sm">
            <Search size={16} className="text-slate-300 mr-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-slate-400"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center shadow-sm mt-4">
          <Search size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No matching activities</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-6 relative ml-4">
          {/* Timeline line */}
          <div className="absolute left-0 top-3 bottom-0 w-px bg-slate-200" />

          {filteredActivities.map((act, i) => (
            <div key={act.id} className="relative pl-8 group" style={{ animationDelay: `${i * 60}ms` }}>
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-[9px] h-[9px] rounded-full border-2 border-slate-200 bg-white -translate-x-1/2 z-10 group-hover:border-brand-500 group-hover:bg-brand-50 transition-colors" />

              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] text-brand-600 font-bold uppercase tracking-[0.1em]">{act.time}</p>
                {getIcon(act.icon)}
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <p className="text-[13px] font-bold text-slate-800 leading-tight">{act.title}</p>
                  {act.targetDateObj && <LiveTimer targetDate={act.targetDateObj} />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{act.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
