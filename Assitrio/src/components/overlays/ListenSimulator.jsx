import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, ChevronLeft, Upload } from 'lucide-react';
import { processSTTWithAzure, getAIResponse } from '../../services/azureAI';
import { WavRecorder } from '../../utils/wavRecorder';
import { userAskedToCreateNote } from '../../utils/noteIntents';
import { recordListenUsage } from '../../services/usageTracker';

const MAX_TRANSCRIPT_FOR_AI = 14000;

const MOM_JSON_INSTRUCTIONS = `You are an advanced AI Meeting Assistant. Analyze the provided transcript (from a recorded meeting) and generate a production-ready structured output in EXACTLY this JSON format (respond ONLY with the JSON block):

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
- Clearly label speakers (Speaker 1, Speaker 2, etc.) based on the transcript turns.
- ALWAYS create a proper MOM with key discussion points.
- Sentiment should reflect the overall tone of the meeting.
- Metadata accuracy is critical for enterprise reporting.
- If the text explicitly asks to 'create a task' but no specifics are given, output a task with text 'Pending requirement manually requested'.
- Translate any Hindi, Hinglish, or mixed language into standard, professional business English. All output MUST be in English.

Transcript:
`;

export default function ListenSimulator({ onClose, onSaveDraft, updateNote, appendActivities = () => { }, scheduleFromNote }) {
  const [transcript, setTranscript] = useState('Initializing Elite Recorder...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        recorderRef.current = new WavRecorder();
        await recorderRef.current.start();
        setTranscript("I'm Listening...");
      } catch { setTranscript('Microphone access denied.'); }
    };
    init();
    return () => { if (recorderRef.current?.isRecording) recorderRef.current.stop(); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getBlobDurationSeconds = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { const d = Number.isFinite(audio.duration) ? audio.duration : 0; try { URL.revokeObjectURL(url); } catch { } resolve(d); };
    audio.onerror = (e) => { try { URL.revokeObjectURL(url); } catch { } reject(e); };
    audio.src = url;
  });

  const processAudioToNote = async (audioBlob, localAudioUrl, durationSecondsOverride = null) => {
    const durationSeconds = typeof durationSecondsOverride === 'number' && Number.isFinite(durationSecondsOverride) ? durationSecondsOverride : elapsedSeconds;
    const durationMins = Math.max(1, Math.floor(durationSeconds / 60));
    const newId = Date.now();
    recordListenUsage(durationSeconds);
    const draft = {
      id: newId, title: 'AI Processing...', summary: 'Analyzing meeting dynamics...', mom: 'Generating professional minutes...', tasks: [],
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      duration: `${durationMins}m`, transcript: 'Transcribing meeting...', audioUrl: localAudioUrl, source: 'listen',
    };
    onSaveDraft(draft); onClose();
    (async () => {
      let finalText = 'No audio captured.';
      try { if (audioBlob) finalText = (await processSTTWithAzure(audioBlob)) || 'No speech detected.'; } catch { finalText = 'Transcription error.'; }
      updateNote(newId, { transcript: finalText });
      if (finalText.includes('error') || finalText === 'No speech detected.') { updateNote(newId, { title: 'Empty Recording', summary: 'No content to analyze.', callStatus: 'no-response' }); return; }
      const forAi = finalText.length > MAX_TRANSCRIPT_FOR_AI ? finalText.slice(0, MAX_TRANSCRIPT_FOR_AI) : finalText;
      try {
        const aiResult = await getAIResponse(MOM_JSON_INSTRUCTIONS + forAi, [], true);
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const p = JSON.parse(jsonMatch[0]);
          const formattedTasks = (p.tasks || []).map((t, i) => ({ id: newId + i + 1, text: t.text, done: false, date: t.date, priority: t.priority, assignee: t.assignee }));
          updateNote(newId, { title: p.mom?.title || 'Recorded Meeting', summaryShort: p.summary_short, summaryDetailed: p.summary_detailed, summary: p.summary_short || p.summary_detailed, detailedMom: p.mom, mom: p.mom?.discussion?.join('\n') || 'No clear discussion points.', tasks: formattedTasks, keywords: p.keywords, sentiment: p.sentiment, diarization: p.diarization, callStatus: p.call_status || 'completed' });
          if (typeof scheduleFromNote === 'function' && p.mom?.title) scheduleFromNote({ ...draft, transcript: finalText, mom: p.mom?.discussion?.join('\n') }, finalText);
        }
      } catch (e) { console.error('Listen extraction failed:', e); updateNote(newId, { summary: 'Analysis failed.', callStatus: 'dropped' }); }
    })();
  };

  const handleStop = async () => {
    let localAudioUrl = null, audioBlob = null;
    if (recorderRef.current?.isRecording) {
      try { audioBlob = await recorderRef.current.stop(); localAudioUrl = URL.createObjectURL(audioBlob); } catch (err) { console.error(err); }
    }
    await processAudioToNote(audioBlob, localAudioUrl, elapsedSeconds);
  };

  const handlePickFile = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (recorderRef.current?.isRecording) { try { await recorderRef.current.stop(); } catch { } }
    const localAudioUrl = URL.createObjectURL(file);
    let durationSeconds = 0;
    try { durationSeconds = await getBlobDurationSeconds(file); } catch { }
    await processAudioToNote(file, localAudioUrl, durationSeconds);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: '#0a0a0a',
      zIndex: 110, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: 24, color: '#fff', overflow: 'hidden',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>
      {/* Top gradient bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6d5bfa, #34d399, #9b5de5)' }} />

      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
        <div style={{ backgroundColor: '#161616', border: '1px solid #2a2a2a', padding: '8px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f3f4f6' }}>Elite Meeting Capture</span>
        </div>
        <button onClick={onClose} style={{ padding: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Center */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' }}>
        {/* Pulse rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 56 }}>
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', backgroundColor: 'rgba(109,91,250,0.06)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
          <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', backgroundColor: 'rgba(109,91,250,0.08)' }} />
          <div style={{ position: 'relative', zIndex: 10, width: 120, height: 120, backgroundColor: '#161616', border: '3px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(109,91,250,0.2)' }}>
            <Mic size={48} style={{ color: '#a78bfa' }} />
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 40, fontFamily: 'monospace', fontWeight: 900, color: '#f9fafb', letterSpacing: '0.1em' }}>{formatTime(elapsedSeconds)}</span>
          <div style={{ height: 3, width: 40, background: 'linear-gradient(90deg, #6d5bfa, #9b5de5)', borderRadius: 99 }} />
        </div>

        {/* Transcript */}
        <div style={{ maxWidth: 340, width: '100%', textAlign: 'center', padding: '0 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#6d5bfa', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 10 }}>Live Intelligence</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>"{transcript}"</p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ width: '100%', marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, opacity: 0.6 }}>
          Professional MOM and analysis will be generated post-meeting.
        </p>
        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        <button
          onClick={handlePickFile}
          style={{ width: '100%', backgroundColor: '#161616', border: '1px solid #2a2a2a', color: '#f3f4f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 12, padding: '16px', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}
        >
          <Upload size={17} /> Upload Audio File
        </button>
        <button
          onClick={handleStop}
          style={{ width: '100%', backgroundColor: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 13, padding: '18px', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 8px 24px rgba(239,68,68,0.3)' }}
        >
          <Square fill="currentColor" size={17} /> Finish Meeting
        </button>
      </div>
    </div>
  );
}