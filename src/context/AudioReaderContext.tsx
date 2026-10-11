import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  playNativeBellAudio,
  startNativeTanpuraDrone,
  stopNativeTanpuraDrone,
  setNativeTanpuraVolume,
} from '../utils/audioGenerator';

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

// Singleton Web Audio Context to avoid hitting browser limits (especially iOS limit of 3-4 contexts)
let sharedAudioCtx: AudioContext | null = null;

export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('AudioContext creation failed:', err);
    return null;
  }
};

// Silent base64 WAV sound to activate iOS / Mobile Safari playback category (switches from Ambient to Playback)
const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
let silentAudioTag: HTMLAudioElement | null = null;

export const activateMobileAudioSession = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudioTag) {
      silentAudioTag = new Audio(SILENT_WAV_BASE64);
      silentAudioTag.setAttribute('playsinline', 'true');
      silentAudioTag.setAttribute('webkit-playsinline', 'true');
      silentAudioTag.volume = 0.01;
    }
    silentAudioTag.play().catch(() => {});
  } catch {
    // Ignore autoplay or restriction errors
  }
};

export const unlockMobileAudio = () => {
  activateMobileAudioSession();
  const ctx = getSharedAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Ignore
    }
  }
};

// Resonant Tibetan Singing Bowl Chime (Dual pipeline: Native HTML5 Audio + Web Audio 432 Hz resonance)
export const playSingingBowlSound = (freq: number = 264) => {
  // 1. Play pristine native PCM WAV bell directly via HTML5 Audio (foolproof on Xiaomi 11T, iOS, Android, PC)
  try {
    playNativeBellAudio(0.95);
  } catch (e) {
    console.warn('Native bell failed:', e);
  }

  // 2. Also layer with Web Audio API synthesizer for rich acoustic resonance on devices supporting it
  try {
    unlockMobileAudio();
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const harmonics = [1, 2.76, 5.4, 8.1];
    const gains = [0.42, 0.22, 0.08, 0.03];

    harmonics.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[i], now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 4.0);
    });
  } catch (err) {
    console.warn('Singing bowl Web Audio error:', err);
  }
};

