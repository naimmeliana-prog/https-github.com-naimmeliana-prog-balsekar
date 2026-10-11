import React, { useState } from 'react';
import { useAudioReader } from '../context/AudioReaderContext';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Bell,
  X,
  Settings2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const AudioPlayerBar: React.FC = () => {
  const {
    isPlaying,
    isPaused,
    currentTitle,
    currentSentence,
    speed,
    progress,
    voices,
    selectedVoiceName,
    speechError,
    clearSpeechError,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    setSpeed,
    setSelectedVoiceName,
    playSingingBowl,
    testVoice,
  } = useAudioReader();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMobileHelp, setShowMobileHelp] = useState(false);

  if (!isPlaying && !isPaused && !speechError) {
    return null;
  }

  // If there is an active error and player stopped, show friendly helper card
  if (speechError && !isPlaying && !isPaused) {
    return (
      <aside
        aria-label="Aviso de audio en dispositivo móvil"
        className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 transition-all"
      >
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/90 shadow-2xl p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <VolumeX className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-sans font-bold text-sm text-[var(--text-primary)]">
                  Configuración de Audio en Xiaomi / Android
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {speechError}
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1.5">
                  <p className="font-semibold text-[var(--text-primary)]">
                    🔧 Pasos rápidos para activar el sonido en tu Xiaomi 11T:
                  </p>
                  <p>
                    1. <strong>Volumen Multimedia:</strong> Pulsa el botón de volumen físico lateral de tu Xiaomi, toca los <strong>tres puntos (...)</strong> y sube el deslizador de la <strong>nota musical 🎵</strong> (en Xiaomi, los botones solo tocan el timbre por defecto).
                  </p>
                  <p>
                    2. <strong>Motor de Voz Google:</strong> Ve a <em>Ajustes de tu teléfono → Ajustes adicionales → Accesibilidad → Visión → Salida de síntesis de voz</em> y selecciona <strong>«Servicios de voz de Google»</strong> en idioma Español.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      clearSpeechError();
                      playSingingBowl(264);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium cursor-pointer hover:opacity-90 flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Probar Campana Sonora
                  </button>
                  <button
                    type="button"
                    onClick={clearSpeechError}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs cursor-pointer hover:text-[var(--text-primary)]"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSpeechError}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const speedOptions = [0.8, 1.0, 1.2, 1.5];

  return (
    <aside
      aria-label="Reproductor de audio y narración"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 transition-all"
    >
      <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-3 sm:p-4 backdrop-blur-md">
        {/* Progress Bar */}
        <div className="w-full bg-[var(--border-color)] h-1.5 rounded-full mb-3 overflow-hidden">
          <div
            className="bg-[var(--accent)] h-full transition-all duration-300"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Track and Active Sentence Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-2xs">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--accent)] font-sans">
                  {isPlaying ? 'Reproduciendo texto en audio' : 'Pausado'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {progress}%
                </span>
              </div>
              <h4 className="font-serif text-sm font-semibold text-[var(--text-primary)] truncate">
                {currentTitle || 'Lectura de Texto'}
              </h4>
              {currentSentence && (
                <p className="text-xs text-[var(--text-secondary)] font-sans italic truncate max-w-lg mt-0.5">
                  «{currentSentence}»
                </p>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 border border-[var(--border-color)] rounded-lg p-0.5 bg-[var(--bg-surface)] text-[11px] font-mono">
              {speedOptions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    speed === s
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            {isPaused ? (
              <button
                type="button"
                onClick={resumeSpeech}
                title="Reanudar narración"
                className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseSpeech}
                title="Pausar narración"
                className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            )}

            {/* Stop */}
            <button
              type="button"
              onClick={stopSpeech}
              title="Detener lectura"
              className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-300 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Settings Toggle */}
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Ajustes de voz"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                settingsOpen
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
              }`}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Bell Chime */}
            <button
              type="button"
              onClick={playSingingBowl}
              title="Tocar campana tibetana"
              className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={stopSpeech}
              title="Cerrar reproductor"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel Drawer */}
        {settingsOpen && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Voice Dropdown if Voices are available */}
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium text-[var(--text-secondary)] whitespace-nowrap">
                Voz del sistema:
              </span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full sm:max-w-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] text-xs"
              >
                {voices.length > 0 ? (
                  voices.map((v, idx) => (
                    <option key={`voice-opt-${v.id || idx}-${idx}`} value={v.name}>
                      {v.isSpanish ? '🇪🇸 ' : '🌐 '}
                      {v.name} ({v.lang})
                    </option>
                  ))
                ) : (
                  <option value="">Voz predeterminada del navegador</option>
                )}
              </select>
            </div>

            {/* Quick test button & Mobile Help */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={testVoice}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Probar voz</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMobileHelp(!showMobileHelp)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1"
                title="Ayuda para móviles Xiaomi y Android"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Móvil</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Help info popup if toggled */}
        {settingsOpen && showMobileHelp && (
          <div className="mt-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">📱 ¿No se oye en tu móvil Xiaomi o Android?</p>
            <p>1. Pulsa los botones de volumen del teléfono y pulsa los tres puntos (...) para subir el volumen con el icono de la <strong>nota musical 🎵 (Multimedia)</strong>.</p>
            <p>2. En Ajustes del Xiaomi → Accesibilidad → Visión → Síntesis de voz: cambia el motor a <strong>Servicios de voz de Google</strong>.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
