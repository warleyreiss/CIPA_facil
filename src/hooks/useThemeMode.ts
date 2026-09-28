import { useCallback, useEffect, useState } from 'react';
import {
  applyThemeModeToDocument,
  getStoredThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from '../lib/themeStorage';

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());

  useEffect(() => {
    applyThemeModeToDocument(themeMode);
    setStoredThemeMode(themeMode);
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDarkMode = themeMode === 'dark';

  return { themeMode, isDarkMode, toggleThemeMode, setThemeMode };
}
