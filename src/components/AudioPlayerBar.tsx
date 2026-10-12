import React, { useState } from 'react';
import { useAudioReader } from '../context/AudioReaderContext';
import {
  Play,
  Pause,
  Square,
  Volume2,
  X,
  Settings2,
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const AudioPlayerBar: React.FC = () => {
  const {
    isPlaying,
    isPaused,
    isLoading,
    playbackState,
    currentTitle,
    currentSentence,
    speed,
    progress,
    currentTime,
    duration,
    voices,
    selectedVoiceName,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    seek,
    setSpeed,
    setSelectedVoiceName,
    testVoice,
    speechError,
  } = useAudioReader();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Keep bar open if playing, paused, loading, or showing an error
  const isVisible = isPlaying || isPaused || isLoading || playbackState === 'error';
  if (!isVisible) {
    return null;
  }

  const speedOptions = [0.8, 1.0, 1.2, 1.5];
  const spanishVoices = voices.filter((v) => v.isSpanish);
  const displayVoices = spanishVoices.length > 0 ? spanishVoices : voices;

  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    seek(pct * duration);
  };

  return (
    <aside
      aria-label="Reproductor de audio y narración"
      className="fixed bottom-0 inset-x-0 z-50 p-2 sm:p-4 transition-all"
    >
      <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-3 sm:p-4 backdrop-blur-md">
        {/* Interactive Progress Bar */}
        <div
          role="slider"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onClick={handleProgressBarClick}
          className="w-full bg-[var(--border-color)] h-2 rounded-full mb-3 overflow-hidden cursor-pointer relative group"
          title="Toca para adelantar o retroceder"
        >
          <div
            className={`h-full transition-all duration-200 ${
              isLoading
                ? 'bg-[var(--accent)] opacity-60 animate-pulse'
                : 'bg-[var(--accent)]'
            }`}
            style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Track and Active Sentence Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-2xs">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--accent)] font-sans">
                  {isLoading
                    ? 'Preparando audio...'
                    : isPlaying
                    ? 'Reproduciendo audio'
                    : isPaused
                    ? 'Pausado'
                    : 'Audio'}
                </span>
                {duration > 0 ? (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {formatSeconds(currentTime)} / {formatSeconds(duration)}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {progress}%
                  </span>
                )}
              </div>

              <h4 className="font-serif text-sm font-semibold text-[var(--text-primary)] truncate">
                {currentTitle || 'Lectura de Enseñanza'}
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

            {/* Play/Pause Button */}
            {isPlaying ? (
              <button
                type="button"
                onClick={pauseSpeech}
                title="Pausar reproducción"
                className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeSpeech}
                title="Reproducir"
                className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center min-w-10 min-h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            )}

            {/* Stop Button */}
            <button
              type="button"
              onClick={stopSpeech}
              title="Detener y cerrar"
              className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-300 transition-all cursor-pointer active:scale-95"
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

            {/* Close Button */}
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

        {/* Notice / Retry if playback error occurred */}
        {speechError && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{speechError}</span>
            </div>
            <button
              type="button"
              onClick={resumeSpeech}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tocar para reproducir</span>
            </button>
          </div>
        )}

        {/* Voice Selection Drawer */}
        {settingsOpen && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[var(--text-secondary)] font-medium shrink-0">
                Voz:
              </span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-hidden focus:border-[var(--accent)]"
              >
                {displayVoices.length > 0 ? (
                  displayVoices.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.lang}) {v.isSpanish ? '✓ Español' : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Voz predeterminada del sistema</option>
                )}
              </select>
            </div>

            {/* Quick test voice button */}
            <button
              type="button"
              onClick={testVoice}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Probar voz</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
