import React, { useState, useRef, useEffect } from 'react';
import { Archive, CheckCircle2, Circle, ChevronRight, ChevronDown, Calendar, Clock, Trash2, Pencil, Check, X, Search, Filter, FileText, Mic, MessageCircle, Flag, Mail, Users } from 'lucide-react';

const dk = {
  root: { padding: '20px 16px 100px', backgroundColor: '#111111', minHeight: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' },
  title: { fontSize: 22, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.3px', paddingTop: 24, marginBottom: 20 },
  toggleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
  toggleBtn: (active) => ({ padding: 12, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: `1px solid ${active ? 'rgba(109,91,250,0.6)' : '#222'}`, backgroundColor: active ? 'rgba(109,91,250,0.08)' : '#1a1a1a', cursor: 'pointer' }),
  toggleIcon: (active) => ({ padding: 8, borderRadius: 12, backgroundColor: active ? 'rgba(109,91,250,0.2)' : '#222', color: active ? '#a78bfa' : '#4b5563' }),
  toggleLabel: (active) => ({ fontSize: 11, fontWeight: 800, color: active ? '#c4b5fd' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }),
  toggleCount: { fontSize: 9, color: '#4b5563', fontWeight: 600 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 140 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' },
  searchInput: { width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 13, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' },
  filterSelect: { paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 13, color: '#9ca3af', outline: 'none', appearance: 'none', position: 'relative' },
  dateInput: { paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 13, color: '#f3f4f6', outline: 'none', boxSizing: 'border-box', minWidth: 140 },
  filterWrap: { position: 'relative' },
  filterIconAbs: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none', zIndex: 1 },
  dropdownIconAbs: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none', zIndex: 1 },
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

export default function Locker({ notes = [], teamNotes = [], teamEnabled = false, teamMembers = [], currentUserId = '', currentUserEmail = '', currentUserUsername = '', pendingTasks = [], completedTasks = [], toggleTask, openNote, deleteNote, deleteTask, updateTask }) {
  const [view, setView] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [notesScope, setNotesScope] = useState('my');
  const [tasksScope, setTasksScope] = useState('all');
  const [taskOwnershipFilter, setTaskOwnershipFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskValue, setEditTaskValue] = useState('');
  const [editAssigneeUserId, setEditAssigneeUserId] = useState('');
  const editRef = useRef(null);

  useEffect(() => { if (editingTaskId && editRef.current) editRef.current.focus(); }, [editingTaskId]);

  const startTaskEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTaskValue(task.text);
    setEditAssigneeUserId(task.assigneeUserId ? String(task.assigneeUserId) : '');
  };
  const saveTaskEdit = (noteId, scope) => {
    if (editingTaskId && editTaskValue.trim()) {
      const payload = { text: editTaskValue.trim() };
      if (scope === 'team') {
        payload.assigneeUserId = editAssigneeUserId || null;
        const member = editAssigneeUserId ? teamMembers.find((m) => String(m.userId) === String(editAssigneeUserId)) : null;
        payload.assignee = member ? (member.email || member.username || member.displayName || '') : '';
      }
      updateTask(noteId, editingTaskId, payload, scope);
    }
    setEditingTaskId(null);
    setEditTaskValue('');
    setEditAssigneeUserId('');
  };
  const cancelTaskEdit = () => { setEditingTaskId(null); setEditTaskValue(''); setEditAssigneeUserId(''); };

  const TaskCard = ({ task, isCompleted = false }) => {
    const isEditing = editingTaskId === task.id;
    const scope = task.scope || 'personal';
    const canDelete = scope !== 'team' || (task.createdByUserId && String(task.createdByUserId) === currentUserId);

    const selectedMember = scope === 'team' && editAssigneeUserId
      ? teamMembers.find((m) => String(m.userId) === String(editAssigneeUserId))
      : null;
    const assigneeLabel = selectedMember?.displayName || selectedMember?.username || selectedMember?.email || '';

    const taskAssigneeMember = scope === 'team' && task.assigneeUserId
      ? teamMembers.find((m) => String(m.userId) === String(task.assigneeUserId))
      : null;
    const displayAssignee = scope === 'team'
      ? (taskAssigneeMember?.displayName || taskAssigneeMember?.username || taskAssigneeMember?.email || task.assignee || '')
      : (task.assignee || '');

    return (
      <div style={dk.taskCard(isCompleted, isEditing)} onClick={() => !isEditing && openNote(task.noteId, 'mom', scope)}>
        {isEditing ? (
          <div style={{ flex: 1 }}>
            <input ref={editRef} value={editTaskValue} onChange={(e) => setEditTaskValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTaskEdit(task.noteId, scope); if (e.key === 'Escape') cancelTaskEdit(); }}
              style={dk.editInput} />
            {scope === 'team' && teamMembers.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ position: 'relative' }}>
                  <Users size={13} style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', color: '#374151' }} />
                  <select
                    value={editAssigneeUserId}
                    onChange={(e) => setEditAssigneeUserId(e.target.value)}
                    style={{ width: '100%', marginLeft: 18, padding: '8px 10px', backgroundColor: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, color: '#9ca3af', fontSize: 12, fontWeight: 700, outline: 'none', appearance: 'none' }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={String(m.userId)} value={String(m.userId)}>
                        {(m.displayName || m.username || m.email || 'Member')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div style={dk.editActions}>
              <button onClick={(e) => { e.stopPropagation(); saveTaskEdit(task.noteId, scope); }} style={dk.editBtn(true)}><Check size={12} /> Save</button>
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
                {displayAssignee && (
                  <span style={dk.chip('rgba(167,139,250,0.1)', isCompleted ? '#4b5563' : '#a78bfa', 'rgba(167,139,250,0.2)')}>
                    <Mail size={8} />{displayAssignee.split('@')[0]}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#4b5563' }}>
                <FileText size={10} style={{ flexShrink: 0 }} />{task.noteTitle}
                <ChevronRight size={12} style={{ color: '#2a2a2a' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); startTaskEdit(task); }} style={{ ...dk.actionBtn(), color: '#374151' }}><Pencil size={13} /></button>
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); deleteTask(task.noteId, task.id, scope); }} style={{ ...dk.actionBtn(), color: '#374151' }}><Trash2 size={13} /></button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const localISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseToISODate = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const now = new Date();
    if (s === 'Today') return localISODate(now);
    if (s === 'Yesterday') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return localISODate(d);
    }

    const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (dmy) {
      const day = Number(dmy[1]);
      const mon = dmy[2].toLowerCase();
      const year = Number(dmy[3]);
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const monthIndex = months[mon];
      if (monthIndex === undefined) return null;
      const dt = new Date(year, monthIndex, day, 0, 0, 0, 0);
      if (Number.isNaN(dt.getTime())) return null;
      return localISODate(dt);
    }

    const mdy = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
    if (mdy) {
      const mon = mdy[1].toLowerCase();
      const day = Number(mdy[2]);
      const year = Number(mdy[3]);
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const monthIndex = months[mon];
      if (monthIndex === undefined) return null;
      const dt = new Date(year, monthIndex, day, 0, 0, 0, 0);
      if (Number.isNaN(dt.getTime())) return null;
      return localISODate(dt);
    }

    const dt = new Date(s);
    if (!Number.isNaN(dt.getTime())) return localISODate(dt);
    return null;
  };

  const getFilteredItems = (items) => items.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || ['title', 'summary', 'text', 'transcript', 'mom'].some(k => item[k]?.toLowerCase().includes(q));
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const now = new Date();
      const todayISO = localISODate(now);
      const yd = new Date(now); yd.setDate(yd.getDate() - 1);
      const yesterdayISO = localISODate(yd);

      const id = item.date || item.noteDate;
      const itemISO = parseToISODate(id);

      if (dateFilter === 'today') matchesDate = itemISO === todayISO;
      else if (dateFilter === 'yesterday') matchesDate = itemISO === yesterdayISO;
      else if (dateFilter === '7days') {
        const itemDate = itemISO ? new Date(`${itemISO}T00:00:00`) : null;
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchesDate = !!itemDate && !Number.isNaN(itemDate.getTime()) && itemDate >= sevenDaysAgo;
      } else if (dateFilter === 'custom') {
        if (!itemISO) return false;
        let from = customFrom || '';
        let to = customTo || '';
        if (from && to && from > to) {
          const tmp = from;
          from = to;
          to = tmp;
        }
        if (from && itemISO < from) return false;
        if (to && itemISO > to) return false;
        matchesDate = true;
      }
    }
    return matchesSearch && matchesDate;
  });

  const noteIndex = new Map([...(notes || []), ...(teamNotes || [])].map((n) => [n.id, n]));
  const prepTasks = (tasks) => tasks.map(t => {
    const pn = noteIndex.get(t.noteId);
    const noteDate = pn?.date || 'Today';
    const noteTitle = pn?.title || t.noteTitle;
    const scope = pn?.teamId ? 'team' : (t.scope || 'personal');
    return { ...t, noteDate, noteTitle, scope };
  });

  const uniqueAssignees = [...new Set([...pendingTasks, ...completedTasks].map(t => t.assignee).filter(Boolean))].sort();
  const allNotesCount = (notes?.length || 0) + (teamEnabled ? (teamNotes?.length || 0) : 0);
  const activeNotes = (teamEnabled && notesScope === 'team') ? teamNotes : notes;
  const filteredNotes = getFilteredItems(activeNotes);
  let filteredPending = getFilteredItems(prepTasks(pendingTasks));
  let filteredCompleted = getFilteredItems(prepTasks(completedTasks));

  if (view === 'tasks') {
    const applyScope = (arr) => {
      if (tasksScope === 'my') return arr.filter((t) => t.scope !== 'team');
      if (tasksScope === 'team') return arr.filter((t) => t.scope === 'team');
      return arr;
    };
    filteredPending = applyScope(filteredPending);
    filteredCompleted = applyScope(filteredCompleted);

    const uid = String(currentUserId || '');
    const userEmail = String(currentUserEmail || '').toLowerCase();
    const userUsername = String(currentUserUsername || '').toLowerCase();
    const applyOwnershipFilter = (arr) => {
      if (taskOwnershipFilter === 'assigned_to_me') {
        return arr.filter((t) => {
          if (uid && String(t.assigneeUserId || '') === uid) return true;
          const a = (t.assignee || '').toLowerCase();
          if (!a) return false;
          if (userEmail && a === userEmail) return true;
          if (userUsername && (a === userUsername || a.split('@')[0] === userUsername)) return true;
          return false;
        });
      }
      if (taskOwnershipFilter === 'assigned_by_me') {
        return arr.filter((t) => uid && String(t.createdByUserId || '') === uid);
      }
      return arr;
    };

    filteredPending = applyOwnershipFilter(filteredPending);
    filteredCompleted = applyOwnershipFilter(filteredCompleted);
  }

  if (assigneeFilter !== 'all') {
    const fn = t => assigneeFilter === 'unassigned' ? !t.assignee : t.assignee === assigneeFilter;
    filteredPending = filteredPending.filter(fn);
    filteredCompleted = filteredCompleted.filter(fn);
  }

  const noteTabs = [
    { id: 'notes', Icon: Archive, label: 'Notes', count: `${allNotesCount}` },
    { id: 'tasks', Icon: CheckCircle2, label: 'All Tasks', count: `${filteredPending.length + filteredCompleted.length}` }
  ];

  return (
    <div style={dk.root}>
      <h1 style={dk.title}>Memory Locker</h1>

      <div style={dk.toggleGrid}>
        {noteTabs.map(({ id, Icon, label, count }) => (
          <button key={id} style={dk.toggleBtn(view === id)} onClick={() => setView(id)}>
            {/* <div style={dk.toggleIcon(view === id)}><Icon size={22} /></div> */}
            <div style={{ textAlign: 'center' }}>
              <span style={dk.toggleLabel(view === id)}>{label}<span style={{ ...dk.toggleCount, marginTop: 2, marginLeft: 2 }}>({count})</span></span>

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
        {view === 'notes' && teamEnabled && (
          <div style={dk.filterWrap}>
            <Users size={15} style={dk.filterIconAbs} />
            <select style={dk.filterSelect} value={notesScope} onChange={(e) => setNotesScope(e.target.value)}>
              <option value="my">My Notes</option>
              <option value="team">Team Notes</option>
            </select>
            <ChevronDown size={16} style={dk.dropdownIconAbs} />
          </div>
        )}
        {view === 'tasks' && teamEnabled && (
          <div style={dk.filterWrap}>
            <Users size={15} style={dk.filterIconAbs} />
            <select style={dk.filterSelect} value={tasksScope} onChange={(e) => { setTasksScope(e.target.value); }}>
              <option value="all">All Tasks</option>
              <option value="my">My Tasks</option>
              <option value="team">Team Tasks</option>
            </select>
            <ChevronDown size={16} style={dk.dropdownIconAbs} />
          </div>
        )}
        {view === 'tasks' && (
          <div style={dk.filterWrap}>
            <Mail size={15} style={dk.filterIconAbs} />
            <select style={dk.filterSelect} value={taskOwnershipFilter} onChange={(e) => setTaskOwnershipFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="assigned_to_me">Assigned to me</option>
              <option value="assigned_by_me">Assigned by me</option>
            </select>
            <ChevronDown size={16} style={dk.dropdownIconAbs} />
          </div>
        )}
        <div style={dk.filterWrap}>
          <Filter size={15} style={dk.filterIconAbs} />
          <select style={dk.filterSelect} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <ChevronDown size={16} style={dk.dropdownIconAbs} />
        </div>
        {dateFilter === 'custom' && (
          <>
            <div style={dk.filterWrap}>
              <Calendar size={15} style={dk.filterIconAbs} />
              <input type="date" style={dk.dateInput} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div style={dk.filterWrap}>
              <Calendar size={15} style={dk.filterIconAbs} />
              <input type="date" style={dk.dateInput} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}
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
          <p style={dk.sectionLabel}><span>{teamEnabled && notesScope === 'team' ? 'Team Notes' : 'My Notes'}</span><span style={dk.badge('amber')}>{filteredNotes.length}</span></p>
          {filteredNotes.length === 0 ? (
            <div style={dk.emptyBox}><Archive size={28} style={{ color: '#2a2a2a', margin: '0 auto 10px', display: 'block' }} /><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No memories found</p></div>
          ) : filteredNotes.map(note => (
            <div key={note.id} style={dk.noteCard}>
              <div style={{ flex: 1, paddingRight: 10, minWidth: 0 }} onClick={() => openNote(note.id, 'summary', teamEnabled && notesScope === 'team' ? 'team' : 'personal')}>
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
                <div onClick={() => openNote(note.id, 'summary', teamEnabled && notesScope === 'team' ? 'team' : 'personal')} style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
