// Simple pure JS AudioRecorder that outputs WAV format
export class WavRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.recorderNode = null;
    this.audioData = [];
    this.isRecording = false;
    this.isMuted = false;
    /** Sample index up to which we've already exported via exportIncrementalWav */
    this._exportedFrames = 0;
  }

  async start() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        // Advanced: prefer high-quality noise suppression if the browser supports it
        advanced: [
          { noiseSuppression: { ideal: true } },
          { echoCancellation: { ideal: true } },
          { autoGainControl: { ideal: true } }
        ]
      }
    });
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    
    // Convert float32 channel data into pure Int16 PCM Base64 chunk
    const processChunk = (float32Array) => {
      const outputBuffer = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        outputBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      let binary = '';
      const bytes = new Uint8Array(outputBuffer.buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Create script processor to capture raw PCM
    this.recorderNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.recorderNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      
      // Store locally just in case (skip if muted)
      if (!this.isMuted) {
        this.audioData.push(new Float32Array(channelData));
      }
      
      // Stream live to external (send silence if muted)
      if (this.onAudioChunk) {
        if (this.isMuted) {
          // Send silence buffer — same size, all zeros
          const silence = new Float32Array(channelData.length);
          this.onAudioChunk(processChunk(silence));
        } else {
          this.onAudioChunk(processChunk(channelData));
        }
      }
    };

    source.connect(this.recorderNode);
    this.recorderNode.connect(this.audioContext.destination);
    this.isRecording = true;
    this.isMuted = false;
    this._exportedFrames = 0;
  }

  /**
   * Toggle mute state. When muted, silence is streamed instead of mic audio.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.isMuted = !!muted;
  }

  /**
   * WAV blob for audio recorded since the last incremental export (or since start).
   * Does not stop the mic — use between utterances so Talk notes can include audio before "Stop".
   */
  exportIncrementalWav() {
    let totalLength = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      totalLength += this.audioData[i].length;
    }
    if (this._exportedFrames >= totalLength) return null;
    const pcmData = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      pcmData.set(this.audioData[i], offset);
      offset += this.audioData[i].length;
    }
    const slice = pcmData.subarray(this._exportedFrames);
    this._exportedFrames = totalLength;
    if (!slice.length) return null;
    return this._float32ToWavBlob(slice);
  }

  _float32ToWavBlob(float32Arr) {
    const outputBuffer = new Int16Array(float32Arr.length);
    for (let i = 0; i < float32Arr.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Arr[i]));
      outputBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const sampleRate = 24000;
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const buffer = new ArrayBuffer(44 + outputBuffer.length * 2);
    const view = new DataView(buffer);
    const writeString = (v, o, string) => {
      for (let i = 0; i < string.length; i++) v.setUint8(o + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + outputBuffer.length * 2, true);
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
    view.setUint32(40, outputBuffer.length * 2, true);
    const offsetOutput = 44;
    for (let i = 0; i < outputBuffer.length; i++) {
      view.setInt16(offsetOutput + i * 2, outputBuffer[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  async stop() {
    this.isRecording = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (this.recorderNode) {
      this.recorderNode.disconnect();
    }
    if (this.audioContext) {
      await this.audioContext.close();
    }

    return this.exportWav();
  }

  exportWav() {
    // Flatten audio data
    let totalLength = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      totalLength += this.audioData[i].length;
    }
    
    const pcmData = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      pcmData.set(this.audioData[i], offset);
      offset += this.audioData[i].length;
    }

    // Convert Float32 to Int16
    const outputBuffer = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      outputBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV header
    const sampleRate = 24000;
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    
    const buffer = new ArrayBuffer(44 + outputBuffer.length * 2);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + outputBuffer.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(view, 36, 'data');
    view.setUint32(40, outputBuffer.length * 2, true);

    // Write PCM data
    const offsetOutput = 44;
    for (let i = 0; i < outputBuffer.length; i++) {
      view.setInt16(offsetOutput + (i * 2), outputBuffer[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  exportPCMBase64() {
    let totalLength = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      totalLength += this.audioData[i].length;
    }
    const pcmData = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      pcmData.set(this.audioData[i], offset);
      offset += this.audioData[i].length;
    }

    // Int16 representation
    const outputBuffer = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      outputBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Convert to Binary String then Base64
    let binary = '';
    const bytes = new Uint8Array(outputBuffer.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
