import { searchTranscriptions } from './transcriptionStore.js';
import { getApiBaseUrl } from '../config/api';

const AZURE_REALTIME_ENDPOINT = import.meta.env?.VITE_AZURE_REALTIME_ENDPOINT || 'https://triotechcode.cognitiveservices.azure.com/openai/deployments/gpt-realtime-1.5/chat/completions?api-version=2024-10-01-preview';
const AZURE_REALTIME_KEY = import.meta.env?.VITE_AZURE_REALTIME_KEY || '';

/**
 * Build a system prompt with the "Advanced AI Meeting Assistant" persona.
 * Adheres to strict voice behavior, real-time processing requirements, and professional persona.
 */
function buildSystemPrompt(notes = [], retrievedChunks = []) {
  // Build a pending-tasks summary across all notes
  const allPendingTasks = notes.flatMap(note =>
    (note.tasks || [])
      .filter(t => !t.done)
      .map(t => `  - [${note.title}] ${t.text}${t.date ? ` (Due: ${t.date})` : ''}${t.priority && t.priority !== 'Normal' ? ` [${t.priority}]` : ''}`)
  );

  const allCompletedTasks = notes.flatMap(note =>
    (note.tasks || [])
      .filter(t => t.done)
      .map(t => `  - [${note.title}] ✅ ${t.text}`)
  );

  const pendingTasksSection = allPendingTasks.length > 0
    ? `\n### PENDING TASKS (${allPendingTasks.length} total — answer task questions from this list)\n${allPendingTasks.join('\n')}`
    : '\n### PENDING TASKS\nAll tasks are completed! Boss is on top of everything.';

  const completedTasksSection = allCompletedTasks.length > 0
    ? `\n### COMPLETED TASKS (${allCompletedTasks.length} total)\n${allCompletedTasks.slice(0, 20).join('\n')}`
    : '';

  const noteSummaries = notes.slice(0, 15).map(note => {
    const summary = note.summaryDetailed || note.summaryShort || note.summary || 'No summary available.';
    const taskLines = (note.tasks || []).map(t =>
      `  - [${t.done ? 'x' : ' '}] ${t.text}${t.date ? ` (Due: ${t.date})` : ''}${t.priority && t.priority !== 'Normal' ? ` [${t.priority}]` : ''}`
    ).join('\n') || '  (no tasks)';

    return `Meeting: "${note.title}" (${note.date || 'No date'}, ${note.time || ''})
Summary: ${summary}
MOM: ${note.mom || 'Not available'}
Tasks (${(note.tasks || []).filter(t => !t.done).length} pending / ${(note.tasks || []).length} total):
${taskLines}`;
  }).join('\n\n---\n\n');

  let ragContext = '';
  if (retrievedChunks.length > 0) {
    const chunkTexts = retrievedChunks.map((c, i) => {
      const src = c.metadata ? `[${c.metadata.title} — ${c.metadata.date}]` : `[Excerpt ${i + 1}]`;
      return `${src}\n${c.text}`;
    }).join('\n\n');
    ragContext = `\n\n── Contextual Fragments ──\n${chunkTexts}`;
  }

  return `### IDENTITY
You are "Assistrio Elite", an advanced AI Meeting Assistant integrated into a full-stack enterprise dashboard. Your persona is a natural, human-like, polite, and highly professional executive assistant.

### VOICE BOT BEHAVIOR
- Talk like a real human agent, never robotic.
- Be concise, polite, and slightly conversational.
- Handle interruptions/pauses naturally (use fillers like "...", "okay", "got it" when appropriate).
- If the user is silent for too long or explicitly says "cut call", "bye", or "end session", politely end the conversation.
- Ask clarifying questions if the user's request is ambiguous.
- ALWAYS address the user as "Boss" with professional warmth.

### REAL-TIME PROCESSING & DIARIZATION
- You are continuously transcribing and analyzing the conversation.
- Internally, you map identities as follows:
  - Speaker 1 = User
  - Speaker 2 = AI Agent (You)
- Support speaker-wise transcription when generating internal drafts.
${pendingTasksSection}
${completedTasksSection}

### CORE KNOWLEDGE (Boss's Meeting Archive — ${notes.length} meetings)
Below are the user's past conversation summaries, minutes of meetings, and full task lists:
${noteSummaries || 'No prior conversation history recorded.'}${ragContext}

### OPERATIONAL RULES
1. Accuracy > Clarity > Structure > User Experience.
2. Communicate in standard, simple, and clear Indian English. Do NOT use Hinglish or Hindi words. Maintain a polite, professional, and helpful tone.
3. You have FULL ACCESS to all the user's notes, tasks, and summaries above. If the user asks for total tasks count, count from the PENDING TASKS section above.
4. If a user asks "what are my tasks?" or "what's pending?", list from the PENDING TASKS section. Be specific with meeting names.
5. If you lack information, state it clearly. Do not hallucinate.
6. Prioritize pending tasks and deadlines in conversation when relevant.
7. Translate any Hindi, Hinglish, or mixed language into standard, professional business English.`;
}

