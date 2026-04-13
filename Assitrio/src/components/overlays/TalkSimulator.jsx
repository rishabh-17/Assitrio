import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AudioLines, ChevronLeft, FileText } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { WavRecorder } from '../../utils/wavRecorder';
import { mergeWavBlobs, pcmChunksToWavBlob, mixWavBlobs } from '../../utils/wavMerge';
import { RealtimeWS } from '../../services/realtimeWS';
import { PCMPlayer } from '../../utils/pcmPlayer';
import { AZURE_REALTIME_ENDPOINT, AZURE_REALTIME_KEY, buildSystemPrompt, buildContextForQuery, getAIResponse } from '../../services/azureAI';
import { userAskedToCreateNote, userAskedToCreateTask, userAskedToScheduleMeeting } from '../../utils/noteIntents';
import { recordTalkUsage } from '../../services/usageTracker';
import { aiService } from '../../services/apiService';


const MAX_TRANSCRIPT_FOR_AI = 14000;

const MOM_JSON_INSTRUCTIONS = `You are an advanced AI Meeting Assistant. Analyze the provided transcript and generate a production-ready structured output in EXACTLY this JSON format (respond ONLY with the JSON block):

{
  "summary_short": "2-3 line concise summary",
  "summary_detailed": "Comprehensive paragraph summary",
  "assigneeUserId": "<TEAM_MEMBER_ID or null>",
  "mom": {
    "title": "Professional descriptive title",
    "date": "Current date or date mentioned",
    "participants": ["List of identified participants"],
    "agenda": ["Purpose of meeting"],
    "discussion": ["Key points discussed"],
    "decisions": ["Final decisions reached"],
    "action_items": ["Action items with owners if known"]
  },
  "tasks": [
    {
      "text": "Specific task description",
      "date": "Due date if mentioned, else null",
      "priority": "Critical | Important | Normal",
      "assignee": "Name or email if identified, else null",
      "assigneeUserId": "<TEAM_MEMBER_ID or null>"
    }
  ],
  "keywords": ["tag1", "tag2"],
  "sentiment": "Positive | Neutral | Negative",
  "diarization": [
    "[00:01] Speaker 1: Context line",
    "[00:02] Speaker 2: Response line"
  ],
  "call_status": "completed"
}

IMPORTANT RULES:
- Speaker 1 is the User, Speaker 2 is the AI Agent.
- ONLY create 'tasks' from what Speaker 1 (User) committed to or explicitly requested. Ignore AI suggestions.
- If no tasks found, set 'tasks' to [].
- Sentiment should reflect the overall tone.
- Translate any Hindi, Hinglish, or mixed language into standard, professional business English. All output MUST be in English.
- If the transcript assigns a task OR the entire note to a team member by name, you MUST set assigneeUserId using TEAM_MEMBERS (best match). If no match, set null.

TEAM_MEMBERS:
TEAM_MEMBERS_BLOCK

Transcript:
`;

function buildTeamDirectory(teamMembers = []) {
  const list = Array.isArray(teamMembers) ? teamMembers : [];
  if (list.length === 0) return '(none)';
  return list.map((m) => {
    const id = m?.userId || m?.id || '';
    const name = m?.displayName || '';
    const username = m?.username || '';
    const email = m?.email || '';
    return `- id: ${id} | name: ${name} | username: ${username} | email: ${email}`;
  }).join('\n');
}

const TASK_EXTRACT_INSTRUCTIONS = `The user just asked to create a task. Based on the recent conversation context, extract the single task Speaker 1 (User) is referring to. Respond ONLY with JSON:
{
  "text": "Clear description",
  "date": "Date if mentioned, else null",
  "priority": "Critical | Important | Normal",
  "assigneeUserId": "<TEAM_MEMBER_ID or null>"
}

IMPORTANT: If the user provides no specifics or context (e.g. they only say "create a task"), set "text" to "Pending requirement manually requested".
IMPORTANT: If the user says to assign the task to a team member by name, you MUST choose the best match from TEAM_MEMBERS and set assigneeUserId to that member's id. If no match, set it to null.

TEAM_MEMBERS:
TEAM_MEMBERS_BLOCK

Context:
`;

