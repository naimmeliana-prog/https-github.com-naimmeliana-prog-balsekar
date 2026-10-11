import React, { useState } from 'react';
import { useAudioReader } from '../context/AudioReaderContext';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  X,
  Settings2,
  Sparkles,
  HelpCircle,
  Terminal,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Laptop,
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
    isMobile,
    speechError,
    clearSpeechError,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    setSpeed,
    setSelectedVoiceName,
    testVoice,
    // Debug & MIME capabilities
    debugLogs,
    clearDebugLogs,
    isAutoPlayUnlocked,
    supportedMimes,
    currentPlaybackMode,
    unlockAudioManually,
  } = useAudioReader();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMobileHelp, setShowMobileHelp] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const handleCopyLogs = () => {
    if (debugLogs.length === 0) return;
    const text = debugLogs.map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  if (!isPlaying && !isPaused && !speechError && !showDiagnostics) {
    return null;
  }

  // If there is an active error and player stopped, show friendly helper card with quick diagnosis button
  if (speechError && !isPlaying && !isPaused && !showDiagnostics) {
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
                    🔧 Pasos para activar el sonido en tu Xiaomi 11T:
                  </p>
                  <p>
                    1. <strong>Volumen Multimedia:</strong> Pulsa el botón de volumen físico lateral, toca los <strong>tres puntos (•••)</strong> y sube el deslizador de la <strong>nota musical 🎵 (Multimedia)</strong>.
                  </p>
                  <p>
                    2. <strong>Motor de Voz Google:</strong> Ajustes → Accesibilidad → Visión → Síntesis de voz: selecciona <strong>«Servicios de voz de Google»</strong> en idioma Español.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      clearSpeechError();
                      testVoice();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium cursor-pointer hover:opacity-90 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Probar voz de nuevo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(true)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs cursor-pointer hover:text-[var(--text-primary)] flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Ver Diagnóstico Técnico
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
                  {isPlaying ? 'Reproduciendo audio' : 'Pausado'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {progress}%
                </span>
                {currentPlaybackMode !== 'idle' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    {currentPlaybackMode === 'audio-file' ? '📁 Archivo' : '🗣️ Sintetizador'}
                  </span>
                )}
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

            {/* Diagnostics Console Toggle */}
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              title="Diagnóstico técnico de audio móvil"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                showDiagnostics
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
              }`}
            >
              <Terminal className="w-4 h-4" />
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

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setShowDiagnostics(false);
              }}
              title="Cerrar reproductor"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostics & Logs Drawer */}
        {showDiagnostics && (
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h5 className="font-semibold text-xs text-[var(--text-primary)]">
                  Diagnóstico y Registro de Audio Móvil
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={unlockAudioManually}
                  className="px-2.5 py-1 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Desbloquear Auto-Play</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 rounded-lg text-xs border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copiar registro de depuración al portapapeles"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLogs ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={clearDebugLogs}
                  className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                  title="Limpiar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Diagnostic Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center gap-2">
                {isMobile ? <Smartphone className="w-4 h-4 text-amber-500 shrink-0" /> : <Laptop className="w-4 h-4 text-blue-500 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Dispositivo</div>
                  <div className="font-semibold text-[var(--text-primary)] truncate">
                    {isMobile ? 'Móvil (Android/Xiaomi)' : 'Escritorio (PC)'}
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center gap-2">
                {isAutoPlayUnlocked ? <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Auto-Play</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {isAutoPlayUnlocked ? 'Desbloqueado' : 'Pendiente toque'}
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">MIME audio/wav</div>
                  <div className="font-semibold text-[var(--text-primary)] truncate">
                    {supportedMimes['audio/wav'] || 'Verificando'}
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Voces TTS</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {voices.length} detectadas
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Log Console Window */}
            <div className="p-2.5 rounded-xl bg-stone-950 text-stone-200 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 border border-stone-800">
              {debugLogs.length === 0 ? (
                <div className="text-stone-500 italic py-2 text-center">No hay registros aún. Pulsa reproducir o probar voz para ver el flujo.</div>
              ) : (
                debugLogs.map((log) => (
                  <div key={log.id} className="leading-snug break-words flex items-start gap-1.5">
                    <span className="text-stone-500 shrink-0">[{log.time}]</span>
                    <span
                      className={`shrink-0 font-bold ${
                        log.level === 'error'
                          ? 'text-red-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : log.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-sky-400'
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-stone-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
            <p>1. Pulsa los botones de volumen del teléfono y pulsa los tres puntos (•••) para subir el volumen con el icono de la <strong>nota musical 🎵 (Multimedia)</strong>.</p>
            <p>2. En Ajustes del Xiaomi → Accesibilidad → Visión → Síntesis de voz: cambia el motor a <strong>Servicios de voz de Google</strong>.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
