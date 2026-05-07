import { useLocaleStore } from '@/stores/localeStore';

const languages: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ru', label: 'Русский' },
];

export default function LocaleToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as typeof locale)}
      className="text-xs font-medium px-2 py-1 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border-0 outline-none appearance-none"
    >
      {languages.map((lang) => (
        <option key={lang.value} value={lang.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {lang.label}
        </option>
      ))}
    </select>
  );
}
