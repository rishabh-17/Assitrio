import React, { useState, useRef, useEffect } from 'react';
import { Archive, CheckCircle2, Circle, ChevronRight, Calendar, Clock, Trash2, Pencil, Check, X, Search, Filter, FileText, Mic, MessageCircle, Flag, Mail, Users } from 'lucide-react';

const dk = {
  root: { padding: '20px 16px 100px', backgroundColor: '#111111', minHeight: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' },
  title: { fontSize: 22, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', paddingTop: 24, marginBottom: 20 },
  toggleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  toggleBtn: (active) => ({ padding: 16, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: `2px solid ${active ? '#6d5bfa' : '#222'}`, backgroundColor: active ? 'rgba(109,91,250,0.08)' : '#1a1a1a', cursor: 'pointer' }),
  toggleIcon: (active) => ({ padding: 10, borderRadius: 12, backgroundColor: active ? 'rgba(109,91,250,0.2)' : '#222', color: active ? '#a78bfa' : '#4b5563' }),
  toggleLabel: (active) => ({ fontSize: 12, fontWeight: 700, color: active ? '#a78bfa' : '#6b7280' }),
  toggleCount: { fontSize: 10, color: '#4b5563', fontWeight: 500 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 140 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' },
  searchInput: { width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 13, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' },
  filterSelect: { paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 13, color: '#9ca3af', outline: 'none', appearance: 'none', position: 'relative' },
  filterWrap: { position: 'relative' },
  filterIconAbs: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none', zIndex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: (color) => ({ fontSize: 10, fontWeight: 700, backgroundColor: color === 'amber' ? 'rgba(245,158,11,0.1)' : 'transparent', color: color === 'amber' ? '#f59e0b' : '#34d399', border: `1px solid ${color === 'amber' ? 'rgba(245,158,11,0.2)' : 'transparent'}`, borderRadius: 99, padding: '2px 8px' }),
  noteCard: { backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 8 },
  noteTitle: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', marginBottom: 4 },
  noteMeta: { display: 'flex', gap: 8, fontSize: 10, color: '#4b5563', fontWeight: 500, flexWrap: 'wrap', alignItems: 'center' },
  taskCard: (completed, editing) => ({ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', borderRadius: 16, border: `${editing ? '2px solid #6d5bfa' : '1px solid #222'}`, backgroundColor: completed ? '#161616' : '#1a1a1a', cursor: editing ? 'default' : 'pointer', marginBottom: 8 }),
  taskText: (completed) => ({ fontSize: 13, fontWeight: 500, color: completed ? '#4b5563' : '#f3f4f6', textDecoration: completed ? 'line-through' : 'none' }),
  chip: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: 99, padding: '3px 7px' }),
  editInput: { flex: 1, fontSize: 13, fontWeight: 500, color: '#f3f4f6', backgroundColor: 'transparent', border: 'none', outline: 'none' },
  editActions: { display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2a2a' },
  editBtn: (primary) => ({ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: primary ? 'rgba(109,91,250,0.15)' : '#222', color: primary ? '#a78bfa' : '#6b7280' }),
  actionBtn: (danger) => ({ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  emptyBox: { backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #222', padding: '32px 24px', textAlign: 'center' },
};

export default function Locker({ notes = [], pendingTasks = [], completedTasks = [], toggleTask, openNote, deleteNote, deleteTask, updateTask }) {
  const [view, setView] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskValue, setEditTaskValue] = useState('');
  const editRef = useRef(null);

  useEffect(() => { if (editingTaskId && editRef.current) editRef.current.focus(); }, [editingTaskId]);

  const startTaskEdit = (task) => { setEditingTaskId(task.id); setEditTaskValue(task.text); };
  const saveTaskEdit = (noteId) => { if (editingTaskId && editTaskValue.trim()) updateTask(noteId, editingTaskId, editTaskValue.trim()); setEditingTaskId(null); setEditTaskValue(''); };
  const cancelTaskEdit = () => { setEditingTaskId(null); setEditTaskValue(''); };

  const TaskCard = ({ task, isCompleted = false }) => {
    const isEditing = editingTaskId === task.id;
    return (
      <div style={dk.taskCard(isCompleted, isEditing)} onClick={() => !isEditing && openNote(task.noteId, 'mom')}>
        {isEditing ? (
          <div style={{ flex: 1 }}>
            <input ref={editRef} value={editTaskValue} onChange={(e) => setEditTaskValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTaskEdit(task.noteId); if (e.key === 'Escape') cancelTaskEdit(); }}
              style={dk.editInput} />
            <div style={dk.editActions}>
              <button onClick={(e) => { e.stopPropagation(); saveTaskEdit(task.noteId); }} style={dk.editBtn(true)}><Check size={12} /> Save</button>
              <button onClick={(e) => { e.stopPropagation(); cancelTaskEdit(); }} style={dk.editBtn(false)}><X size={12} /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={(e) => { e.stopPropagation(); toggleTask(task.noteId, task.id); }} style={{ ...dk.actionBtn(), color: isCompleted ? '#34d399' : '#374151', marginTop: 2, flexShrink: 0 }}>
              {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={dk.taskText(isCompleted)}>{task.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {task.date && <span style={dk.chip('rgba(109,91,250,0.1)', isCompleted ? '#4b5563' : '#8b5cf6', 'rgba(109,91,250,0.2)')}><Calendar size={9} />{task.date}</span>}
                {task.priority && task.priority !== 'Normal' && !isCompleted && <span style={dk.chip('rgba(239,68,68,0.1)', '#f87171', 'rgba(239,68,68,0.2)')}><Flag size={7} />{task.priority}</span>}
                {task.assignee && <span style={dk.chip('rgba(167,139,250,0.1)', isCompleted ? '#4b5563' : '#a78bfa', 'rgba(167,139,250,0.2)')}><Mail size={8} />{task.assignee.split('@')[0]}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#4b5563' }}>
                <FileText size={10} style={{ flexShrink: 0 }} />{task.noteTitle}
                <ChevronRight size={12} style={{ color: '#2a2a2a' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); startTaskEdit(task); }} style={{ ...dk.actionBtn(), color: '#374151' }}><Pencil size={13} /></button>
              <button onClick={(e) => { e.stopPropagation(); deleteTask(task.noteId, task.id); }} style={{ ...dk.actionBtn(), color: '#374151' }}><Trash2 size={13} /></button>
            </div>
          </>
        )}
      </div>
    );
  };

  const getFilteredItems = (items) => items.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || ['title', 'summary', 'text', 'transcript', 'mom'].some(k => item[k]?.toLowerCase().includes(q));
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const todayStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const ydStr = yd.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const id = item.date || item.noteDate;
      const td = id === 'Today' ? todayStr : id === 'Yesterday' ? ydStr : id;
      
      if (dateFilter === 'today') matchesDate = td === todayStr || id === 'Today';
      else if (dateFilter === 'yesterday') matchesDate = td === ydStr || id === 'Yesterday';
      else if (dateFilter === '7days') {
        const itemDate = new Date(td);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchesDate = !isNaN(itemDate) && itemDate >= sevenDaysAgo;
      }
    }
    return matchesSearch && matchesDate;
  });

  const prepTasks = (tasks) => tasks.map(t => { const pn = notes.find(n => n.id === t.noteId); return { ...t, noteDate: pn?.date || 'Today' }; });
  const uniqueAssignees = [...new Set([...pendingTasks, ...completedTasks].map(t => t.assignee).filter(Boolean))].sort();
  const filteredNotes = getFilteredItems(notes);
  let filteredPending = getFilteredItems(prepTasks(pendingTasks));
  let filteredCompleted = getFilteredItems(prepTasks(completedTasks));
  if (assigneeFilter !== 'all') {
    const fn = t => assigneeFilter === 'unassigned' ? !t.assignee : t.assignee === assigneeFilter;
    filteredPending = filteredPending.filter(fn);
    filteredCompleted = filteredCompleted.filter(fn);
  }

  return (
    <div style={dk.root}>
      <h1 style={dk.title}>Memory Locker</h1>

      <div style={dk.toggleGrid}>
        {[{ id: 'notes', Icon: Archive, label: 'Notes (MOM)', count: `${notes.length} entries` }, { id: 'tasks', Icon: CheckCircle2, label: 'All Tasks', count: `${filteredPending.length + filteredCompleted.length} items` }].map(({ id, Icon, label, count }) => (
          <button key={id} style={dk.toggleBtn(view === id)} onClick={() => setView(id)}>
            <div style={dk.toggleIcon(view === id)}><Icon size={22} /></div>
            <div style={{ textAlign: 'center' }}>
              <span style={dk.toggleLabel(view === id)}>{label}</span>
              <span style={{ ...dk.toggleCount, display: 'block', marginTop: 2 }}>{count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={dk.filterRow}>
        <div style={dk.searchWrap}>
          <Search size={15} style={dk.searchIcon} />
          <input type="text" style={dk.searchInput} placeholder={`Search ${view}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div style={dk.filterWrap}>
          <Filter size={15} style={dk.filterIconAbs} />
          <select style={dk.filterSelect} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
          </select>
        </div>
        {view === 'tasks' && uniqueAssignees.length > 0 && (
          <div style={dk.filterWrap}>
            <Users size={15} style={dk.filterIconAbs} />
            <select style={dk.filterSelect} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {uniqueAssignees.map(e => <option key={e} value={e}>{e.split('@')[0]}</option>)}
            </select>
          </div>
        )}
      </div>

      {view === 'notes' ? (
        <div>
          <p style={dk.sectionLabel}>Chronological</p>
          {filteredNotes.length === 0 ? (
            <div style={dk.emptyBox}><Archive size={28} style={{ color: '#2a2a2a', margin: '0 auto 10px', display: 'block' }} /><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No memories found</p></div>
          ) : filteredNotes.map(note => (
            <div key={note.id} style={dk.noteCard}>
              <div style={{ flex: 1, paddingRight: 10, minWidth: 0 }} onClick={() => openNote(note.id)}>
                <h4 style={dk.noteTitle}>{note.title}</h4>
                <p style={{ fontSize: 11, color: '#4b5563', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.summary}</p>
                <div style={dk.noteMeta}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={9} />{note.date}</span>
                  <span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{note.time}</span>
                  <span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{note.source === 'talk' ? <MessageCircle size={9} /> : <Mic size={9} />}{note.source === 'talk' ? 'Talk' : 'Listen'}</span>
                  <span>•</span><span>{note.tasks.filter(t => !t.done).length} pending</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div onClick={() => openNote(note.id)} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronRight size={15} style={{ color: '#4b5563' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p style={dk.sectionLabel}><span>Pending</span><span style={dk.badge('amber')}>{filteredPending.length}</span></p>
          {filteredPending.length === 0 ? (
            <div style={dk.emptyBox}><CheckCircle2 size={24} style={{ color: '#34d399', margin: '0 auto 8px', display: 'block' }} /><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>All caught up!</p></div>
          ) : filteredPending.map(task => <TaskCard key={task.id} task={task} />)}

          {filteredCompleted.length > 0 && (
            <div style={{ marginTop: 20, opacity: 0.65 }}>
              <p style={dk.sectionLabel}><span>Completed</span><span style={dk.badge('green')}>{filteredCompleted.length}</span></p>
              {filteredCompleted.map(task => <TaskCard key={task.id} task={task} isCompleted />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}