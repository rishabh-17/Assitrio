/**
 * Concatenate multiple mono PCM WAV blobs (same sample rate / format as WavRecorder output).
 */
export async function mergeWavBlobs(blobs) {
  if (!blobs?.length) return null;
  if (blobs.length === 1) return blobs[0];

  const pcmParts = [];
  let sampleRate = 24000;

  for (const blob of blobs) {
    const ab = await blob.arrayBuffer();
    if (ab.byteLength < 44) continue;
    const view = new DataView(ab);
    sampleRate = view.getUint32(24, true);
    const dataSize = view.getUint32(40, true);
    const end = 44 + dataSize;
    const slice = ab.slice(44, end);
    pcmParts.push(new Int16Array(slice));
  }

  if (pcmParts.length === 0) return null;
  if (pcmParts.length === 1) {
    return buildWavBlob(pcmParts[0], sampleRate);
  }

  let total = 0;
  for (const p of pcmParts) total += p.length;
  const merged = new Int16Array(total);
  let off = 0;
  for (const p of pcmParts) {
    merged.set(p, off);
    off += p.length;
  }
  return buildWavBlob(merged, sampleRate);
}

/**
 * Mix (overlay) two WAV blobs by summing samples.
 * Both blobs must be mono 16-bit PCM at the same sample rate.
 * The output length equals the longer of the two.
 */
export async function mixWavBlobs(blobA, blobB) {
  if (!blobA && !blobB) return null;
  if (!blobA) return blobB;
  if (!blobB) return blobA;

  const [abA, abB] = await Promise.all([blobA.arrayBuffer(), blobB.arrayBuffer()]);

  const extractPcm = (ab) => {
    if (ab.byteLength < 44) return new Int16Array(0);
    const view = new DataView(ab);
    const dataSize = view.getUint32(40, true);
    return new Int16Array(ab.slice(44, 44 + dataSize));
  };

  const pcmA = extractPcm(abA);
  const pcmB = extractPcm(abB);
  const sampleRate = abA.byteLength >= 44 ? new DataView(abA).getUint32(24, true) : 24000;

  const maxLen = Math.max(pcmA.length, pcmB.length);
  const mixed = new Int16Array(maxLen);

  for (let i = 0; i < maxLen; i++) {
    const a = i < pcmA.length ? pcmA[i] : 0;
    const b = i < pcmB.length ? pcmB[i] : 0;
    // Sum and clamp to Int16 range
    mixed[i] = Math.max(-32768, Math.min(32767, a + b));
  }

  return buildWavBlob(mixed, sampleRate);
}

/**
 * Convert an array of base64 PCM16 chunks (24kHz mono) into a single WAV blob.
 */
export function pcmChunksToWavBlob(base64Chunks, sampleRate = 24000) {
  if (!base64Chunks?.length) return null;

  // Decode all base64 chunks into a single Int16Array
  const parts = [];
  let totalSamples = 0;

  for (const chunk of base64Chunks) {
    if (!chunk) continue;
    const binaryString = atob(chunk);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    parts.push(pcm16);
    totalSamples += pcm16.length;
  }

  if (totalSamples === 0) return null;

  const merged = new Int16Array(totalSamples);
  let off = 0;
  for (const p of parts) {
    merged.set(p, off);
    off += p.length;
  }

  return buildWavBlob(merged, sampleRate);
}

function buildWavBlob(outputBuffer, sampleRate) {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;

  const buffer = new ArrayBuffer(44 + outputBuffer.length * 2);
  const view = new DataView(buffer);

  const writeString = (v, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      v.setUint8(offset + i, string.charCodeAt(i));
    }
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
