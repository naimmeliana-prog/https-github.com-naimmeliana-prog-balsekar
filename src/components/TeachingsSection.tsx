import React, { useState } from 'react';
import { BALSEKAR_TEACHINGS } from '../data/balsekarData';
import { Teaching } from '../types';
import { Volume2, VolumeX, BookOpen, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';

export const TeachingsSection: React.FC = () => {
  const [selectedTeaching, setSelectedTeaching] = useState<Teaching>(BALSEKAR_TEACHINGS[0]);
  const { speak, stopSpeech, isPlaying, currentTitle } = useAudioReader();

  const handleListenTeaching = (teaching: Teaching) => {
    if (isPlaying && currentTitle === teaching.title) {
      stopSpeech();
      return;
    }
    const fullTextToRead = `${teaching.title}. ${teaching.subtitle}. ${teaching.summary}. ${teaching.content.join(' ')} Clave esencial: ${teaching.keyInsight}. Ejemplo práctico: ${teaching.practicalExample}`;
    speak(fullTextToRead, teaching.title);
  };

  const isCurrentAudioActive = isPlaying && currentTitle === selectedTeaching.title;

  return (
    <section id="ensenanzas" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            01. Fundamentos Filosóficos
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Las Enseñanzas Esenciales de la No-Dualidad
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Exploración exhaustiva y completa de los seis pilares que estructuran la visión advaita de Ramesh Balsekar. Cada enseñanza incluye análisis detallado, analogías cotidianas y reproducción en audio.
          </p>
        </div>

        {/* 2-Column Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Teaching Selection Rail (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-3">
              Seleccionar Principio
            </div>
            {BALSEKAR_TEACHINGS.map((teaching, idx) => {
              const isSelected = selectedTeaching.id === teaching.id;
              return (
                <button
                  key={teaching.id}
                  onClick={() => setSelectedTeaching(teaching)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-sm cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <h3 className={`font-serif text-base font-semibold leading-snug ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {teaching.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                      {teaching.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <ChevronRight className="w-4 h-4 text-[var(--accent)] shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Reader View (8 cols) */}
          <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-10 shadow-xs">
            {/* Header with Audio Play Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
                  Tratado Filosófico
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-medium text-[var(--text-primary)] mt-1">
                  {selectedTeaching.title}
                </h3>
                <p className="text-sm italic font-serif text-[var(--text-secondary)] mt-1">
                  {selectedTeaching.subtitle}
                </p>
              </div>

              {/* Dedicated Audio Listen Button */}
              <button
                onClick={() => handleListenTeaching(selectedTeaching)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all shrink-0 cursor-pointer ${
                  isCurrentAudioActive
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
                title={isCurrentAudioActive ? "Detener reproducción en audio" : "Reproducir este texto en formato de audio"}
              >
                {isCurrentAudioActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isCurrentAudioActive ? 'Pausar audio' : 'Reproducir texto en audio'}</span>
              </button>
            </div>

            {/* Teaching Abstract / Summary */}
            <div className="my-6 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-sans">
              <span className="font-semibold text-[var(--text-primary)]">Tesis Central: </span>
              {selectedTeaching.summary}
            </div>

            {/* Core Long-form Prose */}
            <div className="space-y-4 my-8 font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {selectedTeaching.content.map((paragraph, pIdx) => (
                <p key={pIdx} className={pIdx === 0 ? "first-letter:text-4xl first-letter:font-serif first-letter:font-semibold first-letter:mr-2 first-letter:float-left first-letter:text-[var(--accent)]" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Key Insight Block */}
            <div className="my-8 p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[var(--accent)] mb-2 font-sans">
                <Sparkles className="w-4 h-4" />
                <span>Puntero Esencial (Key Pointer)</span>
              </div>
              <p className="font-serif italic text-lg sm:text-xl text-[var(--text-primary)] leading-snug">
                «{selectedTeaching.keyInsight}»
              </p>
            </div>

            {/* Practical Example in Everyday Life */}
            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2 font-sans">
                Analogía Práctica para la Vida Diaria
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedTeaching.practicalExample}
              </p>
            </div>

            {/* Book Reference Quote */}
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-sans">
              <span>Cita de Balsekar: «{selectedTeaching.quote}»</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