// Clean text for speech synthesis
function cleanSpokenText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[«»""'']/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const AudioReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [speed, setSpeedState] = useState<number>(1.0);
  const [progress, setProgress] = useState<number>(0);
  const [ambientSound, setAmbientSound] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isMobile] = useState<boolean>(checkIsMobile());
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('balsekar-voice')) || '';
  });
  const [speechError, setSpeechError] = useState<string | null>(null);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const tanpuraNodesRef = useRef<{ oscillators: OscillatorNode[]; gain: GainNode } | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Global mobile unlock listener on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockMobileAudio();
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
    window.addEventListener('touchend', handleFirstInteraction, { passive: true, once: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  // Singing bowl wrapper
  const playSingingBowl = useCallback((param?: number | unknown) => {
    const freq = typeof param === 'number' ? param : 264;
    playSingingBowlSound(freq);
  }, []);

  // Soothing Indian Tanpura Drone (Dual pipeline: Native HTML5 Audio + Web Audio)
  const toggleAmbientSound = useCallback(() => {
    try {
      unlockMobileAudio();
      const ctx = getSharedAudioContext();

      if (ambientSound) {
        stopNativeTanpuraDrone();
        if (tanpuraNodesRef.current && ctx) {
          const now = ctx.currentTime;
          tanpuraNodesRef.current.gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
          setTimeout(() => {
            if (tanpuraNodesRef.current) {
              tanpuraNodesRef.current.oscillators.forEach((osc) => {
                try {
                  osc.stop();
                  osc.disconnect();
                } catch {
                  // Ignore
                }
              });
              tanpuraNodesRef.current = null;
            }
          }, 700);
        }
        setAmbientSound(false);
      } else {
        // 1. Start native HTML5 drone (plays reliably on Xiaomi 11T / Android)
        startNativeTanpuraDrone(0.75);

        // 2. Also start Web Audio drone if context is available
        if (ctx) {
          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          masterGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.0);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(550, ctx.currentTime);

          const chords = [
            { freq: 216.0, vol: 0.35 },  // Sa fundamental (audible on phones)
            { freq: 324.0, vol: 0.25 },  // Pa fifth
            { freq: 432.0, vol: 0.18 },  // High Sa
            { freq: 648.0, vol: 0.08 },
          ];

          const oscillators: OscillatorNode[] = [];

          chords.forEach((c) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(c.freq, ctx.currentTime);
            g.gain.setValueAtTime(c.vol, ctx.currentTime);

            osc.connect(g);
            g.connect(filter);
            osc.start();
            oscillators.push(osc);
          });

          filter.connect(masterGain);
          masterGain.connect(ctx.destination);

          tanpuraNodesRef.current = { oscillators, gain: masterGain };
        }

        setAmbientSound(true);

        // Gentle starting chime
        playSingingBowlSound(264);
      }
    } catch (err) {
      console.warn('Ambient sound toggle error:', err);
      setAmbientSound(false);
    }
  }, [ambientSound]);

  // Load and refresh available voices
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
          const isSpanish = v.lang.toLowerCase().startsWith('es') || v.lang.toLowerCase().includes('es-');
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
        const spanish = list.find((v) => v.isSpanish);
        return spanish ? spanish.name : list[0]?.name || '';
      });

      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
      };
    }
  }, [refreshVoices]);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // Stop speech playback completely
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    currentUtteranceRef.current = null;
    if (typeof window !== 'undefined') {
      (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = null;
    }

    clearTimers();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }

    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentSentence('');
  }, [clearTimers]);

  // Main Speak function - Mobile hardened with zero delay & single utterance resilience
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', _audioFileUrl?: string) => {
      if (!text || typeof window === 'undefined') return;

      // Unlock mobile audio right on user gesture
      unlockMobileAudio();
      setSpeechError(null);

      isCancelledRef.current = false;
      isPausedRef.current = false;
      clearTimers();

      const clean = cleanSpokenText(text);
      if (!clean) return;

      // Play soft harmonic chime at start
      playSingingBowlSound(264);

      setCurrentTitle(title);
      setCurrentText(clean);
      setCurrentSentence(clean.slice(0, 120) + (clean.length > 120 ? '...' : ''));
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);

      if (!('speechSynthesis' in window)) {
        // Fallback for environments lacking Web Speech API
        console.warn('SpeechSynthesis not available in this browser.');
        return;
      }

      // Chromium/Android fix: Unpause if stuck and cancel safely
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }

      const executeSpeak = () => {
        if (isCancelledRef.current) return;

        try {
          const utterance = new SpeechSynthesisUtterance(clean);
          currentUtteranceRef.current = utterance;
          // Protect from aggressive mobile garbage collection
          (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = utterance;

          utterance.rate = speedRef.current;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'es-ES';

          // Voice selection: prioritize Spanish voices
          const currentVoices = voices.length > 0 ? voices : refreshVoices();
          let chosenVoice = currentVoices.find((v) => v.name === selectedVoiceName);

          if (!chosenVoice || !chosenVoice.isSpanish) {
            // Pick any verified Spanish voice
            chosenVoice = currentVoices.find((v) => v.isSpanish);
          }

          if (chosenVoice && chosenVoice.isSpanish) {
            utterance.voice = chosenVoice.voice;
            utterance.lang = chosenVoice.lang;
          }

          // Word/boundary tracking for real-time sentence highlight and progress
          utterance.onboundary = (event) => {
            if (isCancelledRef.current) return;
            const charIdx = event.charIndex || 0;
            const pct = Math.min(98, Math.max(5, Math.round((charIdx / clean.length) * 100)));
            setProgress(pct);

            const sliceStart = Math.max(0, clean.lastIndexOf('.', charIdx) + 1);
            const sliceEnd = clean.indexOf('.', charIdx + 1);
            const snippet = clean.slice(sliceStart, sliceEnd !== -1 ? sliceEnd + 1 : undefined).trim();
            if (snippet) {
              setCurrentSentence(snippet);
            }
          };

          utterance.onstart = () => {
            if (!isCancelledRef.current) {
              setIsPlaying(true);
              setIsPaused(false);
            }
          };

          utterance.onend = () => {
            if (isCancelledRef.current) return;
            setProgress(100);
            playSingingBowlSound(330);
            setTimeout(() => {
              stopSpeech();
            }, 600);
          };

          utterance.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') {
              return;
            }
            console.warn('SpeechSynthesis error:', e.error);
            setSpeechError(
              `El sintetizador de voz de tu dispositivo móvil no pudo emitir el audio (${e.error || 'fallo'}). Solución para Xiaomi/Android: Ve a Ajustes > Accesibilidad > Síntesis de voz y selecciona "Servicios de voz de Google" en español, y asegúrate de que el Volumen Multimedia (nota musical) no esté al mínimo.`
            );
            stopSpeech();
          };

          // On desktop Chrome only, run keepalive timer
          if (!checkIsMobile()) {
            keepAliveIntervalRef.current = window.setInterval(() => {
              if (
                'speechSynthesis' in window &&
                window.speechSynthesis.speaking &&
                !window.speechSynthesis.paused
              ) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
              }
            }, 5000);
          }

          // Progress estimate fallback in case onboundary is not supported by device
          const words = clean.split(' ').length;
          const estimatedDurationSeconds = Math.max(5, words / (2.5 * speedRef.current));
          let elapsed = 0;
          progressTimerRef.current = window.setInterval(() => {
            elapsed += 0.5;
            const calcPct = Math.min(95, Math.round((elapsed / estimatedDurationSeconds) * 100));
            setProgress((prev) => Math.max(prev, calcPct));
          }, 500);

          // Crucial: Must be synchronous within gesture for mobile Chrome / Xiaomi
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('window.speechSynthesis.speak error:', err);
        }
      };

      // Always execute synchronously within user gesture
      executeSpeak();
    },
    [voices, refreshVoices, selectedVoiceName, clearTimers, stopSpeech]
  );

  // Pause speech
  const pauseSpeech = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setIsPlaying(false);
    clearTimers();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
  }, [clearTimers]);

  // Resume speech
  const resumeSpeech = useCallback(() => {
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (currentText) {
          speak(currentText, currentTitle);
        }
      } catch {
        if (currentText) {
          speak(currentText, currentTitle);
        }
      }
    }
  }, [currentText, currentTitle, speak]);

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('balsekar-voice', name);
    }
  }, []);

  const testVoice = useCallback(() => {
    speak(
      'La Consciencia es todo lo que hay. Las cosas suceden y los acontecimientos tienen lugar, pero no hay un hacedor individual.',
      'Demostración de Audio y Voz'
    );
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (tanpuraNodesRef.current) {
        try {
          tanpuraNodesRef.current.oscillators.forEach((osc) => {
            osc.stop();
            osc.disconnect();
          });
        } catch {
          // Ignore
        }
        tanpuraNodesRef.current = null;
      }
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
