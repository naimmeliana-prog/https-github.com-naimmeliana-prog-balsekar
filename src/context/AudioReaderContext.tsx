import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceOption {
  id: string;
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isSpanish: boolean;
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
  speak: (text: string, title?: string, _audioFileUrl?: string) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  setSpeed: (speed: number) => void;
  setSelectedVoiceName: (voiceName: string) => void;
  toggleAmbientSound: () => void;
  playSingingBowl: (freqOrEvent?: number | unknown) => void;
  testVoice: () => void;
}

const AudioReaderContext = createContext<AudioReaderContextType | undefined>(undefined);

// Detect mobile environment
const checkIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Global pool of active utterances to prevent V8 mobile garbage collection mid-speech
const activeUtterancesPool: SpeechSynthesisUtterance[] = [];

/**
 * Backward compatible stubs without AudioContext or oscillators
 * Zero background buzzing, zero drones, zero bells
 */
export const getSharedAudioContext = (): null => null;
export const activateMobileAudioSession = (): void => {};
export const unlockMobileAudio = (): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // Ignore
    }
  }
};
export const playSingingBowlSound = (_freq: number = 264): void => {};

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
 * Split long text into natural, digestible sentence chunks (~80-160 chars).
 * Critical for Android Chrome / Xiaomi 11T: completely prevents the 15-second speech synthesis abort bug.
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

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Voice enumeration and refresh logic with multi-stage Android polling
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

      // Sort: Spanish voices first, then alphabetical
      list.sort((a, b) => {
        if (a.isSpanish && !b.isSpanish) return -1;
        if (!a.isSpanish && b.isSpanish) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(list);

      // On desktop, auto-select Spanish voice if none selected. On mobile, leave default unless user picked
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

  // Robust initialization of voices for Mobile Chromium / Xiaomi MIUI
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // 1. Initial wake-up call
    refreshVoices();

    // 2. Standard voiceschanged event listener
    const onVoices = () => {
      refreshVoices();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.speechSynthesis.onvoiceschanged = onVoices;

    // 3. Android polling fallback (staggered) because on Xiaomi MIUI
    // 'voiceschanged' fires asynchronously or after the first user gesture
    const pollDelays = [150, 450, 900, 1800, 3000];
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

  // Stop speech playback completely
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;

    // Clear active utterance pool
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
  }, []);

  // Internal function to speak an individual chunk with Xiaomi 11T / Android resilience
  const speakChunk = useCallback(
    (index: number) => {
      if (isCancelledRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      const chunks = chunksRef.current;
      if (!chunks || index >= chunks.length) {
        // All chunks finished!
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

      // Progress percentage
      const progressPct = Math.min(98, Math.max(5, Math.round(((index + 1) / chunks.length) * 100)));
      setProgress(progressPct);

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Keep active reference to prevent mobile V8 garbage collection mid-sentence
        activeUtterancesPool.push(utterance);
        (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = utterance;

        utterance.rate = Math.min(1.4, Math.max(0.7, speedRef.current));
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Determine best Spanish language tag
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        const detectedSpanish = currentVoices.find((v) => {
          const l = ('lang' in v ? v.lang : '').toLowerCase();
          return l.startsWith('es') || l.includes('es-');
        });

        // Set utterance language tag
        utterance.lang = detectedSpanish?.lang || 'es-ES';

        // Voice matching rules:
        // CRITICAL FOR XIAOMI 11T & ANDROID CHROME:
        // Assigning utterance.voice to a remote or non-local SpeechSynthesisVoice object
        // in Chromium on Android is the #1 cause of 'synthesis-failed'.
        // On mobile, leaving utterance.voice undefined and setting utterance.lang allows
        // the Android OS native TTS service (Google Speech Services / Xiaomi TTS) to speak
        // with 100% reliability directly through AudioManager.STREAM_MUSIC.
        const isMobileDevice = checkIsMobile();

        if (!isMobileDevice) {
          // Desktop PC (Windows 11 / Mac): assign voice object normally
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
          // Mobile, only if user explicitly picked a voice from dropdown
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
          }
        };

        utterance.onend = () => {
          // Remove from active pool
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);

          if (isCancelledRef.current) return;
          // Speak next chunk seamlessly
          speakChunk(index + 1);
        };

        utterance.onerror = (e) => {
          // Remove from active pool
          const idx = activeUtterancesPool.indexOf(utterance);
          if (idx !== -1) activeUtterancesPool.splice(idx, 1);

          if (e.error === 'interrupted' || e.error === 'canceled') {
            return;
          }
          console.warn('SpeechSynthesis error on chunk:', e.error);

          setSpeechError(
            `El sintetizador de voz de tu dispositivo móvil no pudo emitir sonido (${e.error || 'fallo'}). En tu Xiaomi 11T, pulsa los botones de volumen físico, toca los tres puntos (•••) y sube la barra de Multimedia 🎵 (nota musical).`
          );
          stopSpeech();
        };

        // Resume if suspended on Android
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis invocation error:', err);
      }
    },
    [voices, selectedVoiceName, userExplicitlyChoseVoice, stopSpeech]
  );

  // Main Speak function - Executed SYNCHRONOUSLY within trusted user gesture stack
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', _audioFileUrl?: string) => {
      if (!text || typeof window === 'undefined') return;

      setSpeechError(null);
      isCancelledRef.current = false;

      const clean = cleanSpokenText(text);
      if (!clean) return;

      setCurrentTitle(title);
      setCurrentText(clean);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);

      if (!('speechSynthesis' in window)) {
        setSpeechError('Tu navegador no es compatible con la síntesis de voz (Web Speech API).');
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

      // Cancel any ongoing speech immediately
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }

      // CRITICAL: Call speakChunk SYNCHRONOUSLY within the user gesture event turn.
      // Never use setTimeout here, otherwise mobile Chrome drops user gesture activation!
      speakChunk(0);
    },
    [speakChunk]
  );

  // Pause speech
  const pauseSpeech = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
  }, []);

  // Resume speech
  const resumeSpeech = useCallback(() => {
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);

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
  }, [currentText, currentTitle, speak, speakChunk]);

  // Speed adjustments
  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
      if (isPlaying && !isPaused && currentText) {
        speak(currentText, currentTitle);
      }
    },
    [isPlaying, isPaused, currentText, currentTitle, speak]
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
