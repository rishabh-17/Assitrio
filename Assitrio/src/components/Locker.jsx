import React, { useState, useRef, useEffect } from 'react';
import {
  Archive,
  CheckCircle2,
  Circle,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  Filter,
  FileText,
  Mic,
  MessageCircle,
  Flag,
  Mail,
  Users
} from 'lucide-react';

export default function Locker({ notes = [], pendingTasks = [], completedTasks = [], toggleTask, openNote, deleteNote, deleteTask, updateTask }) {
  const [view, setView] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskValue, setEditTaskValue] = useState('');
  const editRef = useRef(null);

  useEffect(() => {
    if (editingTaskId && editRef.current) editRef.current.focus();
  }, [editingTaskId]);

  const startTaskEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTaskValue(task.text);
  };

  const saveTaskEdit = (noteId) => {
    if (editingTaskId && editTaskValue.trim()) {
      updateTask(noteId, editingTaskId, editTaskValue.trim());
    }
    setEditingTaskId(null);
    setEditTaskValue('');
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditTaskValue('');
  };

  const TaskCard = ({ task, isCompleted = false }) => {
    const isEditing = editingTaskId === task.id;

    return (
      <div
        key={task.id}
        onClick={() => !isEditing && openNote(task.noteId)}
        className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
          isCompleted
            ? 'bg-slate-50 border-slate-100 hover:border-slate-200'
            : 'bg-white border-slate-100 shadow-sm hover:border-brand-200 hover:shadow-md active:scale-[0.98]'
        } ${isEditing ? 'border-brand-400 border-2 cursor-default' : ''}`}
      >
        {isEditing ? (
          <div className="flex-1">
            <input
              ref={editRef}
              value={editTaskValue}
              onChange={(e) => setEditTaskValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTaskEdit(task.noteId); if (e.key === 'Escape') cancelTaskEdit(); }}
              className="w-full text-[13px] font-medium text-slate-800 bg-transparent outline-none"
            />
            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
              <button
                onClick={(e) => { e.stopPropagation(); saveTaskEdit(task.noteId); }}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg hover:bg-brand-100"
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelTaskEdit(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); toggleTask(task.noteId, task.id); }}
              className={`mt-0.5 shrink-0 transition-colors ${
                isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-brand-500'
              }`}
              aria-label={isCompleted ? `Uncomplete: ${task.text}` : `Complete: ${task.text}`}
            >
              {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                {task.text}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {task.date && (
                  <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isCompleted
                        ? 'bg-slate-50 text-slate-400'
                        : 'bg-brand-50 text-brand-600'
                    }`}
                  >
                    <Calendar size={10} />
                    {task.date}
                  </div>
                )}
                {task.priority && task.priority !== 'Normal' && !isCompleted && (
                  <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    task.priority === 'Critical'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    <Flag size={7} />
                    {task.priority}
                  </span>
                )}
              </div>
              {task.assignee && (
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold mt-1 ${
                  isCompleted ? 'bg-slate-50 text-slate-400' : 'bg-violet-50 text-violet-600 border border-violet-200'
                }`}>
                  <Mail size={8} />
                  {task.assignee.split('@')[0]}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1">
                  <FileText size={10} className="shrink-0" />
                  {task.noteTitle}
                </p>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </div>
            </div>
            {/* Edit/Delete */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); startTaskEdit(task); }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-all"
                aria-label={`Edit task: ${task.text}`}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteTask(task.noteId, task.id); }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                aria-label={`Delete task: ${task.text}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };



  // Filter Logic
  const getFilteredItems = (items) => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.text && item.text.toLowerCase().includes(q)) ||
        (item.transcript && item.transcript.toLowerCase().includes(q)) ||
        (item.mom && item.mom.toLowerCase().includes(q));

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const itemDateStr = item.date || item.noteDate; 
        const todayStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        const testDate = itemDateStr === 'Today' ? todayStr : itemDateStr === 'Yesterday' ? yesterdayStr : itemDateStr;
        
        if (dateFilter === 'today') {
           matchesDate = testDate === todayStr || itemDateStr === 'Today';
        } else if (dateFilter === 'yesterday') {
           matchesDate = testDate === yesterdayStr || itemDateStr === 'Yesterday';
        }
      }
      return matchesSearch && matchesDate;
    });
  };

  const prepTasks = (tasks) => tasks.map(t => {
    const parentNote = notes.find(n => n.id === t.noteId);
    return { ...t, noteDate: parentNote ? parentNote.date : 'Today' };
  });

  // Build unique assignees for filter dropdown
  const uniqueAssignees = [...new Set(
    [...pendingTasks, ...completedTasks]
      .map(t => t.assignee)
      .filter(Boolean)
  )].sort();

  const filteredNotes = getFilteredItems(notes);
  let filteredPending = getFilteredItems(prepTasks(pendingTasks));
  let filteredCompleted = getFilteredItems(prepTasks(completedTasks));

  // Apply assignee filter
  if (assigneeFilter !== 'all') {
    if (assigneeFilter === 'unassigned') {
      filteredPending = filteredPending.filter(t => !t.assignee);
      filteredCompleted = filteredCompleted.filter(t => !t.assignee);
    } else {
      filteredPending = filteredPending.filter(t => t.assignee === assigneeFilter);
      filteredCompleted = filteredCompleted.filter(t => t.assignee === assigneeFilter);
    }
  }

  return (
    <div className="p-5 animate-fade-in">
      <h1 className="text-[22px] font-extrabold mb-5 pt-6 text-slate-900 tracking-tight">Memory Locker</h1>

      {/* View Toggle */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setView('notes')}
          className={`p-4 rounded-2xl flex flex-col items-center gap-2.5 border-2 transition-all active:scale-[0.97] ${
            view === 'notes'
              ? 'border-brand-600 bg-brand-50 shadow-md'
              : 'border-slate-150 bg-white hover:border-brand-200'
          }`}
        >
          <div className={`p-2.5 rounded-xl transition-colors ${
            view === 'notes' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            <Archive size={22} />
          </div>
          <div className="text-center">
            <span className={`font-bold text-[12px] block ${view === 'notes' ? 'text-brand-700' : 'text-slate-500'}`}>
              Notes (MOM)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{notes.length} entries</span>
          </div>
        </button>

        <button
          onClick={() => setView('tasks')}
          className={`p-4 rounded-2xl flex flex-col items-center gap-2.5 border-2 transition-all active:scale-[0.97] ${
            view === 'tasks'
              ? 'border-brand-600 bg-brand-50 shadow-md'
              : 'border-slate-150 bg-white hover:border-brand-200'
          }`}
        >
          <div className={`p-2.5 rounded-xl transition-colors ${
            view === 'tasks' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            <CheckCircle2 size={22} />
          </div>
          <div className="text-center">
            <span className={`font-bold text-[12px] block ${view === 'tasks' ? 'text-brand-700' : 'text-slate-500'}`}>
              All Tasks
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{filteredPending.length + filteredCompleted.length} items</span>
          </div>
        </button>
      </div>

      {/* Filters (Search & Date & Assignee) */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-100 focus:border-brand-300 rounded-xl text-[13px] outline-none transition-colors placeholder:text-slate-400"
            placeholder={`Search ${view}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={16} className="text-slate-400" />
          </div>
          <select
            className="pl-9 pr-6 py-2.5 bg-white border-2 border-slate-100 focus:border-brand-300 rounded-xl text-[13px] outline-none transition-colors appearance-none font-medium text-slate-700"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
        </div>
        {view === 'tasks' && uniqueAssignees.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users size={16} className="text-slate-400" />
            </div>
            <select
              className="pl-9 pr-6 py-2.5 bg-white border-2 border-slate-100 focus:border-brand-300 rounded-xl text-[13px] outline-none transition-colors appearance-none font-medium text-slate-700"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {uniqueAssignees.map(email => (
                <option key={email} value={email}>{email.split('@')[0]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes View */}
      {view === 'notes' ? (
        <div className="space-y-5 animate-slide-up">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Chronological</p>
          {filteredNotes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center shadow-sm">
              <Archive size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No memories found</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                >
                  <div className="flex-1 pr-3 min-w-0" onClick={() => openNote(note.id)}>
                    <h4 className="font-bold text-slate-800 text-[13px] mb-1 group-hover:text-brand-600 transition-colors truncate">
                      {note.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">{note.summary}</p>
                    <div className="flex gap-2 text-[10px] text-slate-400 font-medium items-center">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {note.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {note.time}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {note.source === 'talk' ? <MessageCircle size={10} /> : <Mic size={10} />}
                        {note.source === 'talk' ? 'Talk' : 'Listen'}
                      </span>
                      <span>•</span>
                      <span>{note.tasks.filter(t => !t.done).length} pending</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-2 rounded-full text-slate-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label={`Delete note: ${note.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div
                      onClick={() => openNote(note.id)}
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors"
                    >
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tasks View */
        <div className="space-y-5 animate-slide-up">
          {/* Pending */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] flex justify-between items-center mb-3">
              <span>Pending</span>
              <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200">
                {filteredPending.length}
              </span>
            </p>
            {filteredPending.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center shadow-sm">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending tasks matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPending.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </div>

          {/* Completed */}
          {filteredCompleted.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 flex justify-between items-center">
                <span>Completed</span>
                <span className="text-emerald-500">{filteredCompleted.length}</span>
              </p>
              <div className="space-y-2.5 opacity-60">
                {filteredCompleted.map(task => <TaskCard key={task.id} task={task} isCompleted />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