async function buildContextForQuery(query, notes = [], topK = 5) {
  let retrievedChunks = [];
  if (query && query.trim().length > 0) {
    try {
      retrievedChunks = await searchTranscriptions(query, topK);
    } catch (e) {
      console.warn('RAG search failed:', e);
    }
  }
  return buildSystemPrompt(notes, retrievedChunks);
}

function extractAssistantContent(data) {
  const choice = data?.choices?.[0]?.message?.content;
  if (choice) return choice;
  const out = data?.output;
  if (Array.isArray(out)) {
    const msg = [...out]
      .reverse()
      .find((x) => x?.type === 'message' && x?.role === 'assistant');
    if (msg?.content?.length) {
      const text = msg.content
        .filter((p) => p && (p.type === 'output_text' || p.text))
        .map((p) => p.text || '')
        .join('');
      if (text) return text;
    }
  }
  return data?.message || '';
}

async function getAIResponse(userMessage, notes = [], isExtraction = false) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/ai/azure-openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: buildSystemPrompt(notes),
        messages: [
          { role: 'system', content: buildSystemPrompt(notes) },
          { role: 'user', content: userMessage }
        ]
      })
    });
    if (response.ok) {
      const data = await response.json();
      const content = extractAssistantContent(data);
      if (content) return content;
    }
    const errorText = await response.text();
    console.error('Azure OpenAI Error:', errorText);
    if (!isExtraction) return await callAzureRealtime(userMessage, notes, isExtraction);
    throw new Error(`AI endpoint failed: ${response.status}`);
  } catch (error) {
    console.warn('Azure AI Error:', error.message);
    if (isExtraction) throw error;
    return getLocalFallbackResponse(userMessage, notes);
  }
}

async function callAzureRealtime(userMessage, notes = [], isExtraction = false, audioBase64 = null, requestAudio = false, messageHistory = []) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/ai/azure-realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: buildSystemPrompt(notes),
        userMessage,
        audioBase64,
        requestAudio,
        messageHistory
      })
    });
    if (response.ok) {
      const data = await response.json();
      const messageObj = data.choices?.[0]?.message;
      if (requestAudio && messageObj?.audio?.data) {
        return {
          text: messageObj.audio.transcript || messageObj.content || '',
          audioBase64: messageObj.audio.data
        };
      }
      return messageObj?.content || data.message;
    }
    const errorText = await response.text();
    console.error('Azure Realtime HTTP Error:', response.status, errorText);
    throw new Error(`Realtime endpoint failed (HTTP ${response.status})`);
  } catch (error) {
    console.warn('Azure Realtime call failed:', error.message);
    if (isExtraction || requestAudio) throw error;
    return getLocalFallbackResponse(userMessage, notes);
  }
}

