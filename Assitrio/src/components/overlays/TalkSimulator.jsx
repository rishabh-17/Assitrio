import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Circle, AudioLines, Keyboard, ChevronLeft, FileText } from 'lucide-react';
import { WavRecorder } from '../../utils/wavRecorder';
import { mergeWavBlobs, pcmChunksToWavBlob, mixWavBlobs } from '../../utils/wavMerge';
import { RealtimeWS } from '../../services/realtimeWS';
import { PCMPlayer } from '../../utils/pcmPlayer';
import { AZURE_REALTIME_ENDPOINT, AZURE_REALTIME_KEY, buildSystemPrompt, buildContextForQuery, getAIResponse } from '../../services/azureAI';
import { userAskedToCreateNote, userAskedToCreateTask, userAskedToScheduleMeeting } from '../../utils/noteIntents';
import { recordTalkUsage } from '../../services/usageTracker';

/** Keep MOM prompt under model limits and reduce latency on long conversations */
const MAX_TRANSCRIPT_FOR_AI = 14000;

const MOM_JSON_INSTRUCTIONS = `You are an advanced AI Meeting Assistant. Analyze the provided transcript and generate a production-ready structured output in EXACTLY this JSON format (respond ONLY with the JSON block):

{
  "summary_short": "2-3 line concise summary",
  "summary_detailed": "Comprehensive paragraph summary",
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
      "assignee": "Name or email if identified, else null"
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

Transcript:
`;

const TASK_EXTRACT_INSTRUCTIONS = `The user just asked to create a task. Based on the recent conversation context, extract the single task Speaker 1 (User) is referring to. Respond ONLY with JSON:
{
  "text": "Clear description",
  "date": "Date if mentioned, else null",
  "priority": "Critical | Important | Normal"
}

Context:
`;