function formatTalkTranscript(msgs) {
  return msgs.filter(m => m.role === 'user' || m.role === 'ai').map((m, i) => {
    const label = m.role === 'user' ? 'Speaker 1 (User)' : 'Speaker 2 (AI Agent)';
    const t = (m.text || '').trim();
    if (!t) return null;
    return `[00:${String(Math.min(59, i)).padStart(2, '0')}] ${label}: ${t}`;
  }).filter(Boolean).join('\n\n');
}

export default function TalkSimulator({ onClose, notes = [], teamMembers = [], currentUserId = '', onSaveMOM, updateNote, appendActivities = () => { }, addTask, scheduleFromNote }) {
  const [inputMode, setInputMode] = useState('voice');
  const [voiceState, setVoiceState] = useState('idle');
  const [input, setInput] = useState('');
  const [livekitAvailable, setLivekitAvailable] = useState(false);
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hi Boss! I have your recent meetings loaded. Ask me anything. Say "create a note" anytime to save this chat, or "create a task" to add an action item.' }]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const scrollRef = useRef(null);
  const recorderRef = useRef(null);
  const wsRef = useRef(null);
  const pcmPlayerRef = useRef(null);
  const currentResponseTextRef = useRef('');
  const messagesRef = useRef(messages);
  const sessionWavBlobsRef = useRef([]);
  const pendingUserMsgIdRef = useRef(null);
  const autoNoteHandledForMessageIndex = useRef(-1);
  const autoTaskHandledForMessageIndex = useRef(-1);
  const autoMeetingHandledForMessageIndex = useRef(-1);
  const savedNoteIdRef = useRef(null);
  const aiAudioChunksRef = useRef([]);
  const sessionStartRef = useRef(Date.now());
  const livekitSessionRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const livekitAudioElsRef = useRef(new Map());
  // contextNotesRef holds the freshest notes from backend (MongoDB), falls back to prop notes
  const contextNotesRef = useRef(notes);
  messagesRef.current = messages;

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

  // (All existing useEffect hooks and handlers are kept exactly as-is — only UI is changed)
  useEffect(() => {
    pcmPlayerRef.current = new PCMPlayer(24000);
    let cancelled = false;

    // Fetch fresh context from backend (notes + tasks from MongoDB)
    const refreshBackendContext = async () => {
      try {
        const ctx = await aiService.getChatContext();
        if (!cancelled && ctx?.notes?.length > 0) {
          contextNotesRef.current = ctx.notes;
        }
      } catch (e) {
        // Fallback: use prop notes if backend context fetch fails
        contextNotesRef.current = notes;
      }
    };

    const initAzureSession = async () => {
      await refreshBackendContext();
      const ragPrompt = await buildContextForQuery('conversation summary tasks meetings', contextNotesRef.current);
      wsRef.current = new RealtimeWS(AZURE_REALTIME_ENDPOINT, AZURE_REALTIME_KEY, ragPrompt);
      wsRef.current.onOpen = () => { };
      wsRef.current.onAudioChunk = (b64) => { setVoiceState(vs => vs !== 'ai-speaking' ? 'ai-speaking' : vs); setIsTyping(false); pcmPlayerRef.current.appendBase64(b64); aiAudioChunksRef.current.push(b64); };
      wsRef.current.onText = (d) => { currentResponseTextRef.current += d; setMessages(prev => { const n = [...prev]; let i = n.length - 1; while (i >= 0 && n[i].role !== 'ai') i--; if (i < 0) return prev; n[i] = { ...n[i], text: currentResponseTextRef.current }; return n; }); };
      wsRef.current.onAudioDone = () => setVoiceState(recorderRef.current?.isRecording ? 'listening' : 'idle');
      wsRef.current.onSpeechStarted = () => { setVoiceState('listening'); if (pcmPlayerRef.current) pcmPlayerRef.current.reset(); };
      wsRef.current.onSpeechStopped = () => { const seg = recorderRef.current?.exportIncrementalWav?.(); if (seg?.size) sessionWavBlobsRef.current.push(seg); setVoiceState('processing'); setIsTyping(true); const pid = `u-${Date.now()}`; pendingUserMsgIdRef.current = pid; setMessages(p => [...p, { role: 'user', text: '🎤 Transcribing…', pendingUserId: pid }]); currentResponseTextRef.current = ''; setMessages(p => [...p, { role: 'ai', text: '' }]); };
      wsRef.current.onUserTranscript = (text) => { const pid = pendingUserMsgIdRef.current; pendingUserMsgIdRef.current = null; const cleaned = (text || '').trim() || '(voice)'; setMessages(prev => { const idx = pid ? prev.findIndex(m => m.pendingUserId === pid) : -1; if (idx >= 0) { const c = [...prev]; c[idx] = { ...c[idx], text: cleaned, pendingUserId: undefined }; return c; } return prev; }); };
      wsRef.current.onError = () => { setMessages(p => [...p, { role: 'ai', text: 'Boss, connection dropped. Let me know if we should restart.' }]); setVoiceState('idle'); setIsTyping(false); };
    };
    const initLivekit = async () => {
      try { const data = await aiService.getLivekitToken(); if (cancelled) return; if (data?.enabled && data?.url && data?.token && data?.roomName) { livekitSessionRef.current = { url: data.url, token: data.token, roomName: data.roomName }; setLivekitAvailable(true); return; } } catch { }
      if (!cancelled) await initAzureSession();
    };
    initLivekit();
    return () => { cancelled = true; if (recorderRef.current?.isRecording) recorderRef.current.stop(); if (pcmPlayerRef.current) pcmPlayerRef.current.close(); if (wsRef.current) wsRef.current.close(); if (livekitRoomRef.current) { try { livekitRoomRef.current.disconnect(); } catch { } livekitRoomRef.current = null; } for (const el of livekitAudioElsRef.current.values()) { try { el.pause(); } catch { } try { el.remove(); } catch { } } livekitAudioElsRef.current.clear(); };
  }, []);

  const ensureAzureSession = useCallback(async () => {
    if (wsRef.current) return;
    const ragPrompt = await buildContextForQuery('conversation summary tasks meetings', contextNotesRef.current);
    wsRef.current = new RealtimeWS(AZURE_REALTIME_ENDPOINT, AZURE_REALTIME_KEY, ragPrompt);
    wsRef.current.onAudioChunk = (b64) => { setVoiceState(vs => vs !== 'ai-speaking' ? 'ai-speaking' : vs); setIsTyping(false); pcmPlayerRef.current.appendBase64(b64); aiAudioChunksRef.current.push(b64); };
    wsRef.current.onText = (d) => { currentResponseTextRef.current += d; setMessages(prev => { const n = [...prev]; let i = n.length - 1; while (i >= 0 && n[i].role !== 'ai') i--; if (i < 0) return prev; n[i] = { ...n[i], text: currentResponseTextRef.current }; return n; }); };
    wsRef.current.onAudioDone = () => setVoiceState(recorderRef.current?.isRecording ? 'listening' : 'idle');
    wsRef.current.onSpeechStarted = () => { setVoiceState('listening'); if (pcmPlayerRef.current) pcmPlayerRef.current.reset(); };
    wsRef.current.onSpeechStopped = () => { const seg = recorderRef.current?.exportIncrementalWav?.(); if (seg?.size) sessionWavBlobsRef.current.push(seg); setVoiceState('processing'); setIsTyping(true); const pid = `u-${Date.now()}`; pendingUserMsgIdRef.current = pid; setMessages(p => [...p, { role: 'user', text: '🎤 Transcribing…', pendingUserId: pid }]); currentResponseTextRef.current = ''; setMessages(p => [...p, { role: 'ai', text: '' }]); };
    wsRef.current.onUserTranscript = (text) => { const pid = pendingUserMsgIdRef.current; pendingUserMsgIdRef.current = null; const cleaned = (text || '').trim() || '(voice)'; setMessages(prev => { const idx = pid ? prev.findIndex(m => m.pendingUserId === pid) : -1; if (idx >= 0) { const c = [...prev]; c[idx] = { ...c[idx], text: cleaned, pendingUserId: undefined }; return c; } return prev; }); };
    wsRef.current.onError = () => { setMessages(p => [...p, { role: 'ai', text: 'Boss, connection dropped.' }]); setVoiceState('idle'); setIsTyping(false); };
  }, []);

  const ensureLivekitSession = useCallback(async () => {
    if (livekitSessionRef.current) return livekitSessionRef.current;
    try { const data = await aiService.getLivekitToken(); if (data?.enabled && data?.url && data?.token && data?.roomName) { livekitSessionRef.current = { url: data.url, token: data.token, roomName: data.roomName }; setLivekitAvailable(true); return livekitSessionRef.current; } } catch { }
    setLivekitAvailable(false); return null;
  }, []);

  const startVoiceRecording = async () => {
    const lkSession = livekitAvailable ? (livekitSessionRef.current || await ensureLivekitSession()) : null;
    if (lkSession) {
      try {
        if (!livekitRoomRef.current) {
          const room = new Room({ adaptiveStream: true, dynacast: true });
          room.on(RoomEvent.ConnectionStateChanged, (state) => { const connected = state === 'connected'; setLivekitConnected(connected); if (!connected) setVoiceState('idle'); });
          room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => { if (participant?.isLocal || track.kind !== Track.Kind.Audio) return; const el = track.attach(); el.autoplay = true; el.playsInline = true; livekitAudioElsRef.current.set(publication.trackSid, el); try { document.body.appendChild(el); } catch { } setVoiceState('ai-speaking'); });
          room.on(RoomEvent.TrackUnsubscribed, (track, publication) => { if (track?.kind !== Track.Kind.Audio) return; const el = livekitAudioElsRef.current.get(publication.trackSid); if (el) { try { el.pause(); } catch { } try { el.remove(); } catch { } livekitAudioElsRef.current.delete(publication.trackSid); } setVoiceState(livekitRoomRef.current ? 'listening' : 'idle'); });
          room.on(RoomEvent.DataReceived, (payload) => { const text = new TextDecoder().decode(payload); let parsed = null; try { parsed = JSON.parse(text); } catch { } const role = parsed?.role === 'user' ? 'user' : 'ai'; const msgText = typeof parsed?.text === 'string' ? parsed.text : text; if (!msgText) return; setMessages(p => [...p, { role, text: msgText }]); });
          await room.connect(lkSession.url, lkSession.token);
          livekitRoomRef.current = room;
        }
        await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false); setVoiceState('listening'); return;
      } catch (e) { setMessages(p => [...p, { role: 'ai', text: `Could not start LiveKit session. Falling back.` }]); setVoiceState('idle'); await ensureAzureSession(); }
    }
    if (pcmPlayerRef.current) pcmPlayerRef.current.reset();
    if (recorderRef.current?.isRecording) { setVoiceState('listening'); return; }
    sessionWavBlobsRef.current = [];
    try { recorderRef.current = new WavRecorder(); recorderRef.current.onAudioChunk = (b64) => wsRef.current?.appendAudioUrl(b64); await recorderRef.current.start(); setVoiceState('listening'); } catch { console.error('Mic denied'); }
  };

  const stopVoiceRecording = async () => {
    if (livekitRoomRef.current) { try { try { await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(false); } catch { } livekitRoomRef.current.disconnect(); livekitRoomRef.current = null; setLivekitConnected(false); setVoiceState('idle'); return; } catch { } }
    if (recorderRef.current?.isRecording) { const tail = recorderRef.current.exportIncrementalWav?.(); if (tail?.size) sessionWavBlobsRef.current.push(tail); await recorderRef.current.stop(); }
    if (pcmPlayerRef.current) pcmPlayerRef.current.reset(); setVoiceState('idle');
  };

  const handleSendText = (preset = null) => {
    const text = preset || input; if (!text.trim()) return;
    setMessages(p => [...p, { role: 'user', text }]); setInput(''); setIsTyping(true); setVoiceState('processing');
    currentResponseTextRef.current = ''; setMessages(p => [...p, { role: 'ai', text: '' }]);
    if (wsRef.current) { wsRef.current.commitAudioAndRequestResponse([...getMessageHistory(), { role: 'user', content: text }]); return; }
    (async () => { try { const reply = await getAIResponse(text, contextNotesRef.current); setIsTyping(false); setVoiceState('idle'); currentResponseTextRef.current = ''; setMessages(prev => { const n = [...prev]; let i = n.length - 1; while (i >= 0 && n[i].role !== 'ai') i--; if (i < 0) return prev; n[i] = { ...n[i], text: reply || '' }; return n; }); } catch { setIsTyping(false); setVoiceState('idle'); } })();
  };

  const getMessageHistory = () => messages.filter(m => m.role === 'user' || m.role === 'ai').map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

  const blobToBase64 = (blob) => new Promise(resolve => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob); });

  const buildAudioUrl = useCallback(async () => {
    const userBlobs = sessionWavBlobsRef.current.filter(b => b?.size > 0);
    const aiChunks = aiAudioChunksRef.current;
    let userWav = userBlobs.length ? await mergeWavBlobs(userBlobs) : null;
    let aiWav = aiChunks.length ? pcmChunksToWavBlob(aiChunks, 24000) : null;
    if (!userWav && !aiWav) return null;
    try { const mixed = await mixWavBlobs(userWav, aiWav); return await blobToBase64(mixed || userWav || aiWav); } catch { return await blobToBase64(userWav || aiWav); }
  }, []);

  const saveTalkNote = useCallback(async ({ auto = false } = {}) => {
    if (!onSaveMOM || messagesRef.current.length < 2) return;
    setIsSaving(true);
    const newId = Date.now();
    const transcript = formatTalkTranscript(messagesRef.current);
    const audioUrl = await buildAudioUrl();
    const draft = { id: newId, title: auto ? 'Note from Talk (Extracting...)' : 'Talk Session (Extracting...)', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }), duration: `${messagesRef.current.length} turns`, summary: 'Analyzing conversation...', mom: 'Structured minutes will appear here.', transcript, audioUrl: audioUrl || undefined, source: 'talk' };
    onSaveMOM(draft, null);
    savedNoteIdRef.current = newId;
    if (updateNote) {
      const forAi = transcript.length > MAX_TRANSCRIPT_FOR_AI ? transcript.slice(0, MAX_TRANSCRIPT_FOR_AI) : transcript;
      try {
        const prompt = MOM_JSON_INSTRUCTIONS.replace('TEAM_MEMBERS_BLOCK', buildTeamDirectory(teamMembers)) + forAi;
        const aiResult = await getAIResponse(prompt, [], true);
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const p = JSON.parse(jsonMatch[0]);
          const formattedTasks = (p.tasks || []).map((t, i) => ({
            id: newId + i + 1,
            text: t.text,
            done: false,
            date: t.date,
            priority: t.priority,
            assignee: t.assignee,
            assigneeUserId: t.assigneeUserId || null,
            createdByUserId: currentUserId || null
          }));
          updateNote(newId, { title: p.mom?.title || draft.title, summaryShort: p.summary_short, summaryDetailed: p.summary_detailed, summary: p.summary_short || p.summary_detailed, detailedMom: p.mom, mom: p.mom?.discussion?.join('\n') || draft.mom, tasks: formattedTasks, keywords: p.keywords, sentiment: p.sentiment, diarization: p.diarization, callStatus: p.call_status || 'completed' });
          if (typeof scheduleFromNote === 'function' && p.mom?.title) scheduleFromNote(newId);
        }
      } catch (e) { console.error('Extraction failed:', e); updateNote(newId, { summary: 'Analysis failed, but transcript is preserved.', callStatus: 'dropped' }); }
    }
    setIsSaving(false);
  }, [onSaveMOM, updateNote, buildAudioUrl, scheduleFromNote, teamMembers, currentUserId]);

  const extractAndAddTask = useCallback(async (triggerText) => {
    const recent = messagesRef.current.slice(-6);
    const context = formatTalkTranscript(recent);
    if (!savedNoteIdRef.current) await saveTalkNote({ auto: true });
    const noteId = savedNoteIdRef.current;
    if (!noteId) return;
    try {
      const teamBlock = buildTeamDirectory(teamMembers);
      const prompt = TASK_EXTRACT_INSTRUCTIONS.replace('TEAM_MEMBERS_BLOCK', teamBlock) + context;
      const aiResult = await getAIResponse(prompt, [], true);
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const p = JSON.parse(jsonMatch[0]);
        const assigneeUserId = p.assigneeUserId ? String(p.assigneeUserId) : '';
        const member = assigneeUserId ? (teamMembers || []).find((m) => String(m.userId || m.id) === assigneeUserId) : null;
        const assignee = member ? (member.email || member.username || member.displayName || '') : '';
        if (typeof addTask === 'function') {
          addTask(noteId, {
            text: p.text || triggerText,
            date: p.date || null,
            priority: p.priority || 'Normal',
            assigneeUserId: assigneeUserId || null,
            assignee
          });
        }
      }
    } catch { }
  }, [saveTalkNote, addTask, appendActivities, teamMembers]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role !== 'user' || last.pendingUserId) return;
    const idx = messages.length - 1;
    if (idx <= autoNoteHandledForMessageIndex.current) return;
    if (userAskedToCreateNote(last.text)) { autoNoteHandledForMessageIndex.current = idx; saveTalkNote({ auto: true }); }
    else if (userAskedToCreateTask(last.text)) { autoTaskHandledForMessageIndex.current = idx; extractAndAddTask(last.text); }
    else if (userAskedToScheduleMeeting(last.text)) {
      if (idx <= autoMeetingHandledForMessageIndex.current) return;
      autoMeetingHandledForMessageIndex.current = idx;
      (async () => {
        if (!savedNoteIdRef.current) await saveTalkNote({ auto: true });
        const noteId = savedNoteIdRef.current;
        if (noteId && typeof scheduleFromNote === 'function') scheduleFromNote(noteId);
      })();
    }
  }, [messages, saveTalkNote, extractAndAddTask, scheduleFromNote]);

  const handleClose = useCallback(async () => {
    const sessionSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    if (sessionSeconds > 5) recordTalkUsage(sessionSeconds);
    const hasConversation = messagesRef.current.some(m => m.role === 'user' && !m.text.includes('Transcrib'));
    if (hasConversation && !savedNoteIdRef.current && onSaveMOM) { await saveTalkNote({ auto: true }); onClose(); return; }
    onClose();
  }, [onClose, onSaveMOM, saveTalkNote]);

  const statusLabel = 'Chat Active';

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111111', zIndex: 110, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#161616', paddingTop: 'calc(40px + env(safe-area-inset-top))', paddingLeft: 20, paddingRight: 20, paddingBottom: 14, borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#6d5bfa,#9b5de5)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(109,91,250,0.35)' }}>
            <AudioLines size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', margin: '0 0 3px', letterSpacing: '-0.1px' }}>AI Meeting Assistant</h2>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
              {statusLabel}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {messages.length >= 3 && (
            <button onClick={() => saveTalkNote({ auto: false })} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: 'rgba(109,91,250,0.1)', border: '1px solid rgba(109,91,250,0.2)', color: '#a78bfa', cursor: 'pointer' }}>
              <FileText size={12} />{isSaving ? 'Processing...' : 'Generate MOM'}
            </button>
          )}
          <button onClick={handleClose} style={{ padding: 10, backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: '50%', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              fontSize: 13, lineHeight: 1.6,
              backgroundColor: msg.role === 'user' ? undefined : '#1a1a1a',
              background: msg.role === 'user' ? 'linear-gradient(135deg,#6d5bfa,#9b5de5)' : undefined,
              color: msg.role === 'user' ? '#fff' : '#d1d5db',
              border: msg.role === 'ai' ? '1px solid #222' : 'none',
              fontWeight: msg.role === 'ai' ? 500 : 600,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #222', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6d5bfa', animation: `bounce 1s infinite`, animationDelay: `${delay}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ backgroundColor: '#161616', borderTop: '1px solid #1f1f1f', padding: '16px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', borderRadius: 20, padding: '6px 8px', border: '1px solid #2a2a2a' }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendText()} placeholder="Ask about your meetings..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#f3f4f6', fontWeight: 500, padding: '8px 4px' }} />
          <button onClick={() => handleSendText()} disabled={!input.trim()} style={{ padding: 10, borderRadius: 14, border: 'none', cursor: input.trim() ? 'pointer' : 'default', backgroundColor: input.trim() ? '#6d5bfa' : '#222', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: input.trim() ? '0 4px 12px rgba(109,91,250,0.35)' : 'none' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
