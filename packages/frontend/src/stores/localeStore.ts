import { create } from 'zustand';

type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'ru';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('locale') as Locale) || 'en';
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