function formatTalkTranscript(msgs) {
  return msgs
    .filter((m) => m.role === 'user' || m.role === 'ai')
    .map((m, i) => {
      const label = m.role === 'user' ? 'Speaker 1 (User)' : 'Speaker 2 (AI Agent)';
      const t = (m.text || '').trim();
      if (!t) return null;
      // Add a dummy timestamp based on message index for diarization effect
      const timestamp = `[00:${String(Math.min(59, i)).padStart(2, '0')}]`;
      return `${timestamp} ${label}: ${t}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function TalkSimulator({ onClose, notes = [], onSaveMOM, updateNote, appendActivities = () => { }, addTask, scheduleFromNote }) {
  const [inputMode, setInputMode] = useState('voice');
  const [voiceState, setVoiceState] = useState('idle');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Hi Boss! I have your recent meetings loaded. Ask me anything. Say "create a note" anytime to save this chat, or "create a task" to add an action item.',
    },
  ]);
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

  messagesRef.current = messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    pcmPlayerRef.current = new PCMPlayer(24000);
    const initSession = async () => {
      const ragPrompt = await buildContextForQuery('conversation summary tasks meetings', notes);
      wsRef.current = new RealtimeWS(AZURE_REALTIME_ENDPOINT, AZURE_REALTIME_KEY, ragPrompt);

      wsRef.current.onOpen = () => console.log('Assistant active.');
      wsRef.current.onAudioChunk = (base64PCM) => {
        setVoiceState((vs) => vs !== 'ai-speaking' ? 'ai-speaking' : vs);
        setIsTyping(false);
        pcmPlayerRef.current.appendBase64(base64PCM);
        aiAudioChunksRef.current.push(base64PCM);
      };

      wsRef.current.onText = (textDelta) => {
        currentResponseTextRef.current += textDelta;
        setMessages((prev) => {
          const newMsg = [...prev];
          let i = newMsg.length - 1;
          while (i >= 0 && newMsg[i].role !== 'ai') i--;
          if (i < 0) return prev;
          newMsg[i] = { ...newMsg[i], text: currentResponseTextRef.current };
          return newMsg;
        });
      };

      wsRef.current.onAudioDone = () => setVoiceState(recorderRef.current?.isRecording ? 'listening' : 'idle');
      wsRef.current.onSpeechStarted = () => {
        setVoiceState('listening');
        if (pcmPlayerRef.current) pcmPlayerRef.current.reset();
      };

      wsRef.current.onSpeechStopped = () => {
        const seg = recorderRef.current?.exportIncrementalWav?.();
        if (seg?.size) sessionWavBlobsRef.current.push(seg);
        setVoiceState('processing');
        setIsTyping(true);
        const pendingId = `u-${Date.now()}`;
        pendingUserMsgIdRef.current = pendingId;
        setMessages((prev) => [...prev, { role: 'user', text: '🎤 Transcribing…', pendingUserId: pendingId }]);
        currentResponseTextRef.current = '';
        setMessages((prev) => [...prev, { role: 'ai', text: '' }]);
      };

      wsRef.current.onUserTranscript = (text) => {
        const pid = pendingUserMsgIdRef.current;
        pendingUserMsgIdRef.current = null;
        const cleaned = (text || '').trim() || '(voice)';
        setMessages((prev) => {
          const idx = pid ? prev.findIndex((m) => m.pendingUserId === pid) : -1;
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], text: cleaned, pendingUserId: undefined };
            return copy;
          }
          return prev;
        });
      };

      wsRef.current.onError = (err) => {
        setMessages((prev) => [...prev, { role: 'ai', text: 'Boss, connection dropped. Let me know if we should restart.' }]);
        setVoiceState('idle');
        setIsTyping(false);
      };
    };

    initSession();
    return () => {
      if (recorderRef.current?.isRecording) recorderRef.current.stop();
      if (pcmPlayerRef.current) pcmPlayerRef.current.close();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getMessageHistory = () => {
    return messages.filter((m) => m.role === 'user' || m.role === 'ai').map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));
  };

  const startVoiceRecording = async () => {
    if (pcmPlayerRef.current) pcmPlayerRef.current.reset();
    if (recorderRef.current?.isRecording) {
      setVoiceState('listening');
      return;
    }
    sessionWavBlobsRef.current = [];
    try {
      recorderRef.current = new WavRecorder();
      recorderRef.current.onAudioChunk = (base64PCM) => wsRef.current?.appendAudioUrl(base64PCM);
      await recorderRef.current.start();
      setVoiceState('listening');
    } catch (err) {
      console.error('Mic access denied');
    }
  };

  const stopVoiceRecording = async () => {
    if (recorderRef.current?.isRecording) {
      const tail = recorderRef.current.exportIncrementalWav?.();
      if (tail?.size) sessionWavBlobsRef.current.push(tail);
      await recorderRef.current.stop();
    }
    if (pcmPlayerRef.current) pcmPlayerRef.current.reset();
    setVoiceState('idle');
  };

  const handleSendText = (preset = null) => {
    const text = preset || input;
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);
    setVoiceState('processing');
    currentResponseTextRef.current = '';
    setMessages((prev) => [...prev, { role: 'ai', text: '' }]);
    wsRef.current.commitAudioAndRequestResponse([...getMessageHistory(), { role: 'user', content: text }]);
  };

  const blobToBase64 = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  const buildAudioUrl = useCallback(async () => {
    const userBlobs = sessionWavBlobsRef.current.filter((b) => b?.size > 0);
    const aiChunks = aiAudioChunksRef.current;
    let userWav = userBlobs.length ? await mergeWavBlobs(userBlobs) : null;
    let aiWav = aiChunks.length ? pcmChunksToWavBlob(aiChunks, 24000) : null;
    if (!userWav && !aiWav) return null;
    try {
      const mixed = await mixWavBlobs(userWav, aiWav);
      return await blobToBase64(mixed || userWav || aiWav);
    } catch (e) {
      return await blobToBase64(userWav || aiWav);
    }
  }, []);

  const saveTalkNote = useCallback(
    async ({ auto = false } = {}) => {
      if (!onSaveMOM || messagesRef.current.length < 2) return;
      setIsSaving(true);
      const newId = Date.now();
      const transcript = formatTalkTranscript(messagesRef.current);
      const audioUrl = await buildAudioUrl();
      
      const draft = {
        id: newId,
        title: auto ? 'Note from Talk (Extracting...)' : 'Talk Session (Extracting...)',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
        duration: `${messagesRef.current.length} turns`,
        summary: 'Analyzing conversation...',
        mom: 'Structured minutes will appear here.',
        transcript,
        audioUrl: audioUrl || undefined,
        source: 'talk',
      };

      onSaveMOM(draft, [{ id: newId, time: 'Just Now', title: 'Processing AI Insights...', icon: 'task' }]);
      savedNoteIdRef.current = newId;

      if (updateNote) {
        const forAi = transcript.length > MAX_TRANSCRIPT_FOR_AI ? transcript.slice(0, MAX_TRANSCRIPT_FOR_AI) : transcript;
        try {
          const aiResult = await getAIResponse(MOM_JSON_INSTRUCTIONS + forAi, [], true);
          const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const p = JSON.parse(jsonMatch[0]);
            const formattedTasks = (p.tasks || []).map((t, i) => ({
              id: newId + i + 1,
              text: t.text,
              done: false,
              date: t.date,
              priority: t.priority,
              assignee: t.assignee
            }));

            updateNote(newId, {
              title: p.mom?.title || draft.title,
              summaryShort: p.summary_short,
              summaryDetailed: p.summary_detailed,
              summary: p.summary_short || p.summary_detailed, // fallback
              detailedMom: p.mom,
              mom: p.mom?.discussion?.join('\n') || draft.mom,
              tasks: formattedTasks,
              keywords: p.keywords,
              sentiment: p.sentiment,
              diarization: p.diarization,
              callStatus: p.call_status || 'completed'
            });
            
            if (typeof scheduleFromNote === 'function' && p.mom?.title) {
               scheduleFromNote({ ...draft, transcript, mom: p.mom?.discussion?.join('\n') }, transcript);
            }
          }
        } catch (e) {
          console.error('Extraction failed:', e);
          updateNote(newId, { summary: 'Analysis failed, but transcript is preserved.', callStatus: 'dropped' });
        }
      }
      setIsSaving(false);
    },
    [onSaveMOM, updateNote, buildAudioUrl, scheduleFromNote]
  );

  const extractAndAddTask = useCallback(
    async (triggerText) => {
      const recent = messagesRef.current.slice(-6);
      const context = formatTalkTranscript(recent);
      if (!savedNoteIdRef.current) await saveTalkNote({ auto: true });
      const noteId = savedNoteIdRef.current;
      if (!noteId) return;

      try {
        const aiResult = await getAIResponse(TASK_EXTRACT_INSTRUCTIONS + context, [], true);
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const p = JSON.parse(jsonMatch[0]);
          if (typeof addTask === 'function') addTask(noteId, p.text || triggerText, p.date, p.priority);
          if (typeof appendActivities === 'function') {
            appendActivities([{ id: Date.now(), time: 'Just Now', title: `Task: ${p.text}`, icon: 'task' }]);
          }
        }
      } catch (err) { console.warn('Fast task extraction failed'); }
    },
    [saveTalkNote, addTask, appendActivities]
  );

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role !== 'user' || last.pendingUserId) return;
    const idx = messages.length - 1;
    if (idx <= autoNoteHandledForMessageIndex.current) return;
    
    if (userAskedToCreateNote(last.text)) {
      autoNoteHandledForMessageIndex.current = idx;
      saveTalkNote({ auto: true });
    } else if (userAskedToCreateTask(last.text)) {
      autoTaskHandledForMessageIndex.current = idx;
      extractAndAddTask(last.text);
    }
  }, [messages, saveTalkNote, extractAndAddTask]);

  const handleClose = useCallback(async () => {
    const sessionSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    if (sessionSeconds > 5) recordTalkUsage(sessionSeconds);
    const hasConversation = messagesRef.current.some(m => m.role === 'user' && !m.text.includes('Transcrib'));
    if (hasConversation && !savedNoteIdRef.current && onSaveMOM) {
      await saveTalkNote({ auto: true });
      return;
    }
    onClose();
  }, [onClose, onSaveMOM, saveTalkNote]);

  return (
    <div className="absolute inset-0 bg-slate-50 z-[110] flex flex-col animate-slide-bottom">
      <div className="bg-white px-5 pt-10 pb-3 border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl flex items-center justify-center text-white shadow-brand-200 shadow-lg">
            <AudioLines size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-[15px] tracking-tight">AI Meeting Assistant</h2>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Realtime Elite Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length >= 3 && (
            <button
              onClick={() => saveTalkNote({ auto: false })}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100 transition-all active:scale-95"
            >
              {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={13} />}
              {isSaving ? 'Processing' : 'Generate MOM'}
            </button>
          )}
          <button onClick={handleClose} className="p-2.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
            <ChevronLeft size={20} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
              msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-slate-100 px-5 pt-4 pb-8 flex flex-col items-center gap-4">
        {inputMode === 'voice' ? (
          <div className="w-full space-y-4">
            {voiceState !== 'idle' && (
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsMuted(!isMuted); recorderRef.current?.setMuted(!isMuted); }}
                  className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    isMuted ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                  }`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={stopVoiceRecording}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  End Call
                </button>
              </div>
            )}
            
            {voiceState === 'idle' ? (
              <button
                onClick={startVoiceRecording}
                className="w-full py-5 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-200 active:scale-95 transition-all text-xs flex items-center justify-center gap-3"
              >
                <Mic size={20} /> Start Meeting
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse opacity-10 scale-125" />
                    <div className="relative z-10 w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-2xl border-4 border-white overflow-hidden">
                        {voiceState === 'ai-speaking' ? (
                            <div className="flex gap-1 items-end h-6">
                                {[1,2,3,4,3,2,1].map((h, i) => (
                                    <div key={i} className="w-1 bg-brand-400 rounded-full animate-pulse" style={{ height: `${h * 4}px` }} />
                                ))}
                            </div>
                        ) : <Mic size={28} className="animate-pulse text-brand-400" />}
                    </div>
                </div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
                  {voiceState === 'listening' ? 'Agent Listening' : voiceState === 'processing' ? 'Thinking' : 'Agent Speaking'}
                </p>
              </div>
            )}
            <button
               onClick={() => setInputMode('text')}
               className="w-full flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-brand-600 transition-colors"
            >
              <Keyboard size={14} /> Switch to Keyboard
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition-all shadow-inner">
              <button onClick={() => setInputMode('voice')} className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                <Mic size={20} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Ask about your meetings..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 font-medium py-3 px-2 placeholder-slate-400"
              />
              <button
                onClick={() => handleSendText()}
                disabled={!input.trim()}
                className={`p-3 rounded-xl transition-all ${input.trim() ? 'bg-brand-600 text-white shadow-lg active:scale-90' : 'bg-slate-200 text-slate-400'}`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshCw({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
        </svg>
    );
}
