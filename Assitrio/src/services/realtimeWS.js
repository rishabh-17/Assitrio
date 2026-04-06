export class RealtimeWS {
  constructor(endpoint, apiKey, systemPrompt) {
    // Convert the provided REST endpoint into a valid Azure Realtime WSS URL
    const url = new URL(endpoint);
    
    // Extract deployment from /openai/deployments/<deployment-name>/chat/completions
    const match = url.pathname.match(/\/deployments\/([^\/]+)/);
    const deployment = match ? match[1] : 'gpt-realtime-1.5';
    
    // Reconstruct valid WS URL
    // e.g. wss://<resource>.cognitiveservices.azure.com/openai/realtime?api-version=...&deployment=...&api-key=...
    const wssUrl = `wss://${url.host}/openai/realtime?api-version=${url.searchParams.get('api-version') || '2024-10-01-preview'}&deployment=${deployment}&api-key=${apiKey}`;
    
    this.ws = new WebSocket(wssUrl);
    this.systemPrompt = systemPrompt;
    
    this.onAudioChunk = null;
    this.onAudioDone = null;
    this.onError = null;
    this.onText = null;
    this.onOpen = null;
    /** User speech → text (when the service sends transcription events) */
    this.onUserTranscript = null;
    this._userTranscriptDelta = '';

    this.isConnected = false;

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('Realtime WS Connected');
      
      // Update session with PCM properties and server VAD enabled
      this.ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: 'alloy',
          instructions: this.systemPrompt,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
             type: 'server_vad',
             threshold: 0.5,
             prefix_padding_ms: 300,
             silence_duration_ms: 500
          }
        }
      }));

      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'response.audio.delta' && msg.delta) {
        if (this.onAudioChunk) this.onAudioChunk(msg.delta); // base64 pcm
      }
      if (msg.type === 'response.text.delta' && msg.delta) {
        if (this.onText) this.onText(msg.delta);
      }
      if (msg.type === 'response.audio_transcript.delta' && msg.delta) {
        if (this.onText) this.onText(msg.delta);
      }
      if (msg.type === 'response.done') {
        if (this.onAudioDone) this.onAudioDone();
      }
      if (msg.type === 'input_audio_buffer.speech_started') {
        if (this.onSpeechStarted) this.onSpeechStarted();
      }
      if (msg.type === 'input_audio_buffer.speech_stopped') {
        if (this.onSpeechStopped) this.onSpeechStopped();
      }
      if (msg.type === 'conversation.item.input_audio_transcription.delta' && msg.delta) {
        this._userTranscriptDelta += msg.delta;
      }
      if (msg.type === 'conversation.item.input_audio_transcription.completed') {
        const full = (msg.transcript || this._userTranscriptDelta || '').trim();
        this._userTranscriptDelta = '';
        if (full && this.onUserTranscript) this.onUserTranscript(full);
      }
      if (msg.type === 'error') {
        console.error('WS Error message:', msg);
        if (this.onError) this.onError(msg.error.message);
      }
    };

    this.ws.onerror = (err) => {
      console.error('Realtime WS connection error', err);
      if (this.onError) this.onError('WebSocket connection failed.');
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      console.log('Realtime WS Disconnected');
    };
  }

  appendAudioUrl(base64PCM) {
    if (!this.isConnected) return;
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64PCM
    }));
  }

  commitAudioAndRequestResponse(historyMessages = []) {
    if (!this.isConnected) return;
    
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.commit'
    }));

    // Pass the message history to establish conversational context natively
    const conversation = {
       type: 'conversation.item.create',
       item: {
          type: 'message',
          role: 'user',
          content: historyMessages.map(m => ({ 
              type: 'text', 
              text: (m.role === 'user' ? 'Me: ' : 'Assistant: ') + m.content 
          }))
       }
    };

    // Note: To simplify the implementation and stick to pure audio processing, 
    // we bypass injecting all history here and let the system instruction carry the MOM context.
    
    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
