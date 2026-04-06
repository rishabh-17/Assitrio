/**
 * Speech Service using Web Speech API (browser native)
 * with Azure Realtime as enhancement layer
 * 
 * Provides STT (Speech-to-Text) and TTS (Text-to-Speech)
 */

const AZURE_REALTIME_KEY = import.meta.env?.VITE_AZURE_REALTIME_KEY || '';
const AZURE_REALTIME_REGION = import.meta.env?.VITE_AZURE_REALTIME_REGION || 'xeny-resource';

// ── Speech-to-Text (STT) ──

/**
 * Check if browser supports Speech Recognition
 */
export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Create and start a speech recognition session
 * @param {Object} options
 * @param {Function} options.onResult - Called with transcript text on each result
 * @param {Function} options.onEnd - Called when recognition ends
 * @param {Function} options.onError - Called on error
 * @param {string} options.lang - Language code (default: 'en-IN' for Indian English)
 * @returns {SpeechRecognition} - The recognition instance (call .stop() to end)
 */
export function startListening({ onResult, onEnd, onError, lang = 'en-IN', continuous = true } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError(new Error('Speech recognition not supported in this browser'));
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = continuous;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript = transcript;
      }
    }
    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript,
        display: interimTranscript || finalTranscript.trim()
      });
    }
  };

  recognition.onend = () => {
    if (onEnd) onEnd(finalTranscript.trim());
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (onError) onError(event);
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn('Failed to start recognition:', e);
    if (onError) onError(e);
  }

  return recognition;
}

// ── Text-to-Speech (TTS) ──

/**
 * Check if browser supports Speech Synthesis
 */
export function isSpeechSynthesisSupported() {
  return !!window.speechSynthesis;
}

/**
 * Speak text using browser TTS
 * @param {string} text - Text to speak
 * @param {Object} options
 * @param {Function} options.onEnd - Called when speech ends
 * @param {Function} options.onError - Called on error
 * @param {string} options.lang - Language code
 * @returns {SpeechSynthesisUtterance} - The utterance instance
 */
export function speak(text, { onEnd, onError, lang = 'en-IN' } = {}) {
  if (!isSpeechSynthesisSupported()) {
    if (onError) onError(new Error('Speech synthesis not supported'));
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a good Hindi or Indian English voice for Hinglish
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v =>
    v.lang.includes('hi-IN')
  ) || voices.find(v =>
    v.lang.includes('en-IN')
  ) || voices.find(v =>
    v.lang.includes('en-GB')
  ) || voices.find(v => v.lang.includes('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => { if (onEnd) onEnd(); };
  utterance.onerror = (e) => { if (onError) onError(e); };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
