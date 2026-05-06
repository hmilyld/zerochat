import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Flame, EyeOff } from 'lucide-react';
import { useT } from '@/i18n/useT';

export default function About() {
  const { t } = useT();

  const features = [
    { icon: Shield, key: 'zeroTrust', descKey: 'zeroTrustDesc' },
    { icon: Lock, key: 'e2e', descKey: 'e2eDesc' },
    { icon: Flame, key: 'burnAfter', descKey: 'burnAfterDesc' },
    { icon: EyeOff, key: 'noTracking', descKey: 'noTrackingDesc' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('about.title')}</h2>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('about.intro')}</p>

      <div className="grid gap-4">
        {features.map(({ icon: Icon, key, descKey }) => (
          <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-5 flex gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-200" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{t(`about.${key}`)}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(`about.${descKey}`)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-5">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('about.technical')}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-mono">{t('about.technicalDesc')}</p>
      </div>
    </div>
  );
}
