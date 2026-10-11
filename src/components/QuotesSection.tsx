import React, { useState } from 'react';
import { BALSEKAR_QUOTES } from '../data/balsekarData';
import { QuoteItem } from '../types';
import { Volume2, VolumeX, Copy, Check, Search, Quote } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';

export const QuotesSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { speak, stopSpeech, isPlaying, currentTitle } = useAudioReader();

  const categories = [
    { id: 'todos', label: 'Todas las Citas' },
    { id: 'no-hacedor', label: 'Ausencia de Hacedor' },
    { id: 'totalidad', label: 'Voluntad Cósmica' },
    { id: 'ego-mente', label: 'Ego y Mente' },
    { id: 'paz-cotidiana', label: 'Paz Cotidiana' },
    { id: 'busqueda', label: 'Búsqueda Espiritual' },
  ];

  const filteredQuotes = BALSEKAR_QUOTES.filter((item) => {
    const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch =
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (quote: QuoteItem) => {
    const fullText = `«${quote.text}» — Ramesh S. Balsekar (${quote.source})`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(quote.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleListen = (quote: QuoteItem) => {
    if (isPlaying && currentTitle === `Cita: ${quote.source}`) {
      stopSpeech();
      return;
    }
    speak(`Cita de Ramesh Balsekar. ${quote.text}. Fuente: ${quote.source}`, `Cita: ${quote.source}`);
  };

  return (
    <section id="citas" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            02. Sabiduría Sintética
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Citas Destacadas y Aforismos No-Duales
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Una selección profunda de aforismos y señalamientos de Ramesh Balsekar extraídos de sus libros y diálogos en Mumbai. Cada cita cuenta con audio narrado y copia rápida.
          </p>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--border-color)]">
          {/* Category Tabs (Segmented controls) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)]">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por palabra o libro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotes.map((quote) => {
            const isAudioActive = isPlaying && currentTitle === `Cita: ${quote.source}`;
            const isCopied = copiedId === quote.id;

            return (
              <div
                key={quote.id}
                className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between hover:shadow-xs transition-all relative group"
              >
                <div>
                  <Quote className="w-6 h-6 text-[var(--accent)] opacity-40 mb-3" />
                  <p className="font-serif italic text-lg text-[var(--text-primary)] leading-relaxed">
                    «{quote.text}»
                  </p>
                  {quote.contextNote && (
                    <p className="text-xs text-[var(--text-muted)] font-sans mt-3">
                      {quote.contextNote}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div className="text-xs font-sans text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{quote.source}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Audio Player Button */}
                    <button
                      onClick={() => handleListen(quote)}
                      title={isAudioActive ? "Detener audio" : "Escuchar esta cita en audio"}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isAudioActive
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
                      }`}
                    >
                      {isAudioActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Copy to Clipboard Button */}
                    <button
                      onClick={() => handleCopy(quote)}
                      title="Copiar cita"
                      className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-16 text-sm text-[var(--text-muted)] font-sans">
            No se encontraron citas que coincidan con la búsqueda. Prueba con otro término.
          </div>
        )}
      </div>
    </section>
  );
};
