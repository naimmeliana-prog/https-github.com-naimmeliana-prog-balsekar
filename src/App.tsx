/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AudioReaderProvider } from './context/AudioReaderContext';
import { Navbar, TabId } from './components/Navbar';
import { Hero } from './components/Hero';
import { TeachingsSection } from './components/TeachingsSection';
import { QuotesSection } from './components/QuotesSection';
import { BooksSection } from './components/BooksSection';
import { InteractiveExplorer } from './components/InteractiveExplorer';
import { MediaArchive } from './components/MediaArchive';
import { GlossarySection } from './components/GlossarySection';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { Footer } from './components/Footer';
import { ArrowLeft, Home, BookOpen, Quote, BookMarked, Compass, Video, Sparkles, Layers } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    // Read from window.location.hash if present
    const hash = window.location.hash.replace('#', '') as TabId;
    const validTabs: TabId[] = ['inicio', 'ensenanzas', 'citas', 'libros', 'explorador', 'multimedia', 'glosario', 'todos'];
    return validTabs.includes(hash) ? hash : 'inicio';
  });

  const [viewMode, setViewMode] = useState<'tabs' | 'continuous'>('tabs');

  const handleNavigate = (tabId: TabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId === 'inicio' ? '' : `#${tabId}`;

    if (viewMode === 'continuous' || tabId === 'todos') {
      if (tabId === 'inicio') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => {
          const elem = document.getElementById(tabId);
          if (elem) {
            const navOffset = 80;
            const elementPosition = elem.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth',
            });
          }
        }, 50);
      }
    } else {
      // In tab mode, scroll to top so the section starts right under the navbar
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync hash changes from browser history (Back / Forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabId;
      const validTabs: TabId[] = ['inicio', 'ensenanzas', 'citas', 'libros', 'explorador', 'multimedia', 'glosario', 'todos'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        viewMode={viewMode}
        onToggleViewMode={(mode) => {
          setViewMode(mode);
          if (mode === 'continuous') {
            setActiveTab('todos');
          } else if (activeTab === 'todos') {
            setActiveTab('inicio');
          }
        }}
      />

      <main className="flex-1">
        {/* Breadcrumb / Quick tab bar in Tab mode when not on 'inicio' */}
        {viewMode === 'tabs' && activeTab !== 'inicio' && activeTab !== 'todos' && (
          <div className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] py-2.5 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => handleNavigate('inicio')}
                  className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors cursor-pointer font-medium"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </button>
                <span>/</span>
                <span className="font-semibold text-[var(--accent)] uppercase tracking-wider">
                  {activeTab === 'ensenanzas' && 'Enseñanzas Esenciales'}
                  {activeTab === 'citas' && 'Citas Destacadas'}
                  {activeTab === 'libros' && 'Bibliografía y Libros'}
                  {activeTab === 'explorador' && 'Explorador Interactivo'}
                  {activeTab === 'multimedia' && 'Audio & Video'}
                  {activeTab === 'glosario' && 'Glosario Advaita'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleNavigate('inicio')}
                className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Volver al inicio</span>
              </button>
            </div>
          </div>
        )}

        {/* View Mode: TABS */}
        {viewMode === 'tabs' && (
          <>
            {activeTab === 'inicio' && (
              <Hero onNavigateTab={handleNavigate} showSectionCards={true} />
            )}

            {activeTab === 'ensenanzas' && <TeachingsSection />}

            {activeTab === 'citas' && <QuotesSection />}

            {activeTab === 'libros' && <BooksSection />}

            {activeTab === 'explorador' && <InteractiveExplorer />}

            {activeTab === 'multimedia' && <MediaArchive />}

            {activeTab === 'glosario' && <GlossarySection />}

            {activeTab === 'todos' && (
              <>
                <Hero onNavigateTab={handleNavigate} showSectionCards={false} />
                <TeachingsSection />
                <QuotesSection />
                <BooksSection />
                <InteractiveExplorer />
                <MediaArchive />
                <GlossarySection />
              </>
            )}
          </>
        )}

        {/* View Mode: CONTINUOUS (All sections visible in scroll) */}
        {viewMode === 'continuous' && (
          <>
            <Hero onNavigateTab={handleNavigate} showSectionCards={false} />
            <TeachingsSection />
            <QuotesSection />
            <BooksSection />
            <InteractiveExplorer />
            <MediaArchive />
            <GlossarySection />
          </>
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <AudioPlayerBar />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AudioReaderProvider>
        <MainApp />
      </AudioReaderProvider>
    </ThemeProvider>
  );
}
