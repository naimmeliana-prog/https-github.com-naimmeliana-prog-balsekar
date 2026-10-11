import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceOption {
  id: string;
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isSpanish: boolean;
}

export interface DebugLogEntry {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface AudioReaderContextType {
  isPlaying: boolean;
  isPaused: boolean;
  currentTitle: string;
  currentText: string;
  currentSentence: string;
  speed: number;
  progress: number;
  ambientSound: boolean;
  voices: VoiceOption[];
  selectedVoiceName: string;
  isMobile: boolean;
  speechError: string | null;
  clearSpeechError: () => void;
  speak: (text: string, title?: string, audioFileUrl?: string) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  setSpeed: (speed: number) => void;
  setSelectedVoiceName: (voiceName: string) => void;
  toggleAmbientSound: () => void;
  playSingingBowl: (freqOrEvent?: number | unknown) => void;
  testVoice: () => void;
  // Mobile Debug & MIME Inspection properties
  debugLogs: DebugLogEntry[];
  addDebugLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void;
  clearDebugLogs: () => void;
  isAutoPlayUnlocked: boolean;
  supportedMimes: Record<string, string>;
  currentPlaybackMode: 'audio-file' | 'speech-synthesis' | 'idle';
  unlockAudioManually: () => Promise<boolean>;
}

const AudioReaderContext = createContext<AudioReaderContextType | undefined>(undefined);

// Detect mobile environment (Xiaomi, Android, iOS, etc.)
const checkIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check Xiaomi specifically
const checkIsXiaomi = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Xiaomi|Redmi|POCO|MIUI|HyperOS/i.test(navigator.userAgent);
};

// Global pool of active utterances to prevent V8 mobile garbage collection
const activeUtterancesPool: SpeechSynthesisUtterance[] = [];

