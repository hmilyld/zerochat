import { useLocaleStore } from '@/stores/localeStore';

export default function LocaleToggle() {
  const locale = useLocaleStore(s => s.locale);
  const setLocale = useLocaleStore(s => s.setLocale);
  return (
    <button onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')} className="text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors min-w-[36px]">
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
