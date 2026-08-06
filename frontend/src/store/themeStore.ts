import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'stiqr-theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';
const ORDER: Theme[] = ['light', 'dark', 'system'];

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia(SYSTEM_QUERY).matches;

const resolve = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;

const applyTheme = (theme: Theme) => {
  const resolved = resolve(theme);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0f0f0f' : '#ffffff');
};

interface ThemeStore {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: systemPrefersDark(),
      setTheme: (theme) => set({ theme, isDark: resolve(theme) === 'dark' }),
      toggleTheme: () => {
        const { theme, setTheme } = get();
        setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);
      },
    }),
    { name: STORAGE_KEY }
  )
);

useThemeStore.subscribe((state) => applyTheme(state.theme));
applyTheme(useThemeStore.getState().theme);

if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia(SYSTEM_QUERY);
  const onSystemChange = () => {
    if (useThemeStore.getState().theme === 'system') {
      applyTheme('system');
      useThemeStore.setState({ isDark: systemPrefersDark() });
    }
  };
  mql.addEventListener('change', onSystemChange);
}