// Clean text for speech synthesis
function cleanSpokenText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[«»""'']/g, '')
    .replace(/[*_#`~^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split long text into natural sentence chunks (~80-150 chars).
 * Prevents the Android 15-second speech synthesis abort bug.
 */
function splitIntoChunks(text: string): string[] {
  if (!text) return [];
  const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (currentChunk.length + trimmed.length < 150) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = trimmed;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text];
}

// Inspect browser MIME type support for audio formats
const inspectMimeTypes = (): Record<string, string> => {
  if (typeof document === 'undefined') return {};
  try {
    const audio = document.createElement('audio');
    const mimeTypesToTest = [
      'audio/wav',
      'audio/wav; codecs="1"',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg; codecs="vorbis"',
      'audio/aac',
      'audio/webm',
    ];
    const results: Record<string, string> = {};
    for (const mime of mimeTypesToTest) {
      const canPlay = audio.canPlayType(mime);
      results[mime] = canPlay === 'probably' ? 'probable (óptimo)' : canPlay === 'maybe' ? 'posible (básico)' : 'no soportado';
    }
    return results;
  } catch {
    return {};
  }
};

export const AudioReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [speed, setSpeedState] = useState<number>(1.0);
  const [progress, setProgress] = useState<number>(0);
  const [ambientSound] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isMobile] = useState<boolean>(checkIsMobile());
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('balsekar-voice')) || '';
  });
  const [userExplicitlyChoseVoice, setUserExplicitlyChoseVoice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('balsekar-voice'));
  });
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Debug Logging State & Capabilities
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isAutoPlayUnlocked, setIsAutoPlayUnlocked] = useState<boolean>(false);
  const [supportedMimes, setSupportedMimes] = useState<Record<string, string>>({});
  const [currentPlaybackMode, setCurrentPlaybackMode] = useState<'audio-file' | 'speech-synthesis' | 'idle'>('idle');

  // Unified HTML5 Audio element for mobile file playback
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Utterance tracking refs
  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Append debug log function with console mirror
  const addLog = useCallback((message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const timeStr = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: timeStr,
      level,
      message,
    };

    // Console output with clear prefix
    const prefix = `[AudioReader][${timeStr}]`;
    if (level === 'error') {
      console.error(prefix, message);
    } else if (level === 'warn') {
      console.warn(prefix, message);
    } else {
      console.log(prefix, message);
    }

    setDebugLogs((prev) => [entry, ...prev.slice(0, 75)]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  // Initialize and unlock audio element on mobile user gestures
  const unlockAudioManually = useCallback(async (): Promise<boolean> => {
    addLog('Iniciando desbloqueo de auto-play móvil...', 'info');
    try {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.setAttribute('playsinline', 'true');
        audioElementRef.current.setAttribute('webkit-playsinline', 'true');
      }

      const audio = audioElementRef.current;
      // 1-sample silent WAV data URI to unlock audio hardware without any audible sound or buzz
      const SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audio.src = SILENT_WAV_DATA_URI;
      audio.volume = 0.01;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        audio.pause();
        audio.currentTime = 0;
      }

      setIsAutoPlayUnlocked(true);
      addLog('¡Restricción de reproducción automática (auto-play) desbloqueada con éxito!', 'success');

      // Also wake up SpeechSynthesis if paused
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          addLog('SpeechSynthesis del navegador reanudado', 'info');
        }
      }

      return true;
    } catch (err: any) {
      addLog(`Aviso al desbloquear auto-play: ${err.name || 'Error'} - ${err.message || err}`, 'warn');
      return false;
    }
  }, [addLog]);

  // Initial diagnostics on mount
  useEffect(() => {
    const mobileStatus = checkIsMobile();
    const xiaomiStatus = checkIsXiaomi();
    const mimes = inspectMimeTypes();
    setSupportedMimes(mimes);

    addLog(
      `Inicializado AudioReader. Móvil: ${mobileStatus ? 'SÍ' : 'NO'}${xiaomiStatus ? ' (Xiaomi detectado)' : ''} | Navegador: ${navigator.userAgent.slice(0, 85)}...`,
      'info'
    );
    addLog(
      `Soporte MIME detectado: audio/wav: ${mimes['audio/wav'] || 'n/a'} | audio/mpeg: ${mimes['audio/mpeg'] || 'n/a'}`,
      'info'
    );

    // Prepare audio element
    if (!audioElementRef.current && typeof Audio !== 'undefined') {
      audioElementRef.current = new Audio();
      audioElementRef.current.setAttribute('playsinline', 'true');
      audioElementRef.current.setAttribute('webkit-playsinline', 'true');
    }

    // Global listener for first user touch/click to unlock audio element
    const handleFirstGesture = () => {
      unlockAudioManually();
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };

    window.addEventListener('touchstart', handleFirstGesture, { passive: true, once: true });
    window.addEventListener('click', handleFirstGesture, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };
  }, [addLog, unlockAudioManually]);

  // Voice enumeration and refresh logic with multi-stage Android polling
  const refreshVoices = useCallback((): VoiceOption[] => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    try {
      const raw = window.speechSynthesis.getVoices();
      if (!raw || raw.length === 0) {
        return [];
      }

      const seen = new Set<string>();
      const list: VoiceOption[] = [];

      raw.forEach((v, idx) => {
        const signature = `${v.name}|${v.lang}|${v.voiceURI || idx}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          const langLower = v.lang.toLowerCase();
          const isSpanish = langLower.startsWith('es') || langLower.includes('es-');
          list.push({
            id: `v-${idx}-${v.name.replace(/[^a-zA-Z0-9]/g, '_')}-${v.lang}`,
            voice: v,
            name: v.name,
            lang: v.lang,
            isSpanish,
          });
        }
      });

      // Sort: Spanish voices first, then alphabetical
      list.sort((a, b) => {
        if (a.isSpanish && !b.isSpanish) return -1;
        if (!a.isSpanish && b.isSpanish) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(list);

      const spanishCount = list.filter((v) => v.isSpanish).length;
      addLog(`Voces del sistema cargadas: ${list.length} encontradas (${spanishCount} en español)`, 'info');

      // On desktop, auto-select Spanish voice if none selected. On mobile, keep default
      setSelectedVoiceName((curr) => {
        if (curr && list.some((v) => v.name === curr)) {
          return curr;
        }
        if (!checkIsMobile()) {
          const spanish = list.find((v) => v.isSpanish);
          return spanish ? spanish.name : list[0]?.name || '';
        }
        return curr;
      });

      return list;
    } catch (err: any) {
      addLog(`Error leyendo voces del sistema: ${err.message}`, 'warn');
      return [];
    }
  }, [addLog]);

  // Voice initialization with staggered fallback for Xiaomi MIUI
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    refreshVoices();

    const onVoices = () => {
      refreshVoices();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.onvoiceschanged = onVoices;

    const pollDelays = [200, 600, 1200, 2500];
    const timers = pollDelays.map((delay) =>
      window.setTimeout(() => {
        refreshVoices();
      }, delay)
    );

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [refreshVoices]);

  // Stop all speech and audio file playback
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;

    addLog('Deteniendo toda reproducción de audio', 'info');

    // 1. Stop HTML5 audio element
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = '';
      } catch {
        // Ignore
      }
    }

    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {
        // Ignore
      }
      activeBlobUrlRef.current = null;
    }

    // 2. Stop Web Speech API
    activeUtterancesPool.length = 0;
    if (typeof window !== 'undefined') {
      (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }
    }

    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentSentence('');
    setCurrentPlaybackMode('idle');
  }, [addLog]);

  // Internal function to speak an individual sentence chunk via Web Speech API
  const speakChunk = useCallback(
    (index: number) => {
      if (isCancelledRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      const chunks = chunksRef.current;
      if (!chunks || index >= chunks.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        addLog('Lectura de todas las frases completada con éxito', 'success');
        setTimeout(() => {
          stopSpeech();
        }, 200);
        return;
      }

      currentChunkIndexRef.current = index;
      const textToSpeak = chunks[index];
      setCurrentSentence(textToSpeak);

      const progressPct = Math.min(98, Math.max(5, Math.round(((index + 1) / chunks.length) * 100)));
      setProgress(progressPct);

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Keep active reference to prevent mobile V8 garbage collection
        activeUtterancesPool.push(utterance);
        (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = utterance;

        utterance.rate = Math.min(1.4, Math.max(0.7, speedRef.current));
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Detect Spanish voice
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        const detectedSpanish = currentVoices.find((v) => {
          const l = ('lang' in v ? v.lang : '').toLowerCase();
          return l.startsWith('es') || l.includes('es-');
        });

        utterance.lang = detectedSpanish?.lang || 'es-ES';

        const isMobileDevice = checkIsMobile();

        // On mobile Android, leave utterance.voice undefined to let OS route to Google TTS reliably
        if (!isMobileDevice) {
          let chosenVoice = currentVoices.find((v) => v.name === selectedVoiceName);
          if (!chosenVoice && detectedSpanish) {
            chosenVoice = detectedSpanish;
          }
          if (chosenVoice) {
            const voiceObj = 'voice' in chosenVoice ? (chosenVoice as VoiceOption).voice : (chosenVoice as SpeechSynthesisVoice);
            if (voiceObj) {
              utterance.voice = voiceObj;
            }
          }
        } else if (userExplicitlyChoseVoice && selectedVoiceName) {
          const chosenVoice = currentVoices.find((v) => v.name === selectedVoiceName);
          if (chosenVoice) {
            const voiceObj = 'voice' in chosenVoice ? (chosenVoice as VoiceOption).voice : (chosenVoice as SpeechSynthesisVoice);
            if (voiceObj) {
              utterance.voice = voiceObj;
            }
          }
        }

        utterance.onstart = () => {
          if (!isCancelledRef.current) {
            setIsPlaying(true);
            setIsPaused(false);
            setCurrentPlaybackMode('speech-synthesis');
            addLog(`Frase [${index + 1}/${chunks.length}] iniciada vía SpeechSynthesis: "${textToSpeak.slice(0, 30)}..."`, 'info');
          }
        };

        utterance.onend = () => {
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);

          if (isCancelledRef.current) return;
          speakChunk(index + 1);
        };

        utterance.onerror = (e) => {
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);

          if (e.error === 'interrupted' || e.error === 'canceled') {
            return;
          }

          addLog(`Error en SpeechSynthesis (código: ${e.error}) en frase: "${textToSpeak.slice(0, 30)}..."`, 'error');

          setSpeechError(
            `El sintetizador de voz del móvil no pudo emitir audio (${e.error || 'fallo'}). En tu Xiaomi 11T, pulsa los botones laterales de volumen, toca los tres puntos (•••) y sube la barra de Multimedia 🎵.`
          );
          stopSpeech();
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        addLog(`Excepción al invocar speechSynthesis.speak(): ${err.message}`, 'error');
      }
    },
    [voices, selectedVoiceName, userExplicitlyChoseVoice, stopSpeech, addLog]
  );

  // Play an Audio File (WAV, MP3, etc.) using HTMLAudioElement with strict MIME handling & auto-play unlock
  const playAudioFile = useCallback(
    async (url: string, title: string, textFallback: string) => {
      addLog(`Intentando reproducir archivo de audio: ${url}`, 'info');

      try {
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
          audioElementRef.current.setAttribute('playsinline', 'true');
          audioElementRef.current.setAttribute('webkit-playsinline', 'true');
        }

        const audio = audioElementRef.current;
        setCurrentPlaybackMode('audio-file');
        setCurrentTitle(title);
        setIsPlaying(true);
        setIsPaused(false);
        setProgress(10);

        // MIME Type Check
        const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
        let mimeType = 'audio/wav';
        if (extension === 'mp3') mimeType = 'audio/mpeg';
        else if (extension === 'ogg') mimeType = 'audio/ogg';
        else if (extension === 'aac') mimeType = 'audio/aac';

        const canPlay = audio.canPlayType(mimeType);
        addLog(`Verificación MIME para "${mimeType}": ${canPlay || 'no soportado'}`, 'info');

        if (canPlay === '') {
          addLog(`MIME "${mimeType}" no soportado directamente. Probando reproducción de todos modos...`, 'warn');
        }

        audio.src = url;
        audio.playbackRate = speedRef.current;

        audio.onplaying = () => {
          setIsPlaying(true);
          setIsPaused(false);
          addLog(`Archivo de audio en reproducción audible (${title})`, 'success');
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            const pct = Math.round((audio.currentTime / audio.duration) * 100);
            setProgress(pct);
          }
        };

        audio.onended = () => {
          addLog(`Archivo de audio finalizado (${title})`, 'success');
          stopSpeech();
        };

        audio.onerror = () => {
          const mediaError = audio.error;
          const errorCode = mediaError ? mediaError.code : 'desconocido';
          const errorMsg = mediaError ? mediaError.message : 'Error de decodificación o red';
          addLog(`Error al reproducir archivo de audio (código ${errorCode}: ${errorMsg}). Activando fallback a síntesis de voz...`, 'warn');

          // Fallback to Web Speech API
          const clean = cleanSpokenText(textFallback);
          chunksRef.current = splitIntoChunks(clean);
          currentChunkIndexRef.current = 0;
          speakChunk(0);
        };

        await audio.play();
        setIsAutoPlayUnlocked(true);
      } catch (err: any) {
        addLog(`Fallo al reproducir archivo de audio (${err.name}: ${err.message}). Cambiando a síntesis de voz...`, 'warn');

        // Fallback to Web Speech API
        const clean = cleanSpokenText(textFallback);
        chunksRef.current = splitIntoChunks(clean);
        currentChunkIndexRef.current = 0;
        speakChunk(0);
      }
    },
    [addLog, speakChunk, stopSpeech]
  );

  // Main Speak function - Handles both Audio Files and Web Speech API
  const speak = useCallback(
    async (text: string, title: string = 'Lectura de Enseñanza', audioFileUrl?: string) => {
      if (!text && !audioFileUrl) return;

      addLog(`Petición speak() recibida para: "${title}" (audioFileUrl: ${audioFileUrl ? 'Sí' : 'No'})`, 'info');
      setSpeechError(null);
      isCancelledRef.current = false;

      // 1. Synchronously unlock mobile audio within the user gesture turn
      unlockAudioManually();

      // 2. If a pre-configured audioFileUrl is supplied, play it via HTMLAudioElement
      if (audioFileUrl) {
        playAudioFile(audioFileUrl, title, text);
        return;
      }

      // 3. Check if server TTS API is available for this snippet
      const clean = cleanSpokenText(text);
      if (!clean) return;

      setCurrentTitle(title);
      setCurrentText(clean);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);

      // Attempt server TTS audio file fetch if text is reasonably sized (<300 chars)
      if (clean.length < 320) {
        addLog(`Consultando audio generado del servidor (/api/tts) para: "${clean.slice(0, 35)}..."`, 'info');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const contentType = res.headers.get('Content-Type') || 'audio/wav';
            const blob = await res.blob();
            addLog(`Recibido archivo de audio del servidor (${blob.size} bytes, MIME: ${contentType})`, 'success');

            const blobUrl = URL.createObjectURL(blob);
            activeBlobUrlRef.current = blobUrl;
            playAudioFile(blobUrl, title, clean);
            return;
          } else {
            const errData = await res.json().catch(() => ({}));
            addLog(`Servidor TTS respondió estado ${res.status} (${errData.error || 'cuota o no disponible'}). Usando síntesis local Web Speech API...`, 'info');
          }
        } catch (fetchErr: any) {
          addLog(`Aviso en /api/tts (${fetchErr.name || 'timeout'}). Usando síntesis local del navegador...`, 'info');
        }
      }

      // 4. Default / Fallback: Web Speech API (SpeechSynthesis)
      if (!('speechSynthesis' in window)) {
        setSpeechError('Tu navegador no es compatible con la síntesis de voz (Web Speech API).');
        addLog('Web Speech API no disponible en este navegador', 'error');
        return;
      }

      // Android/Chromium fix: Resume if stuck or paused
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore
      }

      // Prepare sentence chunks
      const chunks = splitIntoChunks(clean);
      chunksRef.current = chunks;
      currentChunkIndexRef.current = 0;

      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }

      // Execute speakChunk synchronously within the trusted user gesture
      speakChunk(0);
    },
    [addLog, unlockAudioManually, playAudioFile, speakChunk]
  );

  // Pause speech or audio
  const pauseSpeech = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);
    addLog('Pausando reproducción de audio', 'info');

    if (audioElementRef.current && currentPlaybackMode === 'audio-file') {
      try {
        audioElementRef.current.pause();
      } catch {
        // Ignore
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
  }, [addLog, currentPlaybackMode]);

  // Resume speech or audio
  const resumeSpeech = useCallback(() => {
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);
    addLog('Reanudando reproducción de audio', 'info');

    if (audioElementRef.current && currentPlaybackMode === 'audio-file') {
      try {
        audioElementRef.current.play();
        return;
      } catch {
        // Ignore
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (chunksRef.current.length > 0) {
          speakChunk(currentChunkIndexRef.current);
        } else if (currentText) {
          speak(currentText, currentTitle);
        }
      } catch {
        if (currentText) {
          speak(currentText, currentTitle);
        }
      }
    }
  }, [addLog, currentPlaybackMode, currentText, currentTitle, speak, speakChunk]);

  // Speed adjustments
  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
      addLog(`Velocidad de reproducción cambiada a ${newSpeed}x`, 'info');

      if (audioElementRef.current) {
        audioElementRef.current.playbackRate = newSpeed;
      }

      if (isPlaying && !isPaused && currentText && currentPlaybackMode === 'speech-synthesis') {
        speak(currentText, currentTitle);
      }
    },
    [addLog, isPlaying, isPaused, currentText, currentTitle, currentPlaybackMode, speak]
  );

  const handleSetVoice = useCallback((name: string) => {
    setSelectedVoiceName(name);
    setUserExplicitlyChoseVoice(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('balsekar-voice', name);
    }
  }, []);

  // Completely silenced bell function
  const playSingingBowl = useCallback((_param?: number | unknown) => {
    // Zero sounds or bells
  }, []);

  // Completely silenced ambient sound
  const toggleAmbientSound = useCallback(() => {
    // Zero background buzzing
  }, []);

  // Direct, quick narration demonstration
  const testVoice = useCallback(() => {
    speak(
      'La Consciencia es todo lo que hay. Las cosas suceden y los acontecimientos tienen lugar, pero no hay un hacedor individual.',
      'Demostración de Voz del Narrador'
    );
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  return (
    <AudioReaderContext.Provider
      value={{
        isPlaying,
        isPaused,
        currentTitle,
        currentText,
        currentSentence,
        speed,
        progress,
        ambientSound,
        voices,
        selectedVoiceName,
        isMobile,
        speechError,
        clearSpeechError,
        speak,
        pauseSpeech,
        resumeSpeech,
        stopSpeech,
        setSpeed,
        setSelectedVoiceName: handleSetVoice,
        toggleAmbientSound,
        playSingingBowl,
        testVoice,
        // Mobile Debug & MIME Properties
        debugLogs,
        addDebugLog: addLog,
        clearDebugLogs,
        isAutoPlayUnlocked,
        supportedMimes,
        currentPlaybackMode,
        unlockAudioManually,
      }}
    >
      {children}
    </AudioReaderContext.Provider>
  );
};

export const useAudioReader = (): AudioReaderContextType => {
  const context = useContext(AudioReaderContext);
  if (!context) {
    throw new Error('useAudioReader debe ser usado dentro de un AudioReaderProvider');
  }
  return context;
};
