import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('balsekar-theme');
    if (saved === 'paper' || saved === 'sepia' || saved === 'night') {
      return saved;
    }
    return 'paper';
  });

  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('balsekar-font-size');
    if (saved === 'normal' || saved === 'large' || saved === 'xlarge') {
      return saved;
    }
    return 'normal';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('balsekar-theme', newTheme);
  };

  const setFontSize = (size: 'normal' | 'large' | 'xlarge') => {
    setFontSizeState(size);
    localStorage.setItem('balsekar-font-size', size);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-paper', 'theme-sepia', 'theme-night', 'dark');

    if (theme === 'night') {
      root.classList.add('theme-night', 'dark');
    } else if (theme === 'sepia') {
      root.classList.add('theme-sepia');
    } else {
      root.classList.add('theme-paper');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
