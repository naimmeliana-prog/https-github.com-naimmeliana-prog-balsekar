import React from 'react';
import { Volume2, Compass, BookOpen, Quote, Video, BookMarked, Sparkles, ArrowRight } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';
import { TabId } from './Navbar';

interface HeroProps {
  onNavigateTab: (tabId: TabId) => void;
  showSectionCards?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onNavigateTab, showSectionCards = true }) => {
  const { speak, isPlaying } = useAudioReader();

  const heroIntroText = `Bienvenido al archivo de enseñanzas de Ramesh S. Balsekar. Nacido en Bombay en 1917 y discípulo directo de Sri Nisargadatta Maharaj, Ramesh articuló la no-dualidad con una lucidez inigualable para la vida moderna. Su principio esencial es radical y liberador: las cosas suceden, los acontecimientos tienen lugar, pero no hay un hacedor individual de ellos. El organismo cuerpo-mente es un instrumento biológico de la Consciencia. Comprender esto disuelve de raíz la culpa, el orgullo, el rencor y la ansiedad.`;

  const handleListenIntro = () => {
    speak(heroIntroText, 'Introducción a la Filosofía de Ramesh Balsekar');
  };

  const sectionLinks = [
    {
      id: 'ensenanzas' as TabId,
      title: '01. Enseñanzas Esenciales',
      subtitle: 'Los 6 pilares de la no-dualidad',
      desc: 'El organismo cuerpo-mente, la voluntad de la Totalidad y la eliminación de la autoría egoica.',
      icon: BookOpen,
    },
    {
      id: 'citas' as TabId,
      title: '02. Citas Destacadas',
      subtitle: 'Aforismos y buscador temático',
      desc: 'Sentencias directas sobre el ego, el dolor frente al sufrimiento y la paz en el día a día.',
      icon: Quote,
    },
    {
      id: 'libros' as TabId,
      title: '03. Biblioteca y Libros',
      subtitle: '6 obras maestras analizadas',
      desc: 'De "La Consciencia Habla" a "Paz y Armonía" y comentarios al Ashtavakra Gita.',
      icon: BookMarked,
    },
    {
      id: 'explorador' as TabId,
      title: '04. Explorador Interactivo',
      subtitle: 'Desmantelador de la culpa',
      desc: 'Indagación práctica en dilemas cotidianos, matriz comparativa y temporizador de silencio.',
      icon: Compass,
    },
    {
      id: 'multimedia' as TabId,
      title: '05. Audio & Video',
      subtitle: 'Grabaciones de archivo en Mumbai',
      desc: 'Documentales históricos, diálogos de Satsang y meditaciones con transcripciones narradas.',
      icon: Video,
    },
    {
      id: 'glosario' as TabId,
      title: '06. Glosario Advaita',
      subtitle: 'Términos sánscritos clarificados',
      desc: 'Ahamkara, Lila, Saguna/Nirguna, Prarabdha Karma y Sakshi según Balsekar.',
      icon: Sparkles,
    },
  ];

  return (
    <section className="relative overflow-hidden pt-10 pb-16 border-b border-[var(--border-color)]">
      {/* Background subtle radial texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(154, 52, 18, 0.05), transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Curatorial Header Stamp */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs uppercase tracking-widest text-[var(--text-muted)] mb-6 font-sans">
          <span>1917 — 2009</span>
          <span aria-hidden="true">·</span>
          <span>Mumbai, India</span>
          <span aria-hidden="true">·</span>
          <span>Linaje Nisargadatta Maharaj</span>
          <span aria-hidden="true">·</span>
          <span>Advaita Puro</span>
        </div>

        {/* Primary Headline */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[var(--text-primary)] leading-tight text-balance">
            La Paz de Saber que <span className="italic font-normal">Nadie Hace Nada</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl mx-auto">
            La enseñanza no-dual de Ramesh S. Balsekar sobre la ausencia de autoría personal, la Voluntad Cósmica y la serenidad lúcida en la vida cotidiana.
          </p>
        </div>

        {/* Featured Pull Quote Block */}
        <div className="my-8 max-w-3xl mx-auto p-6 sm:p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs relative">
          <div className="font-serif italic text-xl sm:text-2xl text-[var(--text-primary)] leading-relaxed text-center">
            «Las cosas suceden, los acontecimientos tienen lugar, pero no hay un hacedor individual de ellos».
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border-color)] font-sans">
            <span className="font-medium text-[var(--text-secondary)]">— Ramesh S. Balsekar</span>
            <span>Diálogos de Mumbai · La Consciencia Habla</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 mb-12">
          <button
            type="button"
            onClick={handleListenIntro}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isPlaying ? 'Escuchando introducción...' : 'Escuchar introducción en audio'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('ensenanzas')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ver Enseñanzas</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('explorador')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Explorador Interactivo</span>
          </button>
        </div>

        {/* Direct Navigation Cards (Tabs Portal) */}
        {showSectionCards && (
          <div className="mt-12 pt-10 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold font-sans">
                  Navegación Temática
                </span>
                <h3 className="font-serif text-2xl font-medium text-[var(--text-primary)] mt-0.5">
                  Acceso a las Secciones de la Web
                </h3>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-sans hidden sm:inline">
                Haz clic en cualquier tarjeta para abrir su pestaña
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onNavigateTab(item.id)}
                    className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                      </div>
                      <h4 className="font-serif text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs font-serif italic text-[var(--text-muted)] mt-0.5">
                        {item.subtitle}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] font-semibold text-[var(--accent)] font-sans flex items-center gap-1">
                      <span>Abrir pestaña</span>
                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
