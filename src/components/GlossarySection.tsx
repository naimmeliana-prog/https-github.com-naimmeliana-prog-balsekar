import React, { useState } from 'react';
import { GLOSSARY_TERMS } from '../data/balsekarData';
import { GlossaryTerm } from '../types';
import { BookMarked, Volume2, Search } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';

export const GlossarySection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { speak } = useAudioReader();

  const filteredTerms = GLOSSARY_TERMS.filter(
    (t) =>
      t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.meaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.rameshInterpretation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleListenTerm = (term: GlossaryTerm) => {
    const textToRead = `${term.term}. Significado sánscrito: ${term.meaning}. Interpretación de Ramesh Balsekar: ${term.rameshInterpretation}`;
    speak(textToRead, `Término: ${term.term}`);
  };

  return (
    <section id="glosario" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              06. Vocabulario Filosófico
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
              Glosario Advaita según Ramesh Balsekar
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
              Términos clásicos de la filosofía no-dual despojados de misticismo oscuro y traducidos a la psicología práctica de la vida cotidiana.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar término o significado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {/* Glossary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTerms.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                      {item.term}
                    </h3>
                    <span className="text-xs font-serif text-[var(--text-muted)]">
                      {item.sanskrit}
                    </span>
                  </div>

                  <button
                    onClick={() => handleListenTerm(item)}
                    title={`Escuchar pronunciación y significado de ${item.term}`}
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-4">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block mb-1 font-sans">
                    Definición Tradicional
                  </span>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
                    {item.meaning}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] mt-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--accent)] block mb-1 font-sans">
                  El Puntero de Ramesh Balsekar
                </span>
                <p className="text-xs sm:text-sm text-[var(--text-primary)] font-serif italic leading-relaxed">
                  {item.rameshInterpretation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
