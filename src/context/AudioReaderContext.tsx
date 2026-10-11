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

// Split text into concise, natural spoken sentences
function splitIntoSentences(rawText: string): string[] {
  if (!rawText) return [];
  const clean = rawText
    .replace(/[«»""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split on sentence terminators (. ! ? ; or newline)
  const rawParts = clean.split(/(?<=[.!?;\n])\s+/);
  const sentences: string[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // If a sentence is very long (> 180 chars), split by comma or colon for smooth speech
    if (trimmed.length > 180) {
      const subParts = trimmed.split(/(?<=[,:\u2014])\s+/);
      let buffer = '';
      for (const sp of subParts) {
        if ((buffer + ' ' + sp).length > 180 && buffer) {
          sentences.push(buffer.trim());
          buffer = sp;
        } else {
          buffer = buffer ? `${buffer} ${sp}` : sp;
        }
      }
      if (buffer.trim()) {
        sentences.push(buffer.trim());
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.length > 0 ? sentences : [clean];
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
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem('balsekar-voice') || '';
  });

  // Internal refs to keep accurate state across closures
  const speedRef = useRef<number>(1.0);
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceIdxRef = useRef<number>(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  // Web Audio Context & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tanpuraNodesRef = useRef<{ oscillators: OscillatorNode[]; gain: GainNode } | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // AudioContext helper with auto-resume on user action
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Clear Chrome keepalive timer
  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Start Chrome keepalive timer to prevent speech engine freezing on long utterances
  const startKeepAlive = useCallback(() => {
    stopKeepAlive();
    keepAliveIntervalRef.current = window.setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4000);
  }, [stopKeepAlive]);

  // Resonant Tibetan Singing Bowl
  const playSingingBowl = useCallback(
    (param?: number | unknown) => {
      const fundamental = typeof param === 'number' ? param : 264;
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const harmonics = [1, 2.76, 5.4, 8.1];
        const gains = [0.4, 0.22, 0.09, 0.03];

        harmonics.forEach((mult, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(fundamental * mult, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(gains[i], now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 4.0);
        });
      } catch (err) {
        console.warn('Tibetan bowl audio error:', err);
      }
    },
    [getAudioContext]
  );

  // Soothing Indian Tanpura Drone (136.1 Hz Om fundamental + fifth + octave)
  const toggleAmbientSound = useCallback(() => {
    try {
      const ctx = getAudioContext();

      if (ambientSound) {
        if (tanpuraNodesRef.current) {
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
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.0);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        const chords = [
          { freq: 136.1, vol: 0.35 },
          { freq: 204.15, vol: 0.2 },
          { freq: 272.2, vol: 0.15 },
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
        setAmbientSound(true);
      }
    } catch (err) {
      console.warn('Ambient sound toggle error:', err);
      setAmbientSound(false);
    }
  }, [ambientSound, getAudioContext]);

  // Load and refresh available system voices
  const refreshVoices = useCallback((): VoiceOption[] => {
    if (!('speechSynthesis' in window)) return [];
    try {
      const raw = window.speechSynthesis.getVoices();
      if (!raw || raw.length === 0) return [];

      const seen = new Set<string>();
      const list: VoiceOption[] = [];

      raw.forEach((v, idx) => {
        const signature = `${v.name}|${v.lang}|${v.voiceURI || idx}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          list.push({
            id: `v-${idx}-${v.name.replace(/[^a-zA-Z0-9]/g, '_')}-${v.lang}`,
            voice: v,
            name: v.name,
            lang: v.lang,
            isSpanish: v.lang.toLowerCase().startsWith('es'),
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
    if ('speechSynthesis' in window) {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
      };
    }
  }, [refreshVoices]);

  // Stop speech playback completely
  const stopSpeech = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    currentUtteranceRef.current = null;
    (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = null;

    stopKeepAlive();

    if ('speechSynthesis' in window) {
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
  }, [stopKeepAlive]);

  // Play next sentence in queue
  const playSentenceAtIndex = useCallback(
    (index: number) => {
      if (isCancelledRef.current || isPausedRef.current) return;
      if (!('speechSynthesis' in window)) return;

      const sentences = sentencesRef.current;
      if (index >= sentences.length) {
        // Queue completed! Play gentle concluding chime
        playSingingBowl(330);
        stopSpeech();
        return;
      }

      currentSentenceIdxRef.current = index;
      const sentenceText = sentences[index];
      setCurrentSentence(sentenceText);

      const pct = Math.round(((index + 1) / sentences.length) * 100);
      setProgress(pct);

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      currentUtteranceRef.current = utterance;
      // Shield against Chromium GC bug
      (window as unknown as { __activeUtterance?: unknown }).__activeUtterance = utterance;

      utterance.rate = speedRef.current;
      utterance.lang = 'es-ES';

      // Pick preferred voice
      const currentVoices = voices.length > 0 ? voices : refreshVoices();
      let chosenVoice = currentVoices.find((v) => v.name === selectedVoiceName);
      if (!chosenVoice) {
        chosenVoice = currentVoices.find((v) => v.isSpanish) || currentVoices[0];
      }
      if (chosenVoice) {
        utterance.voice = chosenVoice.voice;
      }

      utterance.onstart = () => {
        if (!isCancelledRef.current && !isPausedRef.current) {
          setIsPlaying(true);
          setIsPaused(false);
        }
      };

      utterance.onend = () => {
        if (isCancelledRef.current || isPausedRef.current) return;
        // Proceed to next sentence
        playSentenceAtIndex(index + 1);
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
          return;
        }
        console.warn('SpeechSynthesis error:', e.error);
        if (!isCancelledRef.current && !isPausedRef.current) {
          // Attempt next sentence rather than halting entire queue
          playSentenceAtIndex(index + 1);
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('window.speechSynthesis.speak error:', err);
      }
    },
    [voices, refreshVoices, selectedVoiceName, playSingingBowl, stopSpeech]
  );

  // Main Speak function: Synchronous, instant, zero-delay speech playback!
  const speak = useCallback(
    (text: string, title: string = 'Lectura de Enseñanza', _audioFileUrl?: string) => {
      if (!text) return;

      // 1. Cancel previous speech immediately
      isCancelledRef.current = false;
      isPausedRef.current = false;
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }

      // 2. Play acoustic bell
      playSingingBowl(264);

      // 3. Prepare sentence queue
      const sentences = splitIntoSentences(text);
      sentencesRef.current = sentences;
      currentSentenceIdxRef.current = 0;

      setCurrentTitle(title);
      setCurrentText(text);
      setCurrentSentence(sentences[0] || text);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(5);

      // 4. Start keepalive timer
      startKeepAlive();

      // 5. Speak first sentence immediately within user gesture tick!
      playSentenceAtIndex(0);
    },
    [playSingingBowl, startKeepAlive, playSentenceAtIndex]
  );

  // Pause speech
  const pauseSpeech = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setIsPlaying(false);
    stopKeepAlive();

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
  }, [stopKeepAlive]);

  // Resume speech
  const resumeSpeech = useCallback(() => {
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);
    startKeepAlive();

    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          // Re-trigger current sentence if paused stalled
          playSentenceAtIndex(currentSentenceIdxRef.current);
        }
      } catch {
        playSentenceAtIndex(currentSentenceIdxRef.current);
      }
    }
  }, [startKeepAlive, playSentenceAtIndex]);

  // Speed adjustments
  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
      // If currently playing, restart current sentence with new rate
      if (isPlaying && !isPaused && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          playSentenceAtIndex(currentSentenceIdxRef.current);
        } catch {
          // Ignore
        }
      }
    },
    [isPlaying, isPaused, playSentenceAtIndex]
  );

  const handleSetVoice = useCallback((name: string) => {
    setSelectedVoiceName(name);
    localStorage.setItem('balsekar-voice', name);
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
