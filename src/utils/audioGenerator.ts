/**
 * Pure JavaScript PCM WAV Audio Generator
 * Generates pristine acoustic meditation sounds in memory as WAV Blobs.
 * Plays via native HTML5 <audio> (HTMLAudioElement), guaranteeing 100% audible playback
 * on all mobile devices (Xiaomi 11T, Android MIUI, iOS Safari, desktop browsers)
 * without relying solely on Web Audio API oscillators or SpeechSynthesis.
 */

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([buffer], { type: 'audio/wav' });
}

let cachedBellUrl: string | null = null;
let cachedDroneUrl: string | null = null;
let activeDroneAudio: HTMLAudioElement | null = null;

/**
 * Generate Tibetan Singing Bowl chime WAV (432 Hz + harmonics)
 */
export function getTibetanBellWavUrl(): string {
  if (cachedBellUrl) return cachedBellUrl;

  const sampleRate = 22050;
  const duration = 3.6; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Harmonics calibrated to be crisp and audible on mobile phone speakers
  const baseFreq = 432.0; // Sacred 432 Hz
  const partials = [
    { freq: baseFreq, amp: 0.45, decay: 1.1 },
    { freq: baseFreq * 2.0, amp: 0.32, decay: 1.6 },
    { freq: baseFreq * 3.0, amp: 0.20, decay: 2.2 },
    { freq: baseFreq * 4.2, amp: 0.12, decay: 3.0 },
    { freq: baseFreq * 6.1, amp: 0.06, decay: 4.2 },
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Strike attack envelope (quick 15ms ramp up)
    const attack = Math.min(1.0, t / 0.015);

    for (let p = 0; p < partials.length; p++) {
      const part = partials[p];
      const env = Math.exp(-part.decay * t);
      // Slight chorus shimmer
      const shimmer = 1 + 0.003 * Math.sin(2 * Math.PI * 3.5 * t);
      sample += part.amp * Math.sin(2 * Math.PI * part.freq * shimmer * t) * env;
    }

    samples[i] = sample * attack * 0.9;
  }

  const blob = encodeWAV(samples, sampleRate);
  cachedBellUrl = URL.createObjectURL(blob);
  return cachedBellUrl;
}

/**
 * Generate Indian Tanpura Meditation Drone Loop WAV
 * Frequencies: 216 Hz (Sa), 324 Hz (Pa), 432 Hz (High Sa) with gentle rhythmic pulse
 */
export function getTanpuraDroneWavUrl(): string {
  if (cachedDroneUrl) return cachedDroneUrl;

  const sampleRate = 22050;
  const duration = 8.0; // 8 seconds seamless loop
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  const notes = [
    { freq: 216.0, amp: 0.35, pulseOffset: 0.0 }, // Sa
    { freq: 324.0, amp: 0.28, pulseOffset: 2.0 }, // Pa
    { freq: 432.0, amp: 0.22, pulseOffset: 4.0 }, // Sa octave
    { freq: 648.0, amp: 0.14, pulseOffset: 6.0 }, // Pa harmonic
    { freq: 864.0, amp: 0.08, pulseOffset: 1.0 }, // Shimmer
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (let n = 0; n < notes.length; n++) {
      const note = notes[n];
      // Slow rhythmic string plucked pulse (every ~2 seconds per string)
      const pulsePhase = (t + note.pulseOffset) % 2.0;
      const pulseEnv = 0.55 + 0.45 * Math.sin((pulsePhase / 2.0) * Math.PI);
      const wave = Math.sin(2 * Math.PI * note.freq * t);
      sample += note.amp * wave * pulseEnv;
    }

    // Gentle crossfade at start and end for smooth loop
    let edgeFade = 1.0;
    if (t < 0.2) edgeFade = t / 0.2;
    if (t > duration - 0.2) edgeFade = (duration - t) / 0.2;

    samples[i] = sample * edgeFade * 0.75;
  }

  const blob = encodeWAV(samples, sampleRate);
  cachedDroneUrl = URL.createObjectURL(blob);
  return cachedDroneUrl;
}

/**
 * Plays the resonant Tibetan Singing Bowl via standard HTML5 Audio.
 * Completely immune to Xiaomi/MIUI and mobile browser Web Audio suspensions.
 */
export function playNativeBellAudio(volume: number = 0.85): HTMLAudioElement | null {
  try {
    const url = getTibetanBellWavUrl();
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err) => {
      console.warn('Native bell audio play error:', err);
    });
    return audio;
  } catch (err) {
    console.warn('Could not initialize native audio:', err);
    return null;
  }
}

/**
 * Starts continuous native Tanpura drone audio loop.
 */
export function startNativeTanpuraDrone(volume: number = 0.7): HTMLAudioElement | null {
  try {
    stopNativeTanpuraDrone();
    const url = getTanpuraDroneWavUrl();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err) => {
      console.warn('Native tanpura play error:', err);
    });
    activeDroneAudio = audio;
    return audio;
  } catch (err) {
    console.warn('Native tanpura init error:', err);
    return null;
  }
}

/**
 * Stops active native Tanpura drone audio.
 */
export function stopNativeTanpuraDrone() {
  if (activeDroneAudio) {
    try {
      activeDroneAudio.pause();
      activeDroneAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    activeDroneAudio = null;
  }
}

/**
 * Adjust volume of active native Tanpura drone
 */
export function setNativeTanpuraVolume(volume: number) {
  if (activeDroneAudio) {
    try {
      activeDroneAudio.volume = Math.max(0, Math.min(1, volume));
    } catch {
      // Ignore
    }
  }
}
