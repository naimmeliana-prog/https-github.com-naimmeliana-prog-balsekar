import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAudioReader } from '../context/AudioReaderContext';
import { Volume2, VolumeX, Bell, Sun, Moon, Feather, Menu, X, Layers, LayoutList } from 'lucide-react';

export type TabId = 'inicio' | 'ensenanzas' | 'citas' | 'libros' | 'explorador' | 'multimedia' | 'glosario' | 'todos';

interface NavbarProps {
  activeTab: TabId;
  onNavigate: (tabId: TabId) => void;
  viewMode: 'tabs' | 'continuous';
  onToggleViewMode: (mode: 'tabs' | 'continuous') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  viewMode,
  onToggleViewMode,
}) => {
  const { theme, setTheme } = useTheme();
  const { ambientSound, toggleAmbientSound, playSingingBowl } = useAudioReader();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { id: TabId; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'ensenanzas', label: 'Enseñanzas' },
    { id: 'citas', label: 'Citas' },
    { id: 'libros', label: 'Libros' },
    { id: 'explorador', label: 'Explorador' },
    { id: 'multimedia', label: 'Audio & Video' },
    { id: 'glosario', label: 'Glosario' },
    { id: 'todos', label: 'Ver Todo' },
  ];

  const handleLinkClick = (id: TabId) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors shadow-2xs"
      style={{
        backgroundColor:
          theme === 'night'
            ? 'rgba(12, 14, 18, 0.94)'
            : theme === 'sepia'
            ? 'rgba(244, 239, 230, 0.94)'
            : 'rgba(250, 248, 245, 0.94)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Top Bar Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('inicio')}
          className="text-left group cursor-pointer focus:outline-none shrink-0"
        >
          <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)] whitespace-nowrap block transition-opacity group-hover:opacity-80">
            Ramesh S. Balsekar
          </span>
          <span className="block text-[10px] tracking-widest uppercase font-sans text-[var(--text-muted)] -mt-1">
            Advaita Vedanta · Bombay
          </span>
        </button>

        {/* Zone 2: Desktop Navigation Links (Pestañas) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium overflow-x-auto no-scrollbar py-1">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                type="button"
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`transition-all whitespace-nowrap shrink-0 text-xs uppercase tracking-wider font-sans cursor-pointer px-3 py-1.5 rounded-lg ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold bg-[var(--accent-soft)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Utilities, Sound & Theme controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* View mode toggle (Pestañas vs Continuo) */}
          <div className="hidden lg:flex items-center p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px]">
            <button
              type="button"
              onClick={() => onToggleViewMode('tabs')}
              title="Modo Pestañas (Exploración individual)"
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'tabs'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Pestañas</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('continuous')}
              title="Modo Continuo (Ver todo en una página)"
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutList className="w-3 h-3" />
              <span>Continuo</span>
            </button>
          </div>

          {/* Singing bowl chime */}
          <button
            type="button"
            onClick={playSingingBowl}
            title="Tocar campana tibetana"
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            aria-label="Campana de silencio"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Ambient sound toggle (Tanpura meditativa) */}
          <button
            type="button"
            onClick={toggleAmbientSound}
            title={ambientSound ? 'Desactivar música de Tanpura meditativa' : 'Activar sonido ambiental de Tanpura (432 Hz)'}
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              ambientSound
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-xs font-semibold'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
            }`}
            aria-label="Sonido ambiental y Tanpura"
          >
            <Volume2 className={`w-4 h-4 ${ambientSound ? 'animate-pulse text-[var(--accent)]' : ''}`} />
            <span className="text-[11px] font-sans hidden sm:inline">
              {ambientSound ? 'Tanpura Activa' : 'Sonido'}
            </span>
          </button>

          {/* Reading theme toggles */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs">
            <button
              type="button"
              onClick={() => setTheme('paper')}
              title="Modo Papel (Lectura diurna)"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                theme === 'paper'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('sepia')}
              title="Modo Sepia (Papiro cálido)"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                theme === 'sepia'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('night')}
              title="Modo Noche (Lectura nocturna)"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                theme === 'night'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Abrir menú de pestañas"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Persistent Mobile / Tablet Scrollable Tab Bar (Always directly accessible!) */}
      <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              type="button"
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`px-3 py-1 text-xs uppercase tracking-wider font-sans whitespace-nowrap rounded-md shrink-0 cursor-pointer transition-all ${
                isActive
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* Expanded Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-4 space-y-2 shadow-lg animate-fadeIn">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2 px-1">
            Navegación de Pestañas
          </div>
          {navLinks.map((link) => (
            <button
              type="button"
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`block w-full text-left py-2 px-3 rounded-lg text-sm cursor-pointer transition-colors ${
                activeTab === link.id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              {link.label}
            </button>
          ))}

          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Modo de visualización:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleViewMode('tabs')}
                className={`px-2 py-1 rounded cursor-pointer ${viewMode === 'tabs' ? 'font-bold text-[var(--accent)]' : ''}`}
              >
                Pestañas
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => onToggleViewMode('continuous')}
                className={`px-2 py-1 rounded cursor-pointer ${viewMode === 'continuous' ? 'font-bold text-[var(--accent)]' : ''}`}
              >
                Continuo
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
