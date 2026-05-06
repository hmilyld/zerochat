import { useLocaleStore } from '@/stores/localeStore';
import { translations } from './translations';

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key: string): string => translations[locale]?.[key] ?? key;
}
