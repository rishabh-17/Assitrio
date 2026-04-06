/**
 * PCMPlayer handles buffering and seamlessly playing back 16-bit PCM audio chunks over the Web Audio API. 
 */
export class PCMPlayer {
    constructor(sampleRate = 24000) {
        this.sampleRate = sampleRate;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        this.startTime = this.audioCtx.currentTime;
    }

    /**
     * Feed base64 string containing PCM16 data into playback queue
     * @param {string} base64 
     */
    appendBase64(base64) {
        if (!base64) return;
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert PCM 16-bit (little endian) into Float32 [-1.0, 1.0] for Web Audio
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            // Int16 ranges from -32768 to 32767
            float32[i] = pcm16[i] / 32768.0;
        }

        const audioBuffer = this.audioCtx.createBuffer(1, float32.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(float32);

        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioCtx.destination);

        // Calculate seamless playback time
        if (this.startTime < this.audioCtx.currentTime) {
            this.startTime = this.audioCtx.currentTime;
        }
        source.start(this.startTime);
        this.startTime += audioBuffer.duration;
    }

    reset() {
        if (this.audioCtx) {
            this.audioCtx.close();
        }
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
        this.startTime = this.audioCtx.currentTime;
    }

    close() {
        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }
    }
}
