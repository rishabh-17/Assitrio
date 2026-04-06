import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, ChevronLeft } from 'lucide-react';
import { processSTTWithAzure, getAIResponse } from '../../services/azureAI';
import { WavRecorder } from '../../utils/wavRecorder';
import { userAskedToCreateNote } from '../../utils/noteIntents';
import { recordListenUsage } from '../../services/usageTracker';

/** Keep MOM prompt under model limits and reduce latency on long recordings */
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

Transcript:
`;

export default function ListenSimulator({
  onClose,
  onSaveDraft,
  updateNote,
  appendActivities = () => {},
  scheduleFromNote,
}) {
  const [transcript, setTranscript] = useState('Initializing Elite Recorder...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef(null);

  useEffect(() => {
    const initRecording = async () => {
      try {
        recorderRef.current = new WavRecorder();
        await recorderRef.current.start();
        setTranscript('Elite Assistant is listening...');
      } catch (err) {
        setTranscript('Microphone access denied.');
      }
    };
    initRecording();

    return () => {
      if (recorderRef.current && recorderRef.current.isRecording) {
        recorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStop = async () => {
    let localAudioUrl = null;
    let audioBlob = null;
    if (recorderRef.current && recorderRef.current.isRecording) {
      try {
        audioBlob = await recorderRef.current.stop();
        localAudioUrl = URL.createObjectURL(audioBlob);
      } catch (err) { console.error('Audio encoding failed:', err); }
    }

    const durationMins = Math.max(1, Math.floor(elapsedSeconds / 60));
    const newId = Date.now();
    recordListenUsage(elapsedSeconds);

    const draft = {
      id: newId,
      title: 'AI Processing...',
      summary: 'Analyzing meeting dynamics...',
      mom: 'Generating professional minutes...',
      tasks: [],
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      duration: `${durationMins}m`,
      transcript: 'Transcribing meeting...',
      audioUrl: localAudioUrl,
      source: 'listen',
    };

    onSaveDraft(draft);
    onClose();

    (async () => {
      let finalTextTranscript = 'No audio captured.';
      try {
        if (audioBlob) {
          finalTextTranscript = (await processSTTWithAzure(audioBlob)) || 'No speech detected.';
        }
      } catch (apiError) { finalTextTranscript = 'Transcription error.'; }

      updateNote(newId, { transcript: finalTextTranscript });
      if (finalTextTranscript.includes('error') || finalTextTranscript === 'No speech detected.') {
        updateNote(newId, { title: 'Empty Recording', summary: 'No content to analyze.', callStatus: 'no-response' });
        return;
      }

      const forAi = finalTextTranscript.length > MAX_TRANSCRIPT_FOR_AI ? finalTextTranscript.slice(0, MAX_TRANSCRIPT_FOR_AI) : finalTextTranscript;

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
            title: p.mom?.title || 'Recorded Meeting',
            summaryShort: p.summary_short,
            summaryDetailed: p.summary_detailed,
            summary: p.summary_short || p.summary_detailed,
            detailedMom: p.mom,
            mom: p.mom?.discussion?.join('\n') || 'No clear discussion points.',
            tasks: formattedTasks,
            keywords: p.keywords,
            sentiment: p.sentiment,
            diarization: p.diarization,
            callStatus: p.call_status || 'completed'
          });

          if (typeof scheduleFromNote === 'function' && p.mom?.title) {
            scheduleFromNote({ ...draft, transcript: finalTextTranscript, mom: p.mom?.discussion?.join('\n') }, finalTextTranscript);
          }
        }
      } catch (e) {
        console.error('Listen extraction failed:', e);
        updateNote(newId, { summary: 'Analysis failed.', callStatus: 'dropped' });
      }
    })();
  };

  return (
    <div className="absolute inset-0 bg-slate-950 z-[110] flex flex-col items-center justify-between p-6 text-white animate-slide-bottom overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-emerald-500 to-brand-700 animate-shimmer" />
      
      <div className="w-full flex justify-between items-center mt-8">
        <div className="bg-slate-900 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest flex items-center gap-2 border border-white/10 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-lg shadow-red-500/50" />
          ELITE MEETING CAPTURE
        </div>
        <button onClick={onClose} className="p-3 text-white/40 hover:text-white transition-all rounded-full hover:bg-white/5 active:scale-90">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center flex-1 justify-center w-full">
        <div className="relative flex items-center justify-center mb-16">
          <div className="absolute w-64 h-64 bg-brand-500 rounded-full animate-ping opacity-10" />
          <div className="absolute w-44 h-44 bg-brand-600 rounded-full animate-pulse opacity-20 scale-125" />
          <div className="relative z-10 w-32 h-32 bg-slate-900 border-4 border-white/10 rounded-full flex items-center justify-center shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)]">
            <Mic size={48} className="text-brand-400" />
          </div>
        </div>

        <div className="mb-8 flex flex-col items-center gap-2">
            <span className="text-4xl font-mono font-black text-white tracking-widest">{formatTime(elapsedSeconds)}</span>
            <div className="h-1 w-12 bg-brand-500 rounded-full" />
        </div>

        <div className="max-w-md w-full text-center px-4">
          <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Live Intelligence</p>
          <p className="text-xl font-bold text-white/90 leading-snug tracking-tight">"{transcript}"</p>
        </div>
      </div>

      <div className="w-full space-y-4 mb-8">
          <p className="text-[11px] text-slate-500 text-center font-medium uppercase tracking-wider px-6 opacity-60">
            Professional MOM and analysis will be generated post-meeting.
          </p>
          <button
            onClick={handleStop}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.15em] py-5 rounded-[24px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-red-900/40 border border-red-500/50"
          >
            <Square fill="currentColor" size={18} /> Finish Meeting
          </button>
      </div>
    </div>
  );
}
