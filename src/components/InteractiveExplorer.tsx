import React, { useState, useEffect, useRef } from 'react';
import { INQUIRY_SCENARIOS, SATSANG_DIALOGUES } from '../data/balsekarData';
import { InquiryScenario, SatsangDialogue } from '../types';
import { Compass, Volume2, VolumeX, Sparkles, HelpCircle, Eye, Play, Pause, RotateCcw } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';

export const InteractiveExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inquiry' | 'matrix' | 'satsang' | 'silence'>('inquiry');

  // Inquiry Tab State
  const [selectedScenario, setSelectedScenario] = useState<InquiryScenario>(INQUIRY_SCENARIOS[0]);

  // Satsang Tab State
  const [selectedDialogue, setSelectedDialogue] = useState<SatsangDialogue>(SATSANG_DIALOGUES[0]);

  // Silence Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [initialTime, setInitialTime] = useState<number>(60);
  const timerIntervalRef = useRef<number | null>(null);

  const { speak, stopSpeech, isPlaying, currentTitle } = useAudioReader();

  const handleListenScenario = (scenario: InquiryScenario) => {
    if (isPlaying && currentTitle === scenario.title) {
      stopSpeech();
      return;
    }
    const fullText = `Situación: ${scenario.title}. Dilema del ego: ${scenario.dilemma}. Respuesta de Ramesh Balsekar: ${scenario.balsekarPointer}. Mecanismo impersonal: ${scenario.mechanismExplanation}. Orientación práctica: ${scenario.actionGuidance}`;
    speak(fullText, scenario.title);
  };

  const handleListenDialogue = (dialogue: SatsangDialogue) => {
    if (isPlaying && currentTitle === `Satsang: ${dialogue.seekerQuestion}`) {
      stopSpeech();
      return;
    }
    const fullText = `Pregunta del buscador en Bombay: ${dialogue.seekerQuestion}. Respuesta de Ramesh Balsekar: ${dialogue.rameshAnswer}. Principio fundamental: ${dialogue.corePrinciple}`;
    speak(fullText, `Satsang: ${dialogue.seekerQuestion}`);
  };

  // Timer controls
  const startTimer = (secs?: number) => {
    const timeToRun = secs !== undefined ? secs : timerSeconds;
    if (secs !== undefined) {
      setInitialTime(secs);
      setTimerSeconds(secs);
    }
    setTimerRunning(true);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(initialTime);
  };

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <section id="explorador" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            04. Experiencia Interactiva
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Explorador Conceptual de la No-Dualidad
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Herramientas interactivas con diseño minimalista para examinar la mente cotidiana, poner a prueba dilemas emocionales y contemplar el principio del no-hacedor.
          </p>
        </div>

        {/* Tab Controls (Segmented Pill-Free Tabs) */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] mb-10 w-fit">
          <button
            onClick={() => setActiveTab('inquiry')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inquiry'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            01. Desmantelador de la Culpa
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            02. Dualidad vs. No-Dualidad
          </button>
          <button
            onClick={() => setActiveTab('satsang')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'satsang'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            03. Diálogos en Bombay (Q&A)
          </button>
          <button
            onClick={() => setActiveTab('silence')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'silence'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            04. Silencio & Presencia
          </button>
        </div>

        {/* TAB 1: Desmantelador de la Culpa y el Orgullo */}
        {activeTab === 'inquiry' && (
          <div className="space-y-8">
            {/* Scenario Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {INQUIRY_SCENARIOS.map((scen) => {
                const isSelected = selectedScenario.id === scen.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => setSelectedScenario(scen)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xs'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] block mb-1">
                      Situación
                    </span>
                    <h4 className={`font-serif text-sm font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {scen.title}
                    </h4>
                  </button>
                );
              })}
            </div>

            {/* Inquiry Interactive Stage */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-10 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    Inquirimiento No-Dual
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[var(--text-primary)] mt-1">
                    {selectedScenario.title}
                  </h3>
                </div>

                <button
                  onClick={() => handleListenScenario(selectedScenario)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar indagación en audio</span>
                </button>
              </div>

              {/* Dilemma presentation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
                {/* Ego Illusion box */}
                <div className="p-6 rounded-xl border border-red-200/40 bg-red-500/5">
                  <div className="text-xs uppercase tracking-wider font-semibold text-red-600 dark:text-red-400 mb-2 font-sans">
                    La Trampa del Ego («El Hacedor»)
                  </div>
                  <p className="font-serif italic text-base text-[var(--text-primary)] leading-relaxed">
                    «{selectedScenario.egoPerspective}»
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed">
                    {selectedScenario.dilemma}
                  </p>
                </div>

                {/* Balsekar pointer box */}
                <div className="p-6 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/20">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] mb-2 font-sans flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>El Señalamiento de Ramesh Balsekar</span>
                  </div>
                  <p className="font-serif text-base text-[var(--text-primary)] leading-relaxed font-medium">
                    {selectedScenario.balsekarPointer}
                  </p>
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <h5 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-primary)] mb-1 font-sans">
                    ¿Por qué no existía otra opción en la Consciencia? (Mecanismo impersonal)
                  </h5>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {selectedScenario.mechanismExplanation}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <h5 className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] mb-1 font-sans">
                    Orientación lúcida para la acción presente
                  </h5>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {selectedScenario.actionGuidance}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Dualidad vs. No-Dualidad Matrix */}
        {activeTab === 'matrix' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-10 shadow-xs">
            <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[var(--text-primary)] mb-2">
              El Cambio de Paradigma: De la Ilusión a la Realidad
            </h3>
            <p className="text-sm text-[var(--text-secondary)] font-sans mb-8">
              Contraste sistemático entre la percepción condicionada del ego (dual) y el discernimiento no-dual enseñado por Ramesh Balsekar.
            </p>

            <div className="divide-y divide-[var(--border-color)]">
              {[
                {
                  concept: 'La Autoría de las Acciones',
                  dual: '«Yo decido mis acciones y soy el autor responsable de mis éxitos y fracasos».',
                  nondual: 'Las acciones se ejecutan a través del organismo cuerpo-mente según genes y condicionamiento. Nadie hace nada.',
                  insight: 'El fin definitivo de la culpa y el orgullo.'
                },
                {
                  concept: 'El Libre Albedrío',
                  dual: '«Tengo la libertad absoluta e independiente de elegir cualquier pensamiento o deseo».',
                  nondual: 'Un pensamiento surge en el cerebro sin permiso previo. No puedes elegir el próximo pensamiento antes de que aparezca.',
                  insight: 'Humildad lúcida ante la maquinaria de la mente.'
                },
                {
                  concept: 'Relación con los Demás',
                  dual: '«Aquel me hizo daño deliberadamente; merece mi rencor, condena y castigo».',
                  nondual: 'El otro es un instrumento biológico actuando bajo su propia programación cósmica. Se ponen límites sin odio.',
                  insight: 'La raíz del perdón y la compasión impersonal.'
                },
                {
                  concept: 'El Sufrimiento y la Pérdida',
                  dual: '«¿Por qué a mí? Esto es una tragedia injusta que arruinó mi vida personal».',
                  nondual: 'El dolor pertenece al cuerpo; el sufrimiento es la resistencia mental del ego. La Totalidad no comete errores.',
                  insight: 'Aceptación incondicional de lo que Es.'
                },
                {
                  concept: 'La Búsqueda Espiritual',
                  dual: '«Practicaré arduamente hasta que mi ego consiga el trofeo de la iluminación».',
                  nondual: 'El buscador es lo buscado. La iluminación es la aniquilación del falso sentido de que hay un buscador independiente.',
                  insight: 'Cese del esfuerzo forzado y descanso en el Ser.'
                }
              ].map((row, rIdx) => (
                <div key={rIdx} className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-3">
                    <span className="text-[11px] font-mono text-[var(--accent)] block">0{rIdx + 1}.</span>
                    <h4 className="font-serif text-base font-semibold text-[var(--text-primary)]">
                      {row.concept}
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)] font-sans mt-1 block">
                      {row.insight}
                    </span>
                  </div>

                  <div className="md:col-span-4 p-4 rounded-xl border border-red-200/30 bg-red-500/5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400 block mb-1">
                      Percepción Dual (Egoica)
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] font-sans italic leading-relaxed">
                      {row.dual}
                    </p>
                  </div>

                  <div className="md:col-span-5 p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/20">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--accent)] block mb-1">
                      Visión No-Dual (Ramesh Balsekar)
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] font-sans font-medium leading-relaxed">
                      {row.nondual}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Diálogos en Bombay (Satsang Q&A) */}
        {activeTab === 'satsang' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SATSANG_DIALOGUES.map((dialogue) => {
                const isSelected = selectedDialogue.id === dialogue.id;
                return (
                  <button
                    key={dialogue.id}
                    onClick={() => setSelectedDialogue(dialogue)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xs'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Pregunta de Buscador
                    </span>
                    <h4 className={`font-serif text-sm font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {dialogue.seekerQuestion}
                    </h4>
                  </button>
                );
              })}
            </div>

            {/* Selected Dialogue Stage */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-10 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                    Diálogos Matutinos · Sindchula, Mumbai
                  </span>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
                    {selectedDialogue.seekerBackground}
                  </div>
                </div>

                <button
                  onClick={() => handleListenDialogue(selectedDialogue)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar diálogo en audio</span>
                </button>
              </div>

              {/* Seeker Question */}
              <div className="my-6 p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] block mb-2 font-sans">
                  El Buscador pregunta:
                </span>
                <p className="font-serif italic text-lg text-[var(--text-primary)] leading-snug">
                  «{selectedDialogue.seekerQuestion}»
                </p>
              </div>

              {/* Ramesh's Answer */}
              <div className="my-6 p-6 sm:p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] block mb-3 font-sans">
                  Ramesh Balsekar responde:
                </span>
                <p className="font-serif text-lg sm:text-xl text-[var(--text-primary)] leading-relaxed">
                  «{selectedDialogue.rameshAnswer}»
                </p>
              </div>

              {/* Core Principle Footer */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-xs text-[var(--text-muted)] font-sans">
                <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>Principio subyacente: {selectedDialogue.corePrinciple}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Espacio de Silencio & Presencia */}
        {activeTab === 'silence' && (
          <div className="max-w-2xl mx-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 sm:p-12 text-center shadow-xs">
            <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold font-sans">
              Contemplación Sin Hacedor
            </span>
            <h3 className="font-serif text-3xl font-medium text-[var(--text-primary)] mt-1 mb-3">
              Descansa en el Testigo Silencioso
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed max-w-lg mx-auto mb-8">
              No intentes controlar la mente ni forzar ningún estado espiritual. Simplemente observa los sonidos y pensamientos que surgen espontáneamente sin reclamarlos como propios.
            </p>

            {/* Timer Display */}
            <div className="my-8">
              <div className="font-mono text-5xl sm:text-6xl font-light text-[var(--text-primary)] tracking-widest tabular-nums">
                {formatTimer(timerSeconds)}
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-3">
                {timerRunning ? "Observando el presente en quietud..." : "Selecciona duración y pulsa iniciar"}
              </p>
            </div>

            {/* Duration Selectors */}
            {!timerRunning && (
              <div className="flex items-center justify-center gap-2 mb-8">
                {[
                  { label: '1 minuto', sec: 60 },
                  { label: '3 minutos', sec: 180 },
                  { label: '5 minutos', sec: 300 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    onClick={() => {
                      setInitialTime(item.sec);
                      setTimerSeconds(item.sec);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                      initialTime === item.sec
                        ? 'border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                        : 'border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              {!timerRunning ? (
                <button
                  onClick={() => startTimer()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  <span>Iniciar Silencio</span>
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar</span>
                </button>
              )}

              <button
                onClick={resetTimer}
                title="Reiniciar temporizador"
                className="p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Pointers footer */}
            <div className="mt-10 pt-6 border-t border-[var(--border-color)] font-serif italic text-xs text-[var(--text-muted)]">
              «El silencio no es la ausencia de sonido; es la ausencia del ego interfiriendo con lo que Es».
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
