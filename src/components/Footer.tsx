import React from 'react';
import { ArrowUp } from 'lucide-react';
import { TabId } from './Navbar';

interface FooterProps {
  onNavigate: (tabId: TabId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const scrollToTop = () => {
    onNavigate('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="pt-16 pb-28 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-[var(--border-color)]">
          {/* Col 1: Wordmark & Bio (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
              Ramesh S. Balsekar
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-sans uppercase tracking-widest">
              1917 Bombay — 2009 Mumbai · Discípulo de Nisargadatta Maharaj
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed max-w-sm">
              Expresidente de Bank of India y exponente contemporáneo del Advaita Vedanta. Dedicó más de tres décadas a recibir a buscadores de todo el mundo en su hogar de Gamdevi para transmitir la ausencia de hacedor personal y la paz en la vida cotidiana.
            </p>
          </div>

          {/* Col 2: Navigation Links (4 cols) */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-primary)] mb-3 font-sans">
              Exploración de la Obra
            </div>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <button
                  onClick={() => onNavigate('ensenanzas')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Los Seis Pilares del Advaita
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('citas')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Antología de Citas y Aforismos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('libros')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Bibliografía y Análisis de Obras
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explorador')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Desmantelador Interactivo de la Culpa
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('multimedia')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Videoteca y Audios de Satsang
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('glosario')}
                  className="hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  Glosario de Términos Sánscritos
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Principle note (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs uppercase tracking-widest font-semibold text-[var(--text-primary)] mb-2 font-sans">
              Principio Cardinal
            </div>
            <p className="font-serif italic text-sm text-[var(--text-primary)] leading-snug">
              «El universo es un acontecimiento único desarrollándose en la Consciencia. Suelta la carga de la autoría y descansa».
            </p>
            <div className="pt-2">
              <button
                onClick={scrollToTop}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer font-sans"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Volver al inicio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] font-sans gap-4">
          <p>
            Plataforma dedicada al estudio de la filosofía no-dual. Contenidos de dominio público, valor educativo y archivo histórico.
          </p>
          <div className="flex items-center gap-4">
            <span>Sin publicidad ni interrupciones</span>
            <span aria-hidden="true">·</span>
            <span>Modo Lectura Nocturna</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
