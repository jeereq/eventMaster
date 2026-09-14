'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClass(next: Theme) {
  if (typeof document === 'undefined') return;
  if (next === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  window.dispatchEvent(new CustomEvent('em-theme-changed'));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    // Pendant le splash : pas encore de classe dark (reportée), mais on connaît la préférence
    try {
      if ((window as unknown as { __emPendingDark?: boolean }).__emPendingDark) return 'dark';
    } catch {
      /* ignore */
    }
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setThemeState(initialTheme);

    const splashOn =
      document.documentElement.classList.contains('em-splash-boot') ||
      document.getElementById('em-native-splash')?.classList.contains('is-on');

    if (splashOn) {
      // Ne pas peindre le dark sous le splash (flash noir)
      if (initialTheme === 'dark') {
        (window as unknown as { __emPendingDark?: boolean }).__emPendingDark = true;
      }
      document.documentElement.classList.remove('dark');
      return;
    }

    applyThemeClass(initialTheme);
  }, []);

  useEffect(() => {
    const splashOn =
      document.documentElement.classList.contains('em-splash-boot') ||
      document.getElementById('em-native-splash')?.classList.contains('is-on');
    if (splashOn) {
      if (theme === 'dark') {
        (window as unknown as { __emPendingDark?: boolean }).__emPendingDark = true;
      }
      document.documentElement.classList.remove('dark');
      return;
    }
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    localStorage.setItem('theme', nextTheme);
    const splashOn =
      document.documentElement.classList.contains('em-splash-boot') ||
      document.getElementById('em-native-splash')?.classList.contains('is-on');
    if (splashOn) {
      if (nextTheme === 'dark') {
        (window as unknown as { __emPendingDark?: boolean }).__emPendingDark = true;
      } else {
        try {
          delete (window as unknown as { __emPendingDark?: boolean }).__emPendingDark;
        } catch {
          /* ignore */
        }
      }
      document.documentElement.classList.remove('dark');
      return;
    }
    applyThemeClass(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