async function processAudioWithAzure(audioBase64, userMessage = '', notes = [], requestAudioResponse = false, messageHistory = []) {
  return callAzureRealtime(userMessage, notes, true, audioBase64, requestAudioResponse, messageHistory);
}

function readAscii(view, offset, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

function parseWav(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 44) return null;
  const view = new DataView(arrayBuffer);
  if (readAscii(view, 0, 4) !== 'RIFF') return null;
  if (readAscii(view, 8, 4) !== 'WAVE') return null;

  let offset = 12;
  let fmt = null;
  let dataOffset = null;
  let dataSize = null;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (id === 'fmt ' && chunkStart + 16 <= view.byteLength) {
      const audioFormat = view.getUint16(chunkStart + 0, true);
      const numChannels = view.getUint16(chunkStart + 2, true);
      const sampleRate = view.getUint32(chunkStart + 4, true);
      const bitsPerSample = view.getUint16(chunkStart + 14, true);
      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample };
    } else if (id === 'data') {
      dataOffset = chunkStart;
      dataSize = Math.min(size, Math.max(0, view.byteLength - dataOffset));
      break;
    }

    offset = chunkStart + size + (size % 2);
  }

  if (!fmt || dataOffset === null || dataSize === null) return null;
  if (fmt.audioFormat !== 1) return null;
  if (!fmt.sampleRate || !fmt.numChannels || !fmt.bitsPerSample) return null;

  return {
    ...fmt,
    dataOffset,
    dataSize
  };
}

function buildWavBlobFromPcm16(pcm16, sampleRate) {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;

  const buffer = new ArrayBuffer(44 + pcm16.length * 2);
  const view = new DataView(buffer);

  const writeString = (v, offset, string) => {
    for (let i = 0; i < string.length; i++) v.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm16.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcm16.length * 2, true);

  const outOff = 44;
  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(outOff + i * 2, pcm16[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function splitWavArrayBuffer(arrayBuffer, maxChunkSeconds) {
  const info = parseWav(arrayBuffer);
  if (!info) return null;
  if (info.bitsPerSample !== 16) return null;

  const bytesPerSample = info.bitsPerSample / 8;
  const bytesPerFrame = bytesPerSample * info.numChannels;
  const totalFrames = Math.floor(info.dataSize / bytesPerFrame);
  const framesPerChunk = Math.max(1, Math.floor(maxChunkSeconds * info.sampleRate));

  const pcmBytes = arrayBuffer.slice(info.dataOffset, info.dataOffset + info.dataSize);
  const pcmInterleaved = new Int16Array(pcmBytes);

  let mono;
  if (info.numChannels === 1) {
    mono = pcmInterleaved;
  } else {
    mono = new Int16Array(totalFrames);
    for (let i = 0; i < totalFrames; i++) {
      let sum = 0;
      const base = i * info.numChannels;
      for (let c = 0; c < info.numChannels; c++) sum += pcmInterleaved[base + c] || 0;
      mono[i] = Math.max(-32768, Math.min(32767, Math.round(sum / info.numChannels)));
    }
  }

  if (mono.length <= framesPerChunk) {
    return [buildWavBlobFromPcm16(mono, info.sampleRate)];
  }

  const chunks = [];
  for (let start = 0; start < mono.length; start += framesPerChunk) {
    const end = Math.min(mono.length, start + framesPerChunk);
    const slice = mono.subarray(start, end);
    chunks.push(buildWavBlobFromPcm16(slice, info.sampleRate));
  }
  return chunks;
}

async function transcribeWavOnce(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('definition', JSON.stringify({
    locales: ["en-US", "hi-IN"],
    diarization: { maxSpeakers: 2, enabled: true }
  }));
  const response = await fetch(`${getApiBaseUrl()}/ai/azure-stt`, {
    method: 'POST',
    body: formData
  });
  if (response.ok) {
    const data = await response.json();
    return data.combinedPhrases?.[0]?.text || data.text || data.displayText || '';
  }
  const errorText = await response.text();
  const err = new Error(`STT failed (HTTP ${response.status})`);
  err.status = response.status;
  err.body = errorText;
  throw err;
}

async function transcribeWavWithChunking(audioBlob, maxChunkSeconds = 240) {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const info = parseWav(arrayBuffer);
  if (!info) return await transcribeWavOnce(audioBlob);

  const bytesPerSecond = info.sampleRate * info.numChannels * (info.bitsPerSample / 8);
  const durationSeconds = bytesPerSecond > 0 ? info.dataSize / bytesPerSecond : 0;
  if (!durationSeconds || durationSeconds <= maxChunkSeconds + 1) {
    return await transcribeWavOnce(audioBlob);
  }

  const chunks = splitWavArrayBuffer(arrayBuffer, maxChunkSeconds);
  if (!chunks || chunks.length <= 1) return await transcribeWavOnce(audioBlob);

  const parts = [];
  for (const chunk of chunks) {
    const t = (await transcribeWavOnce(chunk)).trim();
    if (t) parts.push(t);
  }
  return parts.join('\n').trim();
}

async function processSTTWithAzure(audioBlob) {
  try {
    const configuredMaxChunkSeconds = Number(import.meta.env?.VITE_STT_MAX_CHUNK_SECONDS);
    const configuredRetryChunkSeconds = Number(import.meta.env?.VITE_STT_RETRY_CHUNK_SECONDS);
    const maxChunkSeconds = Number.isFinite(configuredMaxChunkSeconds) && configuredMaxChunkSeconds > 0
      ? configuredMaxChunkSeconds
      : 240;
    const retryChunkSeconds = Number.isFinite(configuredRetryChunkSeconds) && configuredRetryChunkSeconds > 0
      ? configuredRetryChunkSeconds
      : 120;

    try {
      return await transcribeWavWithChunking(audioBlob, maxChunkSeconds);
    } catch (e) {
      const status = e?.status;
      if (status && (status === 400 || status === 408 || status === 413 || status === 414 || status === 429 || status >= 500)) {
        return await transcribeWavWithChunking(audioBlob, retryChunkSeconds);
      }
      throw e;
    }
  } catch (error) {
    console.warn('Azure STT failed:', error.message);
    throw error;
  }
}

function getLocalFallbackResponse(query, notes = []) {
  const q = query.toLowerCase();
  for (const note of notes) {
    const noteText = `${note.title} ${note.summary} ${note.mom} ${note.tasks.map(t => t.text).join(' ')}`.toLowerCase();
    const queryWords = q.split(/\s+/).filter(w => w.length > 3);
    const matchCount = queryWords.filter(w => noteText.includes(w)).length;
    if (matchCount >= 2 || q.includes(note.title.toLowerCase().split(':')[0].trim().split(' ').pop())) {
      const taskList = note.tasks.map(t => `${t.done ? '✅' : '⬜'} ${t.text}`).join('\n');
      return `From "${note.title}" (${note.date}):\n\n${note.summary}\n\nTasks:\n${taskList}`;
    }
  }
  if (q.includes('task') || q.includes('pending') || q.includes('todo')) {
    const pending = notes.flatMap(n => n.tasks.filter(t => !t.done).map(t => `⬜ ${t.text}`));
    return pending.length > 0 ? `Boss, you have ${pending.length} pending tasks:\n\n${pending.join('\n')}` : 'All tasks are clear, Boss!';
  }
  return `Boss, I can help you recall details from your ${notes.length} saved memories. Try asking about a specific person or project!`;
}

export {
  buildSystemPrompt,
  buildContextForQuery,
  AZURE_REALTIME_ENDPOINT,
  AZURE_REALTIME_KEY,
  getAIResponse,
  processAudioWithAzure,
  processSTTWithAzure
};
