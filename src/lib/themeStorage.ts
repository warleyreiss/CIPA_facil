import { STORAGE_KEYS } from './storageService';

export type ThemeMode = 'light' | 'dark';

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  return saved === 'dark' ? 'dark' : 'light';
}

export function setStoredThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.theme, mode);
}

export function applyThemeModeToDocument(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
}
