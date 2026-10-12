import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

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

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioReaderContextType {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  playbackState: PlaybackState;
  currentTitle: string;
  currentText: string;
  currentSentence: string;
  speed: number;
  progress: number;
  currentTime: number;
  duration: number;
  ambientSound: boolean;
  voices: VoiceOption[];
  selectedVoiceName: string;
  isMobile: boolean;
  speechError: string | null;
  clearSpeechError: () => void;
  speak: (text: string, title?: string, audioFileUrl?: string) => void;
  playAudioFile: (url: string, title?: string, textFallback?: string) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  seek: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  setSelectedVoiceName: (voiceName: string) => void;
  toggleAmbientSound: () => void;
  playSingingBowl: (freqOrEvent?: number | unknown) => void;
  testVoice: () => void;
  debugLogs: DebugLogEntry[];
  addDebugLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void;
  clearDebugLogs: () => void;
  isAutoPlayUnlocked: boolean;
  supportedMimes: Record<string, string>;
  currentPlaybackMode: 'audio-file' | 'speech-synthesis' | 'idle';
  unlockAudioManually: () => Promise<boolean>;
}

const AudioReaderContext = createContext<AudioReaderContextType | undefined>(undefined);

// Detect mobile environment (Xiaomi, Redmi, Android, iOS, etc.)
const checkIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Xiaomi|Redmi/i.test(
    navigator.userAgent
  );
};

export const SERVER_VOICE_NAME = 'Voz de Estudio (Recomendada Móvil)';
const SERVER_VOICE_OPTION: VoiceOption = {
  id: 'server-studio-voice',
  name: SERVER_VOICE_NAME,
  lang: 'es-ES',
  isSpanish: true,
  isServerVoice: true,
};

// Global pool of active utterances to prevent Chromium GC issues
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
 * Split long text into natural sentence chunks (~90-130 chars).
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

interface AudioReaderProviderProps {
  children: ReactNode;
}

