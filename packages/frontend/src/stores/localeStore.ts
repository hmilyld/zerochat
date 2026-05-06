import { create } from 'zustand';

type Locale = 'zh' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  return (localStorage.getItem('locale') as Locale) || 'zh';
}

function storeLocale(l: Locale) {
  localStorage.setItem('locale', l);
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (l) => {
    storeLocale(l);
    set({ locale: l });
  },
}));
