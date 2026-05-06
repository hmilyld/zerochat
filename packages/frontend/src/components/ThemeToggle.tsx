import { useThemeStore } from '@/stores/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const next: Record<string, { icon: typeof Sun; next: 'light' | 'dark' | 'system' }> = {
    light: { icon: Sun, next: 'dark' },
    dark: { icon: Moon, next: 'system' },
    system: { icon: Monitor, next: 'light' },
  };
  const { icon: Icon, next: nextTheme } = next[theme];

  return (
    <button onClick={() => setTheme(nextTheme)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors" title={theme}>
      <Icon className="w-4 h-4" />
    </button>
  );
}
