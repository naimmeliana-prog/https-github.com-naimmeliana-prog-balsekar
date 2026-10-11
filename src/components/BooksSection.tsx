import React, { useState } from 'react';
import { BALSEKAR_BOOKS } from '../data/balsekarData';
import { BookItem } from '../types';
import { BookOpen, Volume2, VolumeX, CheckCircle, Calendar, Sparkles } from 'lucide-react';
import { useAudioReader } from '../context/AudioReaderContext';

export const BooksSection: React.FC = () => {
  const [selectedBook, setSelectedBook] = useState<BookItem>(BALSEKAR_BOOKS[0]);
  const { speak, stopSpeech, isPlaying, currentTitle } = useAudioReader();

  const handleListenBook = (book: BookItem) => {
    if (isPlaying && currentTitle === `Libro: ${book.title}`) {
      stopSpeech();
      return;
    }
    const textToRead = `${book.title}. ${book.description}. Tesis central: ${book.centralThesis}. Fragmento destacado: ${book.excerpt}. Significado de la obra: ${book.significance}`;
    speak(textToRead, `Libro: ${book.title}`);
  };

  const isCurrentAudioActive = isPlaying && currentTitle === `Libro: ${selectedBook.title}`;

  return (
    <section id="libros" className="py-16 sm:py-24 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            03. Bibliografía Esencial
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Los Libros de Ramesh Balsekar y sus Temas
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Navegación fluida por las seis obras fundamentales donde Balsekar plasmó los diálogos de Bombay, comentarios al Ashtavakra Gita y la aplicación práctica del Advaita.
          </p>
        </div>

        {/* Fluid Horizontal Book Shelf Selector */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {BALSEKAR_BOOKS.map((book) => {
            const isSelected = selectedBook.id === book.id;
            return (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className={`px-4 py-3 rounded-xl border text-left shrink-0 transition-all cursor-pointer min-w-[200px] max-w-[240px] ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>{book.year}</span>
                </div>
                <h3 className={`font-serif text-sm font-semibold leading-snug line-clamp-1 ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {book.title}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-sans line-clamp-1 mt-0.5">
                  {book.originalTitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected Book Presentation Card */}
        <div className="border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Book Details & Central Thesis (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] font-sans">
                <span className="font-mono">{selectedBook.year}</span>
                <span aria-hidden="true">·</span>
                <span>Título original: <em className="font-serif">{selectedBook.originalTitle}</em></span>
              </div>

              <div>
                <h3 className="font-serif text-3xl sm:text-4xl font-medium text-[var(--text-primary)]">
                  {selectedBook.title}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed mt-3">
                  {selectedBook.description}
                </p>
              </div>

              {/* Central Thesis Box */}
              <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                <div className="text-xs uppercase tracking-wider font-semibold text-[var(--accent)] mb-1 font-sans">
                  Tesis Central de la Obra
                </div>
                <p className="font-serif italic text-base sm:text-lg text-[var(--text-primary)] leading-snug">
                  {selectedBook.centralThesis}
                </p>
              </div>

              {/* Key Themes List */}
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-3 font-sans">
                  Temas Tratados en sus Capítulos
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedBook.keyThemes.map((theme, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] font-sans">
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>{theme}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Significance */}
              <div className="pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] font-sans">
                <span className="font-semibold text-[var(--text-secondary)]">Importancia Histórica: </span>
                {selectedBook.significance}
              </div>
            </div>

            {/* Right Column: Excerpt & Audio Player (5 cols) */}
            <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] font-sans">
                    <BookOpen className="w-4 h-4" />
                    <span>Fragmento Destacado</span>
                  </div>

                  {/* Audio Listen Button */}
                  <button
                    onClick={() => handleListenBook(selectedBook)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isCurrentAudioActive
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                    title="Escuchar fragmento en audio"
                  >
                    {isCurrentAudioActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isCurrentAudioActive ? 'Pausar' : 'Escuchar en audio'}</span>
                  </button>
                </div>

                <div className="font-serif italic text-base sm:text-lg text-[var(--text-primary)] leading-relaxed">
                  {selectedBook.excerpt}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[var(--border-color)] text-right text-[11px] text-[var(--text-muted)] font-sans">
                Lectura no-dual · {selectedBook.title}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
