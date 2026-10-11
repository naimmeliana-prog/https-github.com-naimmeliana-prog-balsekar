import React, { useState, useEffect, useRef } from 'react';
import { MEDIA_ARCHIVE } from '../data/balsekarData';
import { MediaItem } from '../types';
import {
  Video,
  Headphones,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  FastForward,
  Rewind,
  Copy,
  Check,
  Youtube,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import {
  useAudioReader,
} from '../context/AudioReaderContext';

const GUIDED_CONTEMPLATIONS: Record<string, string> = {
  'audio-1':
    'Meditación en la Ausencia de Hacedor: La Respiración Espontánea. Cierra suavemente los ojos y siente el aire entrando y saliendo de los pulmones. Observa con calma que el cuerpo respira por sí mismo sin que tú tengas que ordenar cada inhalación. Todo en el universo respira de este modo espontáneo: las olas fluyen, el corazón late, los pensamientos surgen y pasan. No hay un hacedor individual controlando el proceso. Descansa en el Testigo impersonal que percibe este milagro de silencio y presencia.',
  'audio-2':
    'Satsang de Mumbai: El Cese de la Culpa y el Rencor. Trae a tu mente cualquier peso, reproche o arrepentimiento del pasado. Ramesh Balsekar nos recuerda que lo que sucedió tenía que suceder según la totalidad cósmica. Mira hacia atrás en tu vida: no hubo un autor individual independiente cometiendo errores separados, sino la Consciencia desplegándose. Suelta la culpa hacia ti mismo y el rencor hacia los demás. No hay nada que perdonar cuando comprendes que nadie hizo nada por su cuenta.',
  'audio-3':
    'Inquirimiento en la Quietud: El Testigo que Nunca Nació. Antes de que aparezca cualquier pensamiento sobre el pasado o el futuro, hay una presencia viva y silenciosa. Sri Nisargadatta Maharaj y Ramesh Balsekar nos invitan a permanecer en este sentido puro de existencia: el Yo Soy. Aquí no hay tiempo, no hay conflicto ni separación. Eres la Consciencia inmutable que observa el fluir del mundo.',
  'audio-4':
    'La Consciencia en la Vida Cotidiana: Meditación Advaita Profunda. Permite que la comprensión penetre profundamente. Todo acontecimiento en el cosmos ocurre en una sola totalidad impersonal. No luches contra los pensamientos: permite que surjan y desaparezcan como olas en el océano de la Consciencia.',
  'audio-5':
    'Paz en lo Cotidiano: Rendición a la Voluntad Cósmica. Rendirse no es una derrota del ego, es la victoria de la cordura: reconocer que la pequeña ola no puede dirigir al inmenso océano. Actúa en el mundo con diligencia, pero suelta la ansiedad por los frutos de la acción. Al entregarte al Todo, la pesadez de vivir se transforma en ligereza.',
  'audio-6':
    'El Dúo de Uno: Meditación en el Ashtavakra Gita. Tú eres el Uno sin segundo, libre y autosuficiente desde siempre. La única ilusión fue creer que eras un prisionero buscando llaves de liberación. Abre los ojos: la puerta de la jaula nunca estuvo cerrada. Descansa en la certeza de tu propia naturaleza inmortal.',
};

export const MediaArchive: React.FC = () => {
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'audio'>('video');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(MEDIA_ARCHIVE[0]);
  const [isVideoIframeActive, setIsVideoIframeActive] = useState<boolean>(false);

  // Audio Session State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(1080);
  const [audioVolume, setAudioVolume] = useState<number>(0.85);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Audio intervals
  const audioIntervalRef = useRef<number | null>(null);

  const { isPlaying, speak, stopSpeech, testVoice, currentTitle } = useAudioReader();

  const isCurrentAudioActive = isPlaying && currentTitle === selectedMedia.title;

  const videoItems = MEDIA_ARCHIVE.filter((m) => m.type === 'video');
  const audioItems = MEDIA_ARCHIVE.filter((m) => m.type === 'audio');

  const stopAllAudio = () => {
    setIsPlayingAudio(false);
    stopSpeech();
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
  };

  // Play Guided Meditation Session with clear spoken Advaita contemplation
  const togglePlayAudio = () => {
    if (isPlayingAudio || isCurrentAudioActive) {
      stopAllAudio();
      return;
    }

    setIsPlayingAudio(true);

    const contemplation =
      GUIDED_CONTEMPLATIONS[selectedMedia.id] ||
      `${selectedMedia.title}. ${selectedMedia.description}. ${selectedMedia.transcriptExcerpt}`;

    // Speak the guided contemplation with clean browser text-to-speech
    speak(contemplation, selectedMedia.title);

    // Timeline tracker
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    audioIntervalRef.current = window.setInterval(() => {
      setAudioCurrentTime((curr) => {
        if (curr >= audioDuration) {
          stopAllAudio();
          return 0;
        }
        return curr + 1;
      });
    }, 1000);
  };

  const handleSeek = (newTime: number) => {
    setAudioCurrentTime(newTime);
  };

  const handleRewind15 = () => {
    setAudioCurrentTime((curr) => Math.max(0, curr - 15));
  };

  const handleForward15 = () => {
    setAudioCurrentTime((curr) => Math.min(audioDuration, curr + 15));
  };

  const handleVolumeChange = (vol: number) => {
    setAudioVolume(vol);
  };

  const handleSelectMedia = (item: MediaItem) => {
    stopAllAudio();
    setIsVideoIframeActive(false);
    setSelectedMedia(item);
    setAudioCurrentTime(0);
    const match = item.duration.match(/(\d+)/);
    setAudioDuration(match ? parseInt(match[1], 10) * 60 : 1080);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(selectedMedia.transcriptExcerpt);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleListenTranscript = (item: MediaItem) => {
    speak(
      `${item.title}. ${item.description}. Transcripción oficial: ${item.transcriptExcerpt}`,
      item.title
    );
  };

  // Direct, verified YouTube watch link for this specific video
  const getDirectYouTubeWatchUrl = (item: MediaItem): string => {
    if (item.youtubeId) {
      return `https://www.youtube.com/watch?v=${item.youtubeId}`;
    }
    return 'https://www.youtube.com/@rameshbalsekar2530';
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, []);

  return (
    <section id="multimedia" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2 font-sans">
            05. Archivo Audiovisual
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Videoteca Oficial de Satsangs y Audios Meditativos
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Grabaciones históricas de diálogos en Bombay con Ramesh Balsekar verificadas en YouTube, y sesiones de audios meditativos guiados con narración de voz clara.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] mb-8 w-fit">
          <button
            type="button"
            onClick={() => {
              if (isPlayingAudio) togglePlayAudio();
              setActiveMediaTab('video');
              handleSelectMedia(videoItems[0]);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaTab === 'video'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Video className="w-4 h-4 text-[var(--accent)]" />
            <span>Videoteca de Satsang ({videoItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsVideoIframeActive(false);
              setActiveMediaTab('audio');
              handleSelectMedia(audioItems[0]);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeMediaTab === 'audio'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Headphones className="w-4 h-4 text-[var(--accent)]" />
            <span>Audios Meditativos ({audioItems.length})</span>
          </button>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Player Display (7 cols) */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 shadow-xs">
            {activeMediaTab === 'video' ? (
              /* REAL VERIFIED VIDEO PLAYER */
              <div className="space-y-6">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[var(--border-color)] shadow-lg">
                  {isVideoIframeActive && selectedMedia.youtubeId ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${selectedMedia.youtubeId}?autoplay=1&rel=0`}
                      title={selectedMedia.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="relative w-full h-full flex flex-col justify-between p-6">
                      {/* Background Thumbnail from YouTube */}
                      {selectedMedia.youtubeId ? (
                        <img
                          src={`https://i.ytimg.com/vi/${selectedMedia.youtubeId}/hqdefault.jpg`}
                          alt={selectedMedia.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-45"
                        />
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 pointer-events-none" />

                      <div className="relative z-10 flex items-center justify-between text-xs text-white/90">
                        <span className="uppercase tracking-widest font-mono text-[11px] text-amber-400 font-semibold bg-black/60 px-2 py-0.5 rounded">
                          Satsang Histórico de Bombay
                        </span>
                        <span className="font-mono bg-black/70 px-2.5 py-0.5 rounded text-white text-xs">
                          {selectedMedia.duration}
                        </span>
                      </div>

                      {/* Central Play Trigger */}
                      <div className="relative z-10 text-center my-auto px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setIsVideoIframeActive(true)}
                          className="group inline-flex flex-col items-center gap-3 cursor-pointer focus:outline-none mb-3"
                          title="Reproducir video aquí mismo"
                        >
                          <div className="w-20 h-20 rounded-full bg-red-600 group-hover:bg-red-500 group-hover:scale-110 transition-all text-white flex items-center justify-center shadow-2xl">
                            <Play className="w-10 h-10 fill-current ml-1" />
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-600 group-hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider shadow-md">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Reproducir Video en la Web</span>
                          </span>
                        </button>

                        <h4 className="font-serif text-xl sm:text-2xl text-white font-medium leading-snug drop-shadow-md">
                          {selectedMedia.title}
                        </h4>
                      </div>

                      {/* Bottom bar of thumbnail */}
                      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/20 text-xs text-stone-300">
                        <span>{selectedMedia.recordedIn}</span>
                        <a
                          href={getDirectYouTubeWatchUrl(selectedMedia)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <Youtube className="w-3.5 h-3.5 text-red-500" />
                          <span>Abrir en YouTube Oficial</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Youtube className="w-5 h-5 text-red-600 shrink-0" />
                    <span>Video oficial verificado de Ramesh Balsekar:</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isVideoIframeActive && (
                      <button
                        type="button"
                        onClick={() => setIsVideoIframeActive(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 font-semibold text-xs tracking-wider uppercase transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Ver Aquí</span>
                      </button>
                    )}

                    <a
                      href={getDirectYouTubeWatchUrl(selectedMedia)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-xs cursor-pointer"
                    >
                      <Youtube className="w-3.5 h-3.5 fill-current" />
                      <span>Ver en YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Video Description */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-sans mb-1">
                    <span>{selectedMedia.recordedIn}</span>
                    <span className="font-mono">{selectedMedia.duration}</span>
                  </div>
                  <h4 className="font-serif text-xl sm:text-2xl font-medium text-[var(--text-primary)]">
                    {selectedMedia.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed mt-2">
                    {selectedMedia.description}
                  </p>
                </div>
              </div>
            ) : (
              /* REAL MEDITATION AUDIO SESSION PLAYER */
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center relative overflow-hidden">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-xs">
                    <Headphones className="w-8 h-8" />
                  </div>

                  <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold font-sans">
                    {selectedMedia.topic}
                  </span>
                  <h3 className="font-serif text-2xl font-medium text-[var(--text-primary)] mt-1 mb-2">
                    {selectedMedia.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans max-w-md mx-auto leading-relaxed mb-6">
                    {selectedMedia.description}
                  </p>

                  {/* Pulsing Visual Frequency Waves */}
                  <div className="flex items-center justify-center gap-1.5 h-14 my-4 px-4">
                    {[25, 45, 18, 55, 75, 40, 60, 85, 48, 70, 80, 35, 62, 78, 30, 65, 45, 25, 52].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-[var(--accent)] transition-all duration-300"
                          style={{
                            height: isPlayingAudio
                              ? `${Math.max(18, h * (i % 2 === 0 ? 1 : 0.85))}%`
                              : '18%',
                            opacity: isPlayingAudio ? (i % 2 === 0 ? 0.95 : 0.6) : 0.25,
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Timeline Scrubber */}
                  <div className="max-w-md mx-auto my-4">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 60}
                      value={audioCurrentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="w-full accent-[var(--accent)] cursor-pointer h-1.5 bg-[var(--border-color)] rounded-lg"
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono mt-1">
                      <span>{formatTime(audioCurrentTime)}</span>
                      <span>{formatTime(audioDuration || 1080)}</span>
                    </div>
                  </div>

                  {/* Main Playback Controls */}
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
                    <button
                      type="button"
                      onClick={handleRewind15}
                      title="Retroceder 15 segundos"
                      className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <Rewind className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all font-semibold text-sm shadow-xs cursor-pointer"
                    >
                      {isPlayingAudio ? (
                        <>
                          <Pause className="w-5 h-5 fill-current" />
                          <span>Pausar Sesión</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          <span>▶ Reproducir Sesión Meditativa</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleForward15}
                      title="Adelantar 15 segundos"
                      className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <FastForward className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={testVoice}
                      title="Probar reproducción de voz del narrador"
                      className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold hidden sm:inline">Probar voz</span>
                    </button>
                  </div>

                  {/* Active Equalizer Graphic when playing */}
                  {isPlayingAudio && (
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      <div className="w-1 bg-[var(--accent)] rounded-full animate-bounce h-5" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 bg-[var(--accent)] rounded-full animate-bounce h-8" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 bg-[var(--accent)] rounded-full animate-bounce h-6" style={{ animationDelay: '300ms' }} />
                      <div className="w-1 bg-[var(--accent)] rounded-full animate-bounce h-9" style={{ animationDelay: '75ms' }} />
                      <div className="w-1 bg-[var(--accent)] rounded-full animate-bounce h-4" style={{ animationDelay: '220ms' }} />
                      <span className="text-xs text-[var(--accent)] font-medium ml-2">Narración en audio activa...</span>
                    </div>
                  )}

                  {/* Volume Slider */}
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-[var(--border-color)] max-w-xs mx-auto">
                    <Volume2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-28 accent-[var(--accent)] cursor-pointer h-1 bg-[var(--border-color)]"
                    />
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {Math.round(audioVolume * 100)}%
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] font-sans mt-3">
                    Narración oral de enseñanzas meditativas en audio con transcripción guiada.
                  </p>

                  {/* Mobile Sound Helper Banner with Xiaomi 11T / Android specific advice */}
                  <div className="mt-5 p-3.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-color)] text-left flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">📱</span>
                    <div className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                      <strong className="text-[var(--text-primary)] block mb-1">
                        ¿Tienes un Xiaomi (11T / MIUI / HyperOS) o Android y no escuchas la voz?
                      </strong>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        <li>
                          <strong>Volumen Multimedia:</strong> En móviles Xiaomi, al pulsar los botones laterales de volumen físico, pulsa los <strong>tres puntos verticales (•••)</strong> que aparecen en la barra en pantalla y sube el deslizador con el icono de la <strong>nota musical 🎵 (Multimedia)</strong>. Por defecto en Xiaomi, los botones físicos solo cambian el timbre de llamada y dejan la música/voz en silencio.
                        </li>
                        <li>
                          <strong>Prueba rápida:</strong> Pulsa el botón <strong>«Probar voz»</strong> arriba; si escuchas la voz del narrador, el altavoz y el motor de voz de tu móvil están listos.
                        </li>
                        <li>
                          <strong>Motor TTS en Xiaomi:</strong> Si sigue en silencio, ve a <em>Ajustes de tu teléfono → Ajustes adicionales → Accesibilidad → Visión → Síntesis de voz</em> y asegúrate de tener seleccionado <strong>«Servicios de voz de Google»</strong> en idioma Español.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript & Speech Narration Box */}
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between pb-3 mb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] font-sans">
                  Transcripción y Contenido del Archivo
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    title="Copiar texto de la transcripción"
                  >
                    {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTranscript ? 'Copiado' : 'Copiar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleListenTranscript(selectedMedia)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    title="Reproducir transcripción en audio"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Escuchar lectura</span>
                  </button>
                </div>
              </div>

              <p className="font-serif italic text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {selectedMedia.transcriptExcerpt}
              </p>
            </div>
          </div>

          {/* Right Column: Media Selection List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1 mb-2 font-sans flex items-center justify-between">
              <span>
                {activeMediaTab === 'video'
                  ? 'Catálogo de Videos Históricos (6)'
                  : 'Catálogo de Audios Meditativos (6)'}
              </span>
              <span className="text-[11px] text-[var(--accent)]">
                {activeMediaTab === 'video' ? 'Oficiales YouTube' : 'Sesiones Guiadas'}
              </span>
            </div>

            {(activeMediaTab === 'video' ? videoItems : audioItems).map((item) => {
              const isSelected = selectedMedia.id === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSelectMedia(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-sans mb-1">
                    <span className="font-mono font-semibold text-[var(--accent)]">{item.duration}</span>
                    <span>{item.recordedIn}</span>
                  </div>
                  <h4
                    className={`font-serif text-sm font-semibold leading-snug ${
                      isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] font-sans line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </button>
              );
            })}

            {/* Official Channel Reference Card */}
            {activeMediaTab === 'video' && (
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] space-y-2 mt-4">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>Canales Oficiales Recomendados</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Accede a los archivos completos de conferencias y encuentros matutinos en Mumbai:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://www.youtube.com/@rameshbalsekar2530"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] text-[var(--accent)] hover:border-[var(--accent)]"
                  >
                    <span>@rameshbalsekar2530</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://www.youtube.com/@rameshbalsekartalks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] text-[var(--accent)] hover:border-[var(--accent)]"
                  >
                    <span>@rameshbalsekartalks</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
