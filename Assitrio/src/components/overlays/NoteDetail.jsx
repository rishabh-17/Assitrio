import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  Clock,
  Activity,
  CheckCircle2,
  Circle,
  FileText,
  Trash2,
  Pencil,
  Plus,
  X,
  Check,
  Save,
  Mic,
  MessageCircle,
  Play,
  Square,
  Share2,
  Copy,
  ExternalLink,
  Flag,
  UserPlus,
  Mail,
  Send,
  Zap,
  Target,
  Hash,
  Users,
  Compass
} from "lucide-react";
import { speak, stopSpeaking } from '../../services/speechService';

export default function NoteDetail({
  note,
  onClose,
  toggleTask,
  deleteNote,
  updateNote,
  updateTask,
  deleteTask,
  addTask,
}) {
  if (!note) return null;

  const [editingField, setEditingField] = useState(null); // 'title' | 'summary' | 'mom' | null
  const [editValue, setEditValue] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskValue, setEditTaskValue] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState(null);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const assignInputRef = useRef(null);

  const editInputRef = useRef(null);
  const editTaskRef = useRef(null);
  const newTaskRef = useRef(null);

  // Auto-focus edit inputs
  useEffect(() => {
    if (editingField && editInputRef.current) editInputRef.current.focus();
  }, [editingField]);
  useEffect(() => {
    if (editingTaskId && editTaskRef.current) editTaskRef.current.focus();
  }, [editingTaskId]);
  useEffect(() => {
    if (showAddTask && newTaskRef.current) newTaskRef.current.focus();
  }, [showAddTask]);
  useEffect(() => {
    if (assigningTaskId && assignInputRef.current) assignInputRef.current.focus();
  }, [assigningTaskId]);

  const audioPlayerRef = useRef(null);

  // Clean up speech on close
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
    };
  }, []);

  const togglePlayback = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopSpeaking();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (note.audioUrl) {
        audioPlayerRef.current = new Audio(note.audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
        audioPlayerRef.current.play().catch(() => setIsPlaying(false));
      } else {
        speak(note.transcript || note.mom, {
          onEnd: () => setIsPlaying(false),
          onError: () => setIsPlaying(false)
        });
      }
    }
  };

  const completedCount = note.tasks.filter((t) => t.done).length;
  const totalCount = note.tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Share Helpers ──
  const formatShareText = () => {
    let text = `📝 *${note.title}*\n`;
    text += `📅 ${note.date} • ⏱ ${note.duration} • 🕐 ${note.time}\n\n`;

    if (note.summaryDetailed || note.summaryShort || note.summary) {
      text += `*✨ AI Summary*\n${note.summaryDetailed || note.summaryShort || note.summary}\n\n`;
    }

    if (note.mom) {
      text += `*📋 Minutes of Meeting*\n${note.mom}\n\n`;
    }

    if (note.tasks && note.tasks.length > 0) {
      text += `*✅ Tasks (${completedCount}/${totalCount})*\n`;
      note.tasks.forEach((t) => {
        text += `${t.done ? '☑️' : '⬜'} ${t.text}${t.date ? ` (${t.date})` : ''}\n`;
      });
      text += '\n';
    }

    // Generate a consistent 6-digit access code based on note ID
    const noteIdStr = String(note.id);
    let hash = 0;
    for (let i = 0; i < noteIdStr.length; i++) {
      hash = ((hash << 5) - hash) + noteIdStr.charCodeAt(i);
      hash |= 0;
    }
    const accessCode = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
    const shareId = noteIdStr.split('-')[0] || noteIdStr.substring(0, 8);

    text += `🎧 *Secure Recording Access*\n`;
    text += `Link: https://app.assistrio.com/recording/${shareId}\n`;
    text += `Access Code: ${accessCode}\n\n`;

    text += `— Shared via Assistrio`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const text = formatShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    setShowShareSheet(false);
  };

  const handleCopyShare = async () => {
    const text = formatShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareSheet(false);
      }, 1500);
    } catch (err) {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareSheet(false);
      }, 1500);
    }
  };

  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(note[field]);
  };

  const saveEdit = () => {
    if (editingField && editValue.trim()) {
      updateNote(note.id, { [editingField]: editValue.trim() });
    }
    setEditingField(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  // ── Task Edit Handlers ──
  const startTaskEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTaskValue(task.text);
  };

  const saveTaskEdit = () => {
    if (editingTaskId && editTaskValue.trim()) {
      updateTask(note.id, editingTaskId, editTaskValue.trim());
    }
    setEditingTaskId(null);
    setEditTaskValue("");
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditTaskValue("");
  };

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(note.id, newTaskText.trim());
      setNewTaskText("");
      setShowAddTask(false);
    }
  };

  const handleDeleteNote = () => {
    deleteNote(note.id);
    onClose();
  };

  const sentimentColor = 
    note.sentiment === 'Positive' ? 'text-emerald-500 bg-emerald-50' :
    note.sentiment === 'Negative' ? 'text-red-500 bg-red-50' :
    'text-blue-500 bg-blue-50';

  return (
    <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-slide-right">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-slate-500 font-bold text-[13px] hover:text-brand-600 transition-colors"
        >
          <ChevronLeft size={20} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2 bg-brand-50 rounded-full text-brand-400 hover:text-brand-600 hover:bg-brand-100 transition-colors"
            aria-label="Share this note"
          >
            <Share2 size={16} />
          </button>
          {deleteNote && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-red-50 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
              aria-label="Delete this note"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-slide-up">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Memory?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This will permanently remove this note, its summary, MOM, and all {totalCount} tasks.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Cancel</button>
              <button onClick={handleDeleteNote} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Bottom Sheet */}
      {showShareSheet && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-end justify-center animate-fade-in" onClick={() => setShowShareSheet(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Share Note</h3>
            <div className="space-y-3 mt-6">
              <button onClick={handleShareWhatsApp} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 group">
                <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center"><Send size={24} className="text-white" /></div>
                <div className="flex-1 text-left"><p className="text-sm font-bold">WhatsApp</p><p className="text-[11px] text-slate-400">Send formatted report</p></div>
              </button>
              <button onClick={handleCopyShare} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${copySuccess ? 'bg-emerald-500' : 'bg-brand-500'}`}><Copy size={22} className="text-white" /></div>
                <div className="flex-1 text-left"><p className="text-sm font-bold">{copySuccess ? 'Copied!' : 'Copy Link'}</p><p className="text-[11px] text-slate-400">Copy to clipboard</p></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 pb-24 scrollbar-hide">
        {/* Elite Analytics Bar */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-1">
          <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-sm ${sentimentColor}`}>
            <Zap size={12} /> {note.sentiment || 'Analyzing'}
          </div>
          {note.callStatus && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
               {note.callStatus}
            </div>
          )}
          {note.keywords?.map(tag => (
             <div key={tag} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-slate-400 border border-slate-100 shadow-sm">
                <Hash size={10} /> {tag}
             </div>
          ))}
        </div>

        {/* Title Section */}
        <div className="group/title flex items-start gap-2 mb-6">
          <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight flex-1">
            {note.title}
          </h1>
          <button onClick={() => startEdit("title")} className="p-1.5 text-slate-300 hover:text-brand-500 opacity-0 group-hover/title:opacity-100 transition-all"><Pencil size={14} /></button>
        </div>

        {/* Dynamic Summary Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden group/summary">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={80} /></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={16} /> Executive Summary
            </h3>
            <button onClick={() => startEdit("summary")} className="p-1 text-slate-300 hover:text-brand-500 opacity-0 group-hover/summary:opacity-100 transition-all"><Pencil size={12} /></button>
          </div>
          
          <div className="space-y-4">
             {note.summaryShort && (
                <p className="text-slate-900 text-[15px] font-bold leading-relaxed border-l-4 border-brand-500 pl-4 py-1 italic">
                   {note.summaryShort}
                </p>
             )}
             <p className="text-slate-600 text-[14px] leading-relaxed">
               {note.summaryDetailed || note.summary}
             </p>
          </div>
        </div>

        {/* Detailed MOM Section (Grid/Structured) */}
        {note.detailedMom && (
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Compass size={16} /> Structured Minutes
              </h3>
              
              <div className="grid gap-6">
                  {note.detailedMom.participants?.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5"><Users size={12} /> Participants</h4>
                       <div className="flex flex-wrap gap-2">
                          {note.detailedMom.participants.map(p => (
                             <span key={p} className="px-3 py-1 rounded-lg bg-slate-50 text-[12px] font-bold text-slate-700 border border-slate-100">{p}</span>
                          ))}
                       </div>
                    </div>
                  )}

                  {note.detailedMom.agenda?.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5"><Target size={12} /> Agenda</h4>
                       <ul className="space-y-1.5">
                          {note.detailedMom.agenda.map((item, i) => (
                             <li key={i} className="text-[13px] text-slate-700 font-medium flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" /> {item}
                             </li>
                          ))}
                       </ul>
                    </div>
                  )}

                  {note.detailedMom.discussion?.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5"><MessageCircle size={12} /> Key Discussion Points</h4>
                       <ul className="space-y-3">
                          {note.detailedMom.discussion.map((item, i) => (
                             <li key={i} className="text-[13px] text-slate-700 leading-relaxed font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                {item}
                             </li>
                          ))}
                       </ul>
                    </div>
                  )}

                  {note.detailedMom.decisions?.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1.5"><CheckCircle2 size={12} /> Decisions Made</h4>
                       <ul className="space-y-2">
                          {note.detailedMom.decisions.map((item, i) => (
                             <li key={i} className="text-[13px] text-emerald-800 font-bold bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex gap-2">
                                <Check size={16} className="shrink-0 mt-0.5" /> {item}
                             </li>
                          ))}
                       </ul>
                    </div>
                  )}
              </div>
           </div>
        )}

        {/* Tasks Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <CheckCircle2 size={16} /> Action Items ({completedCount}/{totalCount})
              </h3>
              <div className="text-[10px] font-black text-brand-600">{progress}% COMPLETE</div>
           </div>
           
           <div className="w-full bg-slate-100 h-1.5 rounded-full mb-6 overflow-hidden">
               <div className="bg-brand-500 h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
           </div>

           <div className="space-y-3">
              {note.tasks.map(task => (
                 <div key={task.id} className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${task.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-50 hover:border-brand-200'}`}>
                    <button onClick={() => toggleTask(note.id, task.id)} className={`mt-0.5 shrink-0 ${task.done ? 'text-emerald-500' : 'text-slate-300'}`}>
                       {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="flex-1">
                       <p className={`text-[13px] font-black ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.text}</p>
                       <div className="flex gap-2 mt-2">
                          {task.date && <span className="text-[9px] font-black uppercase text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">{task.date}</span>}
                          {task.priority && task.priority !== 'Normal' && <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${task.priority === 'Critical' ? 'text-red-600 bg-red-50 border-red-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>{task.priority}</span>}
                          {task.assignee && <span className="text-[9px] font-black uppercase text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">@{task.assignee.split('@')[0]}</span>}
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Transcript / Call History Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
           <button onClick={() => setShowTranscript(!showTranscript)} className="w-full flex items-center justify-between p-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <FileText size={16} /> Extended Transcript {note.diarization?.length > 0 && <span className="ml-2 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px]">DIARIZED</span>}
              </h3>
              <ChevronDown size={18} className={`text-slate-300 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
           </button>
           
           {showTranscript && (
              <div className="px-6 pb-6 animate-slide-up space-y-4">
                 <div className="flex gap-3 mb-4">
                    <button onClick={togglePlayback} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPlaying ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-900 text-white shadow-xl'}`}>
                       {isPlaying ? 'Stop Playback' : 'Listen to Recording'}
                    </button>
                 </div>

                 <div className="bg-slate-50 font-mono text-[11px] text-slate-600 p-5 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto scrollbar-hide space-y-3">
                    {note.diarization?.length > 0 ? (
                       note.diarization.map((line, i) => (
                          <div key={i} className={`p-3 rounded-xl ${line.includes('Speaker 2') ? 'bg-white border border-slate-100 ml-4' : 'bg-brand-50/50 border border-brand-100 mr-4'}`}>
                             {line}
                          </div>
                       ))
                    ) : (
                       <p className="whitespace-pre-line leading-relaxed">{note.transcript}</p>
                    )}
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
