import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceOption {
  id: string;
  voice?: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isSpanish: boolean;
  isServerVoice?: boolean;
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
  // Mobile compatibility & diagnostics
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
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Xiaomi|Redmi/i.test(navigator.userAgent);
};

export const SERVER_VOICE_NAME = 'Voz de Estudio (Recomendada Móvil)';
const SERVER_VOICE_OPTION: VoiceOption = {
  id: 'server-studio-voice',
  name: SERVER_VOICE_NAME,
  lang: 'es-ES',
  isSpanish: true,
  isServerVoice: true,
};

// Global pool of active utterances to prevent V8 garbage collection on Chromium
const activeUtterancesPool: SpeechSynthesisUtterance[] = [];

// Clean text for speech synthesis and TTS
function cleanSpokenText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[«»""'']/g, '')
    .replace(/[*_#`~^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split long text into natural sentence chunks (~80-140 chars).
 */
function splitIntoChunks(text: string): string[] {
  if (!text) return [];
  const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (currentChunk.length + trimmed.length < 130) {
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

export const AudioReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [speed, setSpeedState] = useState<number>(1.0);
  const [progress, setProgress] = useState<number>(0);
  const [ambientSound] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceOption[]>([SERVER_VOICE_OPTION]);
  const [isMobile] = useState<boolean>(checkIsMobile());

  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('balsekar-voice');
      if (saved) return saved;
    }
    // On mobile devices, always default to the reliable studio server voice
    return SERVER_VOICE_NAME;
  });

  const [speechError, setSpeechError] = useState<string | null>(null);

  // Diagnostics & playback state
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isAutoPlayUnlocked, setIsAutoPlayUnlocked] = useState<boolean>(false);
  const [currentPlaybackMode, setCurrentPlaybackMode] = useState<'audio-file' | 'speech-synthesis' | 'idle'>('idle');

  // Unified HTML5 Audio element
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Refs for tracking playback across re-renders
  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const addLog = useCallback((message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const timeStr = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    console.log(`[AudioReader][${timeStr}] ${message}`);
    setDebugLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, time: timeStr, level, message },
      ...prev.slice(0, 50),
    ]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  // Helper to retrieve or initialize the HTMLAudioElement
  const getAudioElement = useCallback((): HTMLAudioElement => {
    if (!audioElementRef.current && typeof Audio !== 'undefined') {
      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.muted = false;
      audioElementRef.current = audio;
    }
    return audioElementRef.current as HTMLAudioElement;
  }, []);

  // Manual unlock for mobile user gesture
  const unlockAudioManually = useCallback(async (): Promise<boolean> => {
    try {
      const audio = getAudioElement();
      if (audio) {
        setIsAutoPlayUnlocked(true);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      return true;
    } catch {
      return false;
    }
  }, [getAudioElement]);

  // Touch listener to pre-unlock audio
  useEffect(() => {
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
  }, [unlockAudioManually]);

  // Voice enumeration and refresh logic
  const refreshVoices = useCallback((): VoiceOption[] => {
    const list: VoiceOption[] = [SERVER_VOICE_OPTION];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const raw = window.speechSynthesis.getVoices();
        if (raw && raw.length > 0) {
          const seen = new Set<string>();
          const synthList: VoiceOption[] = [];

          raw.forEach((v, idx) => {
            const signature = `${v.name}|${v.lang}|${v.voiceURI || idx}`;
            if (!seen.has(signature)) {
              seen.add(signature);
              const langLower = v.lang.toLowerCase();
              const isSpanish = langLower.startsWith('es') || langLower.includes('es-');
              synthList.push({
                id: `v-${idx}-${v.name.replace(/[^a-zA-Z0-9]/g, '_')}-${v.lang}`,
                voice: v,
                name: v.name,
                lang: v.lang,
                isSpanish,
                isServerVoice: false,
              });
            }
          });

          synthList.sort((a, b) => {
            if (a.isSpanish && !b.isSpanish) return -1;
            if (!a.isSpanish && b.isSpanish) return 1;
            return a.name.localeCompare(b.name);
          });

          list.push(...synthList);
        }
      } catch (err) {
        console.warn('Voice enumeration error:', err);
      }
    }

    setVoices(list);
    return list;
  }, []);

  useEffect(() => {
    refreshVoices();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const onVoices = () => {
      refreshVoices();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.onvoiceschanged = onVoices;

    const timers = [300, 1000, 2500].map((delay) =>
      window.setTimeout(() => refreshVoices(), delay)
    );

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [refreshVoices]);

  // Stop all speech and audio playback
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;

    // 1. Stop HTML5 audio element
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
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
  }, []);

  // Web Speech API fallback for chunked narration
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

        activeUtterancesPool.push(utterance);
        (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = utterance;

        utterance.rate = Math.min(1.4, Math.max(0.7, speedRef.current));
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'es-ES';

        // Assign voice if available
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        const chosenVoice = currentVoices.find((v) => ('name' in v ? v.name : '') === selectedVoiceName);
        if (chosenVoice && 'voice' in chosenVoice && (chosenVoice as VoiceOption).voice) {
          utterance.voice = (chosenVoice as VoiceOption).voice!;
        }

        utterance.onstart = () => {
          if (!isCancelledRef.current) {
            setIsPlaying(true);
            setIsPaused(false);
            setCurrentPlaybackMode('speech-synthesis');
          }
        };

        utterance.onend = () => {
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);
          (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = null;

          if (isCancelledRef.current) return;
          speakChunk(index + 1);
        };

        utterance.onerror = (e) => {
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);
          (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = null;

          if (e.error === 'interrupted' || e.error === 'canceled') {
            return;
          }

          if (index + 1 < chunksRef.current.length) {
            speakChunk(index + 1);
          } else {
            stopSpeech();
          }
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch (err: unknown) {
        console.warn('SpeechSynthesis error:', err);
      }
    },
    [voices, selectedVoiceName, stopSpeech]
  );

  // Play an audio stream or file via HTMLAudioElement (MP3 / WAV)
  const playAudioFile = useCallback(
    (url: string, title: string, textFallback: string) => {
      try {
        const audio = getAudioElement();
        isCancelledRef.current = false;

        // Stop any active Web Speech synthesis
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
          } catch {
            // Ignore
          }
        }

        setCurrentPlaybackMode('audio-file');
        setCurrentTitle(title);
        setCurrentSentence(textFallback ? textFallback.slice(0, 120) : '');
        setIsPlaying(true);
        setIsPaused(false);
        setProgress(5);

        // Normalize URL: prefer .mp3 for mobile devices
        let primaryUrl = url;
        let fallbackUrl: string | null = null;
        if (primaryUrl.endsWith('.wav')) {
          fallbackUrl = primaryUrl;
          primaryUrl = primaryUrl.replace(/\.wav$/, '.mp3');
        } else if (primaryUrl.endsWith('.mp3')) {
          fallbackUrl = primaryUrl.replace(/\.mp3$/, '.wav');
        }

        audio.pause();
        audio.src = primaryUrl;
        audio.playbackRate = speedRef.current;
        audio.volume = 1.0;
        audio.muted = false;

        audio.onplaying = () => {
          setIsPlaying(true);
          setIsPaused(false);
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
            setProgress(pct);
          }
        };

        audio.onended = () => {
          stopSpeech();
        };

        audio.onerror = () => {
          // If primary URL failed (e.g. mp3), try fallback wav
          if (fallbackUrl && audio.src !== fallbackUrl) {
            audio.src = fallbackUrl;
            audio.load();
            audio.play().catch(() => {
              // If both file formats fail, fallback to Web Speech
              fallbackToWebSpeech(textFallback);
            });
            return;
          }
          fallbackToWebSpeech(textFallback);
        };

        const fallbackToWebSpeech = (raw: string) => {
          const clean = cleanSpokenText(raw);
          if (!clean) {
            stopSpeech();
            return;
          }
          chunksRef.current = splitIntoChunks(clean);
          currentChunkIndexRef.current = 0;
          setCurrentPlaybackMode('speech-synthesis');
          speakChunk(0);
        };

        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('HTMLAudioElement play() warning:', err);
            // On mobile gesture restriction or network glitch, try fallback
            if (fallbackUrl) {
              audio.src = fallbackUrl;
              audio.load();
              audio.play().catch(() => fallbackToWebSpeech(textFallback));
            } else {
              fallbackToWebSpeech(textFallback);
            }
          });
        }
      } catch (err) {
        console.warn('playAudioFile fatal error:', err);
      }
    },
    [getAudioElement, speakChunk, stopSpeech]
  );

  // Main Speak function
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', audioFileUrl?: string) => {
      if (!text && !audioFileUrl) return;

      isCancelledRef.current = false;
      setSpeechError(null);

      // 1. If explicit audio file is provided (e.g. /audio/audio-1.mp3), play it directly
      if (audioFileUrl) {
        playAudioFile(audioFileUrl, title, text);
        return;
      }

      const clean = cleanSpokenText(text);
      if (!clean) return;

      // 2. Determine playback engine:
      // Mobile devices (Xiaomi, Android, iOS) or default voice use studio server audio stream.
      // This guarantees audio works on Xiaomi 11T where local Web Speech is broken or silent.
      const shouldUseServerTts =
        isMobile ||
        selectedVoiceName === SERVER_VOICE_NAME ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        voices.find((v) => v.name === selectedVoiceName)?.isServerVoice;

      if (shouldUseServerTts) {
        // Direct stream from our Express /api/tts endpoint (MP3 format, streaming byte range)
        const textSample = clean.length > 380 ? clean.slice(0, 380) + '...' : clean;
        const serverUrl = `/api/tts?text=${encodeURIComponent(textSample)}&format=mp3`;
        playAudioFile(serverUrl, title, clean);
        return;
      }

      // 3. Desktop user with specific local voice selected: use Web Speech API
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        } catch {
          // Ignore
        }
      }

      setCurrentTitle(title);
      setCurrentText(clean);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);
      setCurrentPlaybackMode('speech-synthesis');

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore
      }

      const chunks = splitIntoChunks(clean);
      chunksRef.current = chunks;
      currentChunkIndexRef.current = 0;
      speakChunk(0);
    },
    [isMobile, selectedVoiceName, voices, playAudioFile, speakChunk]
  );

  // Keep-alive timer for Web Speech API on Chromium
  useEffect(() => {
    if (!isPlaying || isPaused || currentPlaybackMode !== 'speech-synthesis') return;

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, currentPlaybackMode]);

  // Pause speech or audio
  const pauseSpeech = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);

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
  }, [currentPlaybackMode]);

  // Resume speech or audio
  const resumeSpeech = useCallback(() => {
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);

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
  }, [currentPlaybackMode, currentText, currentTitle, speak, speakChunk]);

  // Speed adjustments
  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;

      if (audioElementRef.current) {
        audioElementRef.current.playbackRate = newSpeed;
      }

      if (isPlaying && !isPaused && currentText && currentPlaybackMode === 'speech-synthesis') {
        speak(currentText, currentTitle);
      }
    },
    [isPlaying, isPaused, currentText, currentTitle, currentPlaybackMode, speak]
  );

  const handleSetVoice = useCallback((name: string) => {
    setSelectedVoiceName(name);
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

  // Direct, reliable audio test demonstration
  const testVoice = useCallback(() => {
    speak(
      'La Consciencia es todo lo que hay. Las cosas suceden y los acontecimientos tienen lugar, pero no hay un hacedor individual.',
      'Demostración de Voz del Narrador',
      '/audio/demo-test.mp3'
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
        debugLogs,
        addDebugLog: addLog,
        clearDebugLogs,
        isAutoPlayUnlocked,
        supportedMimes: { 'audio/mpeg': 'probably', 'audio/wav': 'probably' },
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