export const AudioReaderProvider: React.FC<AudioReaderProviderProps> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [speed, setSpeedState] = useState<number>(1.0);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [ambientSound] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceOption[]>([SERVER_VOICE_OPTION]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(SERVER_VOICE_NAME);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isAutoPlayUnlocked, setIsAutoPlayUnlocked] = useState<boolean>(false);
  const [currentPlaybackMode, setCurrentPlaybackMode] = useState<
    'audio-file' | 'speech-synthesis' | 'idle'
  >('idle');

  const isMobile = checkIsMobile();

  // Persistent DOM-backed HTMLAudioElement ref
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Playback control refs
  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);

  useEffect(() => {
    speedRef.current = speed;
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  }, [speed]);

  const addLog = useCallback(
    (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
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
    },
    []
  );

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  // Synchronous unlock helper for mobile touch gesture
  const unlockAudioManually = useCallback(async (): Promise<boolean> => {
    try {
      setIsAutoPlayUnlocked(true);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Pre-unlock on first user tap/click
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

  // Load available speech synthesis voices for desktop browsers
  const refreshVoices = useCallback(() => {
    const list: VoiceOption[] = [SERVER_VOICE_OPTION];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          const synthList: VoiceOption[] = available.map((v, i) => {
            const isEs =
              v.lang.toLowerCase().startsWith('es') ||
              v.name.toLowerCase().includes('spanish') ||
              v.name.toLowerCase().includes('español');
            return {
              id: `synth-${v.name}-${i}`,
              voice: v,
              name: v.name,
              lang: v.lang,
              isSpanish: isEs,
              isServerVoice: false,
            };
          });

          synthList.sort((a, b) => {
            if (a.isSpanish && !b.isSpanish) return -1;
            if (!a.isSpanish && b.isSpanish) return 1;
            return a.name.localeCompare(b.name);
          });

          list.push(...synthList);
        }
      } catch (err) {
        console.warn('Voice enumeration warning:', err);
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

  // Completely stop all speech and audio playback
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;

    // 1. Pause HTML5 Audio Element
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
    }

    // 2. Cancel Web Speech API
    activeUtterancesPool.length = 0;
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
    setIsLoading(false);
    setPlaybackState('idle');
    setProgress(0);
    setCurrentTime(0);
    setCurrentSentence('');
    setCurrentPlaybackMode('idle');
    setSpeechError(null);
  }, []);

  // Web Speech API fallback for desktop browsers
  const speakChunk = useCallback(
    (index: number) => {
      if (
        isCancelledRef.current ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }

      const chunks = chunksRef.current;
      if (!chunks || index >= chunks.length) {
        stopSpeech();
        return;
      }

      currentChunkIndexRef.current = index;
      const textToSpeak = chunks[index];
      setCurrentSentence(textToSpeak);

      const progressPct = Math.min(
        98,
        Math.max(5, Math.round(((index + 1) / chunks.length) * 100))
      );
      setProgress(progressPct);

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        activeUtterancesPool.push(utterance);

        utterance.rate = Math.min(1.4, Math.max(0.7, speedRef.current));
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'es-ES';

        // Assign voice if available
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        const chosenVoice = currentVoices.find(
          (v) => ('name' in v ? v.name : '') === selectedVoiceName
        );
        if (chosenVoice && 'voice' in chosenVoice && (chosenVoice as VoiceOption).voice) {
          utterance.voice = (chosenVoice as VoiceOption).voice!;
        }

        utterance.onstart = () => {
          if (!isCancelledRef.current) {
            setIsPlaying(true);
            setIsPaused(false);
            setIsLoading(false);
            setPlaybackState('playing');
            setCurrentPlaybackMode('speech-synthesis');
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
    (url: string, title?: string, textFallback?: string) => {
      try {
        isCancelledRef.current = false;

        // Stop any active Web Speech synthesis on desktop
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
          } catch {
            // Ignore
          }
        }

        const resolvedTitle = title || 'Reproduciendo Audio';
        const sentencePreview = textFallback ? textFallback.slice(0, 140) : '';

        // Open the player bar immediately in loading state
        setCurrentPlaybackMode('audio-file');
        setCurrentTitle(resolvedTitle);
        setCurrentSentence(sentencePreview);
        setIsLoading(true);
        setIsPlaying(true);
        setIsPaused(false);
        setPlaybackState('loading');
        setProgress(0);
        setCurrentTime(0);
        setSpeechError(null);

        // Normalize URL: prefer .mp3 for universal hardware playback
        let targetUrl = url;
        if (targetUrl.endsWith('.wav')) {
          targetUrl = targetUrl.replace(/\.wav$/, '.mp3');
        }

        const audio = audioElementRef.current;
        if (!audio) {
          console.warn('Audio element ref not attached yet');
          return;
        }

        // Avoid re-assigning same src if already playing
        const currentSrc = audio.src ? new URL(audio.src, window.location.href).href : '';
        const targetFullUrl = new URL(targetUrl, window.location.href).href;

        if (currentSrc !== targetFullUrl) {
          audio.src = targetUrl;
          audio.currentTime = 0;
        }

        audio.playbackRate = speedRef.current;
        audio.volume = 1.0;
        audio.muted = false;

        // Invoke play() directly within user gesture stack
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsLoading(false);
              setIsPlaying(true);
              setIsPaused(false);
              setPlaybackState('playing');
            })
            .catch((err: Error) => {
              if (err.name === 'AbortError') {
                // Interrupted by another playback request, standard Chromium behavior
                return;
              }
              if (err.name === 'NotAllowedError') {
                // Mobile policy required an explicit click on the player
                setIsLoading(false);
                setIsPlaying(false);
                setIsPaused(true);
                setPlaybackState('paused');
                setSpeechError('Toca reproducir en la barra inferior');
                return;
              }
              console.warn('HTMLAudioElement play() warning:', err);
              setIsLoading(false);
              setPlaybackState('error');
              setSpeechError('Error al reproducir. Toca para reintentar.');
            });
        }
      } catch (err) {
        console.warn('playAudioFile fatal error:', err);
        setIsLoading(false);
        setPlaybackState('error');
      }
    },
    []
  );

  // Main Speak function - universal mobile + desktop router
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', audioFileUrl?: string) => {
      if (!text && !audioFileUrl) return;

      isCancelledRef.current = false;
      setSpeechError(null);

      // 1. If explicit audio file is provided (e.g. /audio/audio-1.mp3), play directly
      if (audioFileUrl) {
        playAudioFile(audioFileUrl, title, text);
        return;
      }

      const clean = cleanSpokenText(text);
      if (!clean) return;

      // 2. On Mobile (Xiaomi 11T, Android, iOS) or default voice:
      // Always stream real MP3 from /api/tts. This avoids silent/broken Web Speech API on MIUI.
      const shouldUseServerTts =
        isMobile ||
        selectedVoiceName === SERVER_VOICE_NAME ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        voices.find((v) => v.name === selectedVoiceName)?.isServerVoice;

      if (shouldUseServerTts) {
        const textSample = clean.length > 380 ? clean.slice(0, 380) + '...' : clean;
        const serverUrl = `/api/tts?text=${encodeURIComponent(textSample)}&format=mp3`;
        playAudioFile(serverUrl, title, clean);
        return;
      }

      // 3. Desktop user with specific local synth voice selected
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        } catch {
          // Ignore
        }
      }

      setCurrentPlaybackMode('speech-synthesis');
      setCurrentTitle(title);
      setCurrentText(clean);
      setIsLoading(false);
      setIsPlaying(true);
      setIsPaused(false);
      setPlaybackState('playing');
      setProgress(5);

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

  // Pause speech or audio
  const pauseSpeech = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);
    setIsLoading(false);
    setPlaybackState('paused');

    if (audioElementRef.current) {
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
  }, []);

  // Resume speech or audio
  const resumeSpeech = useCallback(() => {
    isCancelledRef.current = false;
    setSpeechError(null);

    if (audioElementRef.current && audioElementRef.current.src) {
      setIsLoading(true);
      const playPromise = audioElementRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
            setIsPaused(false);
            setPlaybackState('playing');
          })
          .catch((err) => {
            console.warn('resumeSpeech play error:', err);
            setIsLoading(false);
            setIsPaused(true);
            setPlaybackState('paused');
          });
      }
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
          setIsPaused(false);
          setPlaybackState('playing');
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
  }, [currentText, currentTitle, speak, speakChunk]);

  // Seek position in current audio track
  const seek = useCallback((seconds: number) => {
    if (audioElementRef.current && audioElementRef.current.duration) {
      const targetTime = Math.max(
        0,
        Math.min(seconds, audioElementRef.current.duration)
      );
      audioElementRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      setProgress(
        Math.round((targetTime / audioElementRef.current.duration) * 100)
      );
    }
  }, []);

  // Speed adjustments
  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;

      if (audioElementRef.current) {
        audioElementRef.current.playbackRate = newSpeed;
      }

      if (
        isPlaying &&
        !isPaused &&
        currentText &&
        currentPlaybackMode === 'speech-synthesis'
      ) {
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

  // Completely silenced bells & ambient sound
  const playSingingBowl = useCallback((_param?: number | unknown) => {}, []);
  const toggleAmbientSound = useCallback(() => {}, []);

  // Reliable voice test demonstrating audio playback
  const testVoice = useCallback(() => {
    playAudioFile(
      '/audio/demo-test.mp3',
      'Demostración de Voz del Narrador',
      'La Consciencia es todo lo que hay. Las cosas suceden y los acontecimientos tienen lugar, pero no hay un hacedor individual.'
    );
  }, [playAudioFile]);

  // Audio element event handlers
  const onNativePlaying = () => {
    setIsLoading(false);
    setIsPlaying(true);
    setIsPaused(false);
    setPlaybackState('playing');
  };

  const onNativePause = () => {
    if (playbackState !== 'loading' && playbackState !== 'idle') {
      setIsPlaying(false);
      setIsPaused(true);
      setPlaybackState('paused');
    }
  };

  const onNativeTimeUpdate = () => {
    const audio = audioElementRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
      setProgress(pct);
    }
  };

  const onNativeDurationChange = () => {
    const audio = audioElementRef.current;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const onNativeEnded = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setPlaybackState('idle');
    setProgress(100);
    setTimeout(() => {
      stopSpeech();
    }, 400);
  };

  const onNativeError = () => {
    const audio = audioElementRef.current;
    console.warn('Native HTMLAudioElement error event:', audio?.error);
    // Don't close immediately; allow user to tap retry
    setIsLoading(false);
    setPlaybackState('error');
    setSpeechError('No se pudo cargar el audio. Toca para reintentar.');
  };

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
        isLoading,
        playbackState,
        currentTitle,
        currentText,
        currentSentence,
        speed,
        progress,
        currentTime,
        duration,
        ambientSound,
        voices,
        selectedVoiceName,
        isMobile,
        speechError,
        clearSpeechError,
        speak,
        playAudioFile,
        pauseSpeech,
        resumeSpeech,
        stopSpeech,
        seek,
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
      {/* DOM-mounted audio element for persistent mobile audio lifecycle */}
      <audio
        ref={audioElementRef}
        playsInline
        preload="auto"
        onPlaying={onNativePlaying}
        onPause={onNativePause}
        onTimeUpdate={onNativeTimeUpdate}
        onDurationChange={onNativeDurationChange}
        onEnded={onNativeEnded}
        onError={onNativeError}
        className="hidden"
        style={{ display: 'none' }}
      />
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
