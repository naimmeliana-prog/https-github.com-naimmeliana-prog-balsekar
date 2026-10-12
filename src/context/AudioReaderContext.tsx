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
  // Mobile compatibility stubs
  debugLogs: DebugLogEntry[];
  addDebugLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void;
  clearDebugLogs: () => void;
  isAutoPlayUnlocked: boolean;
  supportedMimes: Record<string, string>;
  currentPlaybackMode: 'audio-file' | 'speech-synthesis' | 'idle';
  unlockAudioManually: () => Promise<boolean>;
}

const AudioReaderContext = createContext<AudioReaderContextType | undefined>(undefined);

// Detect mobile environment
const checkIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
};

// Global pool of active utterances to prevent V8 garbage collection on mobile
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
 * Split long text into natural sentence chunks (~80-140 chars).
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
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isMobile] = useState<boolean>(checkIsMobile());
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('balsekar-voice')) || '';
  });
  const [userExplicitlyChoseVoice, setUserExplicitlyChoseVoice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('balsekar-voice'));
  });
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Debug & Audio Playback mode
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isAutoPlayUnlocked, setIsAutoPlayUnlocked] = useState<boolean>(false);
  const [currentPlaybackMode, setCurrentPlaybackMode] = useState<'audio-file' | 'speech-synthesis' | 'idle'>('idle');

  // Unified HTML5 Audio element
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Utterance tracking refs
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

  // Helper to get or create HTMLAudioElement
  const getAudioElement = useCallback((): HTMLAudioElement => {
    if (!audioElementRef.current && typeof Audio !== 'undefined') {
      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
      audioElementRef.current = audio;
    }
    return audioElementRef.current as HTMLAudioElement;
  }, []);

  // Unlock audio hardware on mobile user gesture
  const unlockAudioManually = useCallback(async (): Promise<boolean> => {
    try {
      const audio = getAudioElement();
      if (audio && !audio.src) {
        audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        audio.volume = 0.01;
        const p = audio.play();
        if (p !== undefined) {
          await p;
          audio.pause();
          audio.currentTime = 0;
        }
      }
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
  }, [getAudioElement]);

  // Global listener for first user touch/click to unlock audio element
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    try {
      const raw = window.speechSynthesis.getVoices();
      if (!raw || raw.length === 0) return [];

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

      list.sort((a, b) => {
        if (a.isSpanish && !b.isSpanish) return -1;
        if (!a.isSpanish && b.isSpanish) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(list);

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
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    refreshVoices();

    const onVoices = () => {
      refreshVoices();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.onvoiceschanged = onVoices;

    const timers = [200, 600, 1500].map((delay) =>
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
        utterance.lang = 'es-ES';

        const isMobileDevice = checkIsMobile();

        // On desktop, assign selected voice.
        // On mobile, only assign voice if user explicitly picked it in the dropdown;
        // otherwise, leave utterance.voice unset so mobile OS (Google Speech / MIUI) handles Spanish reliably.
        if (!isMobileDevice) {
          const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
          let chosenVoice = currentVoices.find((v) => ('name' in v ? v.name : '') === selectedVoiceName);
          if (!chosenVoice) {
            chosenVoice = currentVoices.find((v) => {
              const l = ('lang' in v ? v.lang : '').toLowerCase();
              return l.startsWith('es') || l.includes('es-');
            });
          }
          if (chosenVoice) {
            const voiceObj = 'voice' in chosenVoice ? (chosenVoice as VoiceOption).voice : (chosenVoice as SpeechSynthesisVoice);
            if (voiceObj) utterance.voice = voiceObj;
          }
        } else if (userExplicitlyChoseVoice && selectedVoiceName) {
          const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
          const chosenVoice = currentVoices.find((v) => ('name' in v ? v.name : '') === selectedVoiceName);
          if (chosenVoice) {
            const voiceObj = 'voice' in chosenVoice ? (chosenVoice as VoiceOption).voice : (chosenVoice as SpeechSynthesisVoice);
            if (voiceObj) utterance.voice = voiceObj;
          }
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

          // Move to next chunk smoothly without throwing intrusive UI errors
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
    [voices, selectedVoiceName, userExplicitlyChoseVoice, stopSpeech]
  );

  // Play an Audio File synchronously using HTMLAudioElement
  const playAudioFile = useCallback(
    (url: string, title: string, textFallback: string) => {
      try {
        const audio = getAudioElement();
        isCancelledRef.current = false;

        // Stop any Web Speech API currently running
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
          } catch {
            // Ignore
          }
        }

        setCurrentPlaybackMode('audio-file');
        setCurrentTitle(title);
        setCurrentSentence('');
        setIsPlaying(true);
        setIsPaused(false);
        setProgress(5);

        audio.src = url;
        audio.playbackRate = speedRef.current;
        audio.volume = 1.0;

        audio.onplaying = () => {
          setIsPlaying(true);
          setIsPaused(false);
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            const pct = Math.round((audio.currentTime / audio.duration) * 100);
            setProgress(pct);
          }
        };

        audio.onended = () => {
          stopSpeech();
        };

        audio.onerror = () => {
          // If file fails, seamlessly fallback to Web Speech API
          const clean = cleanSpokenText(textFallback);
          if (!clean) {
            stopSpeech();
            return;
          }
          chunksRef.current = splitIntoChunks(clean);
          currentChunkIndexRef.current = 0;
          setCurrentPlaybackMode('speech-synthesis');
          speakChunk(0);
        };

        // Synchronous play initiation inside the user gesture
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Fallback to Web Speech API if play blocked
            const clean = cleanSpokenText(textFallback);
            if (!clean) {
              stopSpeech();
              return;
            }
            chunksRef.current = splitIntoChunks(clean);
            currentChunkIndexRef.current = 0;
            setCurrentPlaybackMode('speech-synthesis');
            speakChunk(0);
          });
        }
      } catch {
        // Fallback to Web Speech API
        const clean = cleanSpokenText(textFallback);
        if (clean) {
          chunksRef.current = splitIntoChunks(clean);
          currentChunkIndexRef.current = 0;
          setCurrentPlaybackMode('speech-synthesis');
          speakChunk(0);
        }
      }
    },
    [getAudioElement, speakChunk, stopSpeech]
  );

  // Main Speak function - Executed SYNCHRONOUSLY within the user gesture
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', audioFileUrl?: string) => {
      if (!text && !audioFileUrl) return;

      isCancelledRef.current = false;
      setSpeechError(null);

      // If an audio file URL is supplied, play it immediately via HTMLAudioElement
      if (audioFileUrl) {
        playAudioFile(audioFileUrl, title, text);
        return;
      }

      // Web Speech API for reading text
      const clean = cleanSpokenText(text);
      if (!clean) return;

      // Stop any existing audio element
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        } catch {
          // Ignore
        }
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsPlaying(false);
        return;
      }

      setCurrentTitle(title);
      setCurrentText(clean);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);
      setCurrentPlaybackMode('speech-synthesis');

      // Android/Chromium: ensure synthesis is unpaused
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

      // Speak first chunk synchronously within user gesture
      speakChunk(0);
    },
    [playAudioFile, speakChunk]
  );

  // Android Chrome keep-alive timer while speaking to prevent 15-second background freeze
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

  // Direct, quick narration demonstration using reliable audio file
  const testVoice = useCallback(() => {
    speak(
      'La Consciencia es todo lo que hay. Las cosas suceden y los acontecimientos tienen lugar, pero no hay un hacedor individual.',
      'Demostración de Voz del Narrador',
      '/audio/demo-test.wav'
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
        // Compatibility stubs
        debugLogs,
        addDebugLog: addLog,
        clearDebugLogs,
        isAutoPlayUnlocked,
        supportedMimes: { 'audio/wav': 'probable', 'audio/mpeg': 'probable' },
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
