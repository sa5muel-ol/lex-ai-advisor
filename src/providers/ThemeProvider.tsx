import { createContext, useContext, useEffect, useState } from 'react';
import { SettingsService } from '@/services/SettingsService';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // The actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Load theme from settings on mount
  useEffect(() => {
    const settings = SettingsService.loadSettings();
    setThemeState(settings.theme);
  }, []);

  // Apply theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    let resolvedTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      // Use system preference
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }
    
    // Apply the resolved theme
    root.classList.add(resolvedTheme);
    setActualTheme(resolvedTheme);
    
    // Save to settings
    const settings = SettingsService.loadSettings();
    settings.theme = theme;
    SettingsService.saveSettings(settings);
    
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        const resolvedTheme = e.matches ? 'dark' : 'light';
        root.classList.add(resolvedTheme);
        setActualTheme(resolvedTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
