import { useLocaleStore } from '@/stores/localeStore';
import { translations } from './translations';

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const t = (key: string): string => translations[locale]?.[key] ?? key;
  return { t };
}
