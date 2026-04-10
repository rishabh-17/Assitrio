import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Calendar, Clock, Activity, CheckCircle2, Circle, FileText, Trash2, Pencil, Plus, X, Check, Mic, MessageCircle, Play, Square, Share2, Copy, Flag, Mail, Send, Zap, Target, Hash, Users, Compass } from 'lucide-react';
import { speak, stopSpeaking } from '../../services/speechService';

const dk = {
  root: { position: 'absolute', inset: 0, backgroundColor: '#111111', zIndex: 50, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' },
  header: { backgroundColor: '#161616', padding: '40px 20px 14px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: (bg, color) => ({ padding: 8, borderRadius: '50%', backgroundColor: bg, color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  body: { flex: 1, overflowY: 'auto', padding: '20px 20px 80px' },
  chipRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 },
  chip: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: bg, color, border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }),
  title: { fontSize: 22, fontWeight: 800, color: '#f9fafb', lineHeight: 1.3, letterSpacing: '-0.2px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 20, border: '1px solid #222', padding: '20px', marginBottom: 16 },
  cardLabel: (color) => ({ fontSize: 10, fontWeight: 800, color: color || '#4b5563', textTransform: 'uppercase', letterSpacing: '0.18em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }),
  summaryQuote: { fontSize: 15, fontWeight: 700, color: '#f3f4f6', borderLeft: '3px solid #6d5bfa', paddingLeft: 14, paddingTop: 4, paddingBottom: 4, fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 },
  summaryBody: { fontSize: 14, color: '#6b7280', lineHeight: 1.7 },
  sectionTitle: (color) => ({ fontSize: 9, fontWeight: 800, color: color || '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 6 }),
  participantBadge: { padding: '5px 12px', borderRadius: 8, backgroundColor: '#222', fontSize: 12, fontWeight: 700, color: '#9ca3af', border: '1px solid #2a2a2a' },
  bulletItem: { display: 'flex', gap: 10, fontSize: 13, color: '#9ca3af', fontWeight: 500, lineHeight: 1.5 },
  bulletDot: { width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6d5bfa', marginTop: 7, flexShrink: 0 },
  discussionItem: { fontSize: 13, color: '#d1d5db', fontWeight: 600, backgroundColor: '#222', padding: '12px 14px', borderRadius: 14, border: '1px solid #2a2a2a', lineHeight: 1.5 },
  decisionItem: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#6ee7b7', fontWeight: 700, backgroundColor: 'rgba(52,211,153,0.08)', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(52,211,153,0.15)', lineHeight: 1.5 },
  progressTrack: { height: 4, backgroundColor: '#222', borderRadius: 99, overflow: 'hidden', marginBottom: 18 },
  progressBar: (pct) => ({ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6d5bfa, #9b5de5)', width: `${pct}%`, transition: 'width 0.7s' }),
  taskItem: (done) => ({ padding: '14px', borderRadius: 16, border: `2px solid ${done ? '#1f1f1f' : '#2a2a2a'}`, backgroundColor: done ? '#161616' : '#222', display: 'flex', alignItems: 'flex-start', gap: 12, opacity: done ? 0.5 : 1, marginBottom: 10 }),
  taskText: (done) => ({ fontSize: 13, fontWeight: 700, color: done ? '#4b5563' : '#f3f4f6', textDecoration: done ? 'line-through' : 'none', margin: '0 0 8px' }),
  taskChip: (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: bg, color, border: `1px solid ${border}`, borderRadius: 99, padding: '3px 8px' }),
  transcriptToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer' },
  transcriptBody: { padding: '0 20px 20px' },
  playBtn: (playing) => ({ flex: 1, padding: '14px', borderRadius: 16, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', backgroundColor: playing ? '#f59e0b' : '#6d5bfa', boxShadow: `0 4px 16px ${playing ? 'rgba(245,158,11,0.3)' : 'rgba(109,91,250,0.35)'}` }),
  transcriptBox: { backgroundColor: '#0f0f0f', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', padding: '16px', borderRadius: 14, border: '1px solid #1f1f1f', maxHeight: 400, overflowY: 'auto' },
  diaryLine1: { padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(109,91,250,0.06)', border: '1px solid rgba(109,91,250,0.12)', marginRight: 16, marginBottom: 8, lineHeight: 1.5 },
  diaryLine2: { padding: '10px 12px', borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #222', marginLeft: 16, marginBottom: 8, lineHeight: 1.5 },
  modal: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#161616', borderRadius: 24, border: '1px solid #222', padding: '24px', width: '100%', maxWidth: 360, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' },
  sheetOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { backgroundColor: '#161616', borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', maxWidth: 480, padding: '20px 20px 36px', border: '1px solid #222' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#2a2a2a', borderRadius: 99, margin: '0 auto 16px' },
  sheetTitle: { fontSize: 16, fontWeight: 800, color: '#f9fafb', textAlign: 'center', marginBottom: 20 },
  shareBtn: (bg) => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, backgroundColor: '#1a1a1a', border: '1px solid #222', cursor: 'pointer', marginBottom: 10 }),
  shareIcon: (bg) => ({ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  penBtn: { padding: 6, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};

export default function NoteDetail({ note, onClose, toggleTask, deleteNote, updateNote, updateTask, deleteTask, addTask }) {
  if (!note) return null;

  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskValue, setEditTaskValue] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const editInputRef = useRef(null);
  const editTaskRef = useRef(null);
  const newTaskRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => { if (editingField && editInputRef.current) editInputRef.current.focus(); }, [editingField]);
  useEffect(() => { if (editingTaskId && editTaskRef.current) editTaskRef.current.focus(); }, [editingTaskId]);
  useEffect(() => { if (showAddTask && newTaskRef.current) newTaskRef.current.focus(); }, [showAddTask]);
  useEffect(() => { return () => { stopSpeaking(); if (audioPlayerRef.current) audioPlayerRef.current.pause(); }; }, []);

  const completedCount = note.tasks.filter(t => t.done).length;
  const totalCount = note.tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const togglePlayback = (e) => {
    e.stopPropagation();
    if (isPlaying) { stopSpeaking(); if (audioPlayerRef.current) audioPlayerRef.current.pause(); setIsPlaying(false); }
    else {
      setIsPlaying(true);
      if (note.audioUrl) { audioPlayerRef.current = new Audio(note.audioUrl); audioPlayerRef.current.onended = () => setIsPlaying(false); audioPlayerRef.current.play().catch(() => setIsPlaying(false)); }
      else speak(note.transcript || note.mom, { onEnd: () => setIsPlaying(false), onError: () => setIsPlaying(false) });
    }
  };

  const formatShareText = () => {
    let text = `📝 *${note.title}*\n📅 ${note.date} • ⏱ ${note.duration} • 🕐 ${note.time}\n\n`;
    if (note.summaryDetailed || note.summaryShort || note.summary) text += `*✨ AI Summary*\n${note.summaryDetailed || note.summaryShort || note.summary}\n\n`;
    if (note.mom) text += `*📋 Minutes of Meeting*\n${note.mom}\n\n`;
    if (note.tasks?.length > 0) { text += `*✅ Tasks (${completedCount}/${totalCount})*\n`; note.tasks.forEach(t => { text += `${t.done ? '☑️' : '⬜'} ${t.text}${t.date ? ` (${t.date})` : ''}\n`; }); text += '\n'; }
    const noteIdStr = String(note.id); let hash = 0;
    for (let i = 0; i < noteIdStr.length; i++) { hash = ((hash << 5) - hash) + noteIdStr.charCodeAt(i); hash |= 0; }
    const accessCode = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
    const shareId = noteIdStr.split('-')[0] || noteIdStr.substring(0, 8);
    text += `🎧 *Secure Recording Access*\nLink: https://app.assistrio.com/recording/${shareId}\nAccess Code: ${accessCode}\n\n— Shared via Assistrio`;
    return text;
  };

  const handleShareWhatsApp = () => { const text = formatShareText(); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); setShowShareSheet(false); };
  const handleCopyShare = async () => { try { await navigator.clipboard.writeText(formatShareText()); } catch { } setCopySuccess(true); setTimeout(() => { setCopySuccess(false); setShowShareSheet(false); }, 1500); };
  const startEdit = (field) => { setEditingField(field); setEditValue(note[field]); };
  const saveEdit = () => { if (editingField && editValue.trim()) updateNote(note.id, { [editingField]: editValue.trim() }); setEditingField(null); setEditValue(''); };
  const cancelEdit = () => { setEditingField(null); setEditValue(''); };
  const startTaskEdit = (task) => { setEditingTaskId(task.id); setEditTaskValue(task.text); };
  const saveTaskEdit = () => { if (editingTaskId && editTaskValue.trim()) updateTask(note.id, editingTaskId, editTaskValue.trim()); setEditingTaskId(null); setEditTaskValue(''); };
  const handleAddTask = () => { if (newTaskText.trim()) { addTask(note.id, newTaskText.trim()); setNewTaskText(''); setShowAddTask(false); } };
  const handleDeleteNote = () => { deleteNote(note.id); onClose(); };

  const sentimentStyle = note.sentiment === 'Positive' ? { bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' } : note.sentiment === 'Negative' ? { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' } : { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };

  const inputStyle = { width: '100%', backgroundColor: '#222', border: '1px solid #2a2a2a', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#f3f4f6', fontWeight: 600, outline: 'none', boxSizing: 'border-box', resize: 'none' };

  return (
    <div style={dk.root}>
      {/* Header */}
      <div style={dk.header}>
        <button style={dk.backBtn} onClick={onClose}><ChevronLeft size={19} /> Back</button>
        <div style={dk.headerActions}>
          <button style={dk.iconBtn('rgba(109,91,250,0.1)', '#a78bfa')} onClick={() => setShowShareSheet(true)} aria-label="Share"><Share2 size={15} /></button>
          {deleteNote && <button style={dk.iconBtn('rgba(239,68,68,0.1)', '#f87171')} onClick={() => setShowDeleteConfirm(true)} aria-label="Delete"><Trash2 size={15} /></button>}
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={dk.modal}>
          <div style={dk.modalBox}>
            <div style={{ width: 48, height: 48, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Trash2 size={20} style={{ color: '#f87171' }} /></div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f9fafb', textAlign: 'center', margin: '0 0 8px' }}>Delete Memory?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>This will permanently remove this note and all {totalCount} tasks.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, backgroundColor: '#222', border: '1px solid #2a2a2a', color: '#9ca3af', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteNote} style={{ flex: 1, padding: '12px', borderRadius: 12, backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Sheet */}
      {showShareSheet && (
        <div style={dk.sheetOverlay} onClick={() => setShowShareSheet(false)}>
          <div style={dk.sheet} onClick={e => e.stopPropagation()}>
            <div style={dk.sheetHandle} />
            <h3 style={dk.sheetTitle}>Share Note</h3>
            <button onClick={handleShareWhatsApp} style={dk.shareBtn()}>
              <div style={dk.shareIcon('#22c55e')}><Send size={20} style={{ color: '#fff' }} /></div>
              <div style={{ textAlign: 'left' }}><p style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', margin: '0 0 2px' }}>WhatsApp</p><p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>Send formatted report</p></div>
            </button>
            <button onClick={handleCopyShare} style={dk.shareBtn()}>
              <div style={dk.shareIcon(copySuccess ? '#22c55e' : '#6d5bfa')}><Copy size={20} style={{ color: '#fff' }} /></div>
              <div style={{ textAlign: 'left' }}><p style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', margin: '0 0 2px' }}>{copySuccess ? 'Copied!' : 'Copy Link'}</p><p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>Copy to clipboard</p></div>
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={dk.body}>
        {/* Chip row */}
        <div style={dk.chipRow}>
          <div style={dk.chip(sentimentStyle.bg, sentimentStyle.color, sentimentStyle.border)}><Zap size={11} />{note.sentiment || 'Analyzing'}</div>
          {note.callStatus && <div style={dk.chip('#1a1a1a', '#6b7280', '#222')}>{note.callStatus}</div>}
          {note.keywords?.map(tag => <div key={tag} style={dk.chip('#161616', '#4b5563', '#1f1f1f')}><Hash size={9} />{tag}</div>)}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
          {editingField === 'title' ? (
            <div style={{ flex: 1 }}>
              <input ref={editInputRef} value={editValue} onChange={e => setEditValue(e.target.value)} style={{ ...inputStyle, fontSize: 20, fontWeight: 800, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveEdit} style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: '#6d5bfa', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={cancelEdit} style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: '#222', border: '1px solid #2a2a2a', color: '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb', lineHeight: 1.3, flex: 1, margin: 0 }}>{note.title}</h1>
              <button style={dk.penBtn} onClick={() => startEdit('title')}><Pencil size={14} style={{ color: '#374151' }} /></button>
            </>
          )}
        </div>

        {/* Summary */}
        <div style={{ ...dk.card, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.04, pointerEvents: 'none' }}><Target size={80} style={{ color: '#fff' }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={dk.cardLabel('#8b5cf6')}><Activity size={15} />Executive Summary</p>
            <button style={dk.penBtn} onClick={() => startEdit('summary')}><Pencil size={12} style={{ color: '#374151' }} /></button>
          </div>
          {note.summaryShort && <p style={dk.summaryQuote}>{note.summaryShort}</p>}
          <p style={dk.summaryBody}>{note.summaryDetailed || note.summary}</p>
        </div>

        {/* Detailed MOM */}
        {note.detailedMom && (
          <div style={dk.card}>
            <p style={dk.cardLabel()}><Compass size={15} />Structured Minutes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {note.detailedMom.participants?.length > 0 && (
                <div>
                  <p style={{ ...dk.sectionTitle(), marginBottom: 10 }}><Users size={11} />Participants</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{note.detailedMom.participants.map(p => <span key={p} style={dk.participantBadge}>{p}</span>)}</div>
                </div>
              )}
              {note.detailedMom.agenda?.length > 0 && (
                <div>
                  <p style={{ ...dk.sectionTitle(), marginBottom: 10 }}><Target size={11} />Agenda</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{note.detailedMom.agenda.map((item, i) => <div key={i} style={dk.bulletItem}><div style={dk.bulletDot} />{item}</div>)}</div>
                </div>
              )}
              {note.detailedMom.discussion?.length > 0 && (
                <div>
                  <p style={{ ...dk.sectionTitle(), marginBottom: 10 }}><MessageCircle size={11} />Key Discussion Points</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{note.detailedMom.discussion.map((item, i) => <div key={i} style={dk.discussionItem}>{item}</div>)}</div>
                </div>
              )}
              {note.detailedMom.decisions?.length > 0 && (
                <div>
                  <p style={{ ...dk.sectionTitle('#34d399'), marginBottom: 10 }}><CheckCircle2 size={11} />Decisions Made</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{note.detailedMom.decisions.map((item, i) => <div key={i} style={dk.decisionItem}><Check size={15} style={{ flexShrink: 0, marginTop: 2 }} />{item}</div>)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div style={dk.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={dk.cardLabel()}><CheckCircle2 size={15} />Action Items ({completedCount}/{totalCount})</p>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6' }}>{progress}% COMPLETE</span>
          </div>
          <div style={dk.progressTrack}><div style={dk.progressBar(progress)} /></div>
          <div>
            {note.tasks.map(task => (
              <div key={task.id} style={dk.taskItem(task.done)}>
                <button onClick={() => toggleTask(note.id, task.id)} style={{ color: task.done ? '#34d399' : '#374151', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}>
                  {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={dk.taskText(task.done)}>{task.text}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {task.date && <span style={dk.taskChip('rgba(109,91,250,0.1)', '#a78bfa', 'rgba(109,91,250,0.2)')}>{task.date}</span>}
                    {task.priority && task.priority !== 'Normal' && <span style={dk.taskChip(task.priority === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', task.priority === 'Critical' ? '#f87171' : '#fbbf24', task.priority === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)')}>{task.priority}</span>}
                    {task.assignee && <span style={dk.taskChip('rgba(167,139,250,0.1)', '#a78bfa', 'rgba(167,139,250,0.2)')}>@{task.assignee.split('@')[0]}</span>}
                  </div>
                </div>
              </div>
            ))}
            {showAddTask ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input ref={newTaskRef} value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddTask(false); }} placeholder="New task..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleAddTask} style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#6d5bfa', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Check size={15} /></button>
                <button onClick={() => setShowAddTask(false)} style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#222', border: '1px solid #2a2a2a', color: '#6b7280', cursor: 'pointer' }}><X size={15} /></button>
              </div>
            ) : (
              <button onClick={() => setShowAddTask(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, fontWeight: 700, color: '#6d5bfa', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={15} />Add Task</button>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div style={{ ...dk.card, padding: 0, overflow: 'hidden' }}>
          <button style={dk.transcriptToggle} onClick={() => setShowTranscript(!showTranscript)}>
            <p style={dk.cardLabel()}><FileText size={15} />Extended Transcript {note.diarization?.length > 0 && <span style={{ fontSize: 8, fontWeight: 800, backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>DIARIZED</span>}</p>
            <ChevronDown size={16} style={{ color: '#374151', transform: showTranscript ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showTranscript && (
            <div style={dk.transcriptBody}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button onClick={togglePlayback} style={dk.playBtn(isPlaying)}>{isPlaying ? 'Stop Playback' : 'Listen to Recording'}</button>
              </div>
              <div style={dk.transcriptBox}>
                {note.diarization?.length > 0 ? note.diarization.map((line, i) => (
                  <div key={i} style={line.includes('Speaker 2') ? dk.diaryLine2 : dk.diaryLine1}>{line}</div>
                )) : <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7, margin: 0 }}>{note.transcript}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}