import { searchTranscriptions } from './transcriptionStore.js';
import { API_BASE_URL } from '../config/api';

const AZURE_REALTIME_ENDPOINT = import.meta.env?.VITE_AZURE_REALTIME_ENDPOINT || 'https://triotechcode.cognitiveservices.azure.com/openai/deployments/gpt-realtime-1.5/chat/completions?api-version=2024-10-01-preview';
const AZURE_REALTIME_KEY = import.meta.env?.VITE_AZURE_REALTIME_KEY || '';

/**
 * Build a system prompt with the "Advanced AI Meeting Assistant" persona.
 * Adheres to strict voice behavior, real-time processing requirements, and professional persona.
 */
function buildSystemPrompt(notes = [], retrievedChunks = []) {
  const noteSummaries = notes.slice(0, 15).map(note => {
    const tasks = note.tasks.map(t => `  - [${t.done ? 'x' : ' '}] ${t.text}`).join('\n');
    return `Meeting: "${note.title}" (${note.date}, ${note.time})
Summary: ${note.summary}
MOM: ${note.mom}
Tasks:\n${tasks}`;
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

### CORE KNOWLEDGE (Boss's Memories)
Below are the user's past conversation summaries and relevant excerpts:
${noteSummaries || 'No prior conversation history recorded.'}${ragContext}

### OPERATIONAL RULES
1. Accuracy > Clarity > Structure > User Experience.
2. Communicate in Roman Hinglish (Modern Hindi/English mix) for natural Indian professional context. (e.g. "Haan Boss, aapki pichli meeting ke action items ye rahe..." or "Boss, tech budget approve ho gaya hai").
3. Use English if the user speaks pure English.
4. If you lack information, state it clearly. Do not hallucinate.
5. Prioritize pending tasks and deadlines in conversation when relevant.`;
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
    const response = await fetch(`${API_BASE_URL}/ai/azure-openai`, {
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
    const response = await fetch(`${API_BASE_URL}/ai/azure-realtime`, {
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

async function processSTTWithAzure(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('definition', JSON.stringify({
      locales: ["en-US", "hi-IN"],
      diarization: { maxSpeakers: 2, enabled: true }
    }));
    const response = await fetch(`${API_BASE_URL}/ai/azure-stt`, {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const data = await response.json();
      return data.combinedPhrases?.[0]?.text || data.text || data.displayText || '';
    }
    const errorText = await response.text();
    console.error('STT API Error:', errorText);
    throw new Error(`STT failed (HTTP ${response.status})`);
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
