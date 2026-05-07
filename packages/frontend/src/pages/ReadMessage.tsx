import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decryptAES, base64ToBytes, derivePasswordKey } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { findNull } from '@/lib/utils';

type Status = 'loading' | 'need-password' | 'verifying-password' | 'decrypting' | 'success-text' | 'success-image' | 'destroyed' | 'error';

export default function ReadMessage() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [ciphertext, setCiphertext] = useState<string | null>(null);
  const [fragmentData, setFragmentData] = useState<{ salt?: string; wrappedKey?: string; keyB64?: string }>({});

  // Parse fragment on mount
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment || !id) {
      setStatus('error');
      return;
    }

    if (fragment.includes(':')) {
      const [saltPart, wrappedPart] = fragment.split(':');
      setFragmentData({ salt: saltPart, wrappedKey: wrappedPart });
    } else {
      setFragmentData({ keyB64: fragment });
    }
  }, [id]);

  // Fetch and decrypt
  useEffect(() => {
    if (!id) return;
    const fragment = window.location.hash.slice(1);
    if (!fragment) { setStatus('error'); return; }

    let cancelled = false;

    async function doFetch() {
      try {
        const res = await fetch(`/api/message/${id}/read`, { method: 'POST' });
        if (cancelled) return;
        if (!res.ok) { setStatus('destroyed'); return; }
        const data = await res.json();
        if (!data.ciphertext) { setStatus('destroyed'); return; }
        if (cancelled) return;

        setCiphertext(data.ciphertext);

        if (fragment.includes(':')) {
          setStatus('need-password');
        } else {
          const key = base64ToBytes(fragment);
          const decrypted = decryptAES(key, data.ciphertext);
          if (!decrypted) { setStatus('error'); return; }
          showDecrypted(decrypted);
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    // Defer so Strict Mode unmount clears timer before fetch fires
    const timer = setTimeout(doFetch, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  function showDecrypted(decrypted: Uint8Array) {
    const header = new TextDecoder().decode(decrypted.slice(0, Math.min(30, decrypted.length)));

    if (header.startsWith('IMAGE_TEXT:')) {
      const mimeEnd = findNull(decrypted, 11);
      const mimeType = new TextDecoder().decode(decrypted.slice(11, mimeEnd));
      const imgLen = new DataView(decrypted.buffer, decrypted.byteOffset + mimeEnd + 1, 4).getUint32(0);
      const imgStart = mimeEnd + 5;
      const imgEnd = imgStart + imgLen;
      const imgBytes = decrypted.slice(imgStart, imgEnd);
      const caption = new TextDecoder().decode(decrypted.slice(imgEnd));
      const blob = new Blob([imgBytes], { type: mimeType });
      setImageUrl(URL.createObjectURL(blob));
      setContent(caption);
      setStatus('success-image');
    } else if (header.startsWith('IMAGE:')) {
      const mimeEnd = findNull(decrypted, 6);
      const mimeType = new TextDecoder().decode(decrypted.slice(6, mimeEnd));
      const imgBytes = decrypted.slice(mimeEnd + 1);
      const blob = new Blob([imgBytes], { type: mimeType });
      setImageUrl(URL.createObjectURL(blob));
      setStatus('success-image');
    } else {
      setContent(new TextDecoder().decode(decrypted));
      setStatus('success-text');
    }
  }

  function handlePasswordVerify() {
    if (!password.trim() || !ciphertext || !fragmentData.salt || !fragmentData.wrappedKey) return;
    setPasswordError('');
    setStatus('verifying-password');

    try {
      const salt = base64ToBytes(fragmentData.salt);
      const wrapKey = derivePasswordKey(password, salt);

      const messageKey = decryptAES(wrapKey, fragmentData.wrappedKey);
      if (!messageKey) {
        setPasswordError(t('read.passwordError'));
        setStatus('need-password');
        return;
      }

      const decrypted = decryptAES(messageKey, ciphertext);
      if (!decrypted) {
        setPasswordError(t('read.passwordError'));
        setStatus('need-password');
        return;
      }

      showDecrypted(decrypted);
    } catch {
      setPasswordError(t('read.passwordError'));
      setStatus('need-password');
    }
  }

  const stateConfig: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: t('read.loading'), desc: '' },
    decrypting: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: t('read.decrypting'), desc: '' },
    'need-password': { icon: <Lock className="w-10 h-10 text-blue-500" />, title: t('read.needPassword'), desc: t('read.passwordDesc') },
    'verifying-password': { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: t('read.verifying'), desc: '' },
    'success-text': { icon: null, title: '', desc: '' },
    'success-image': { icon: null, title: '', desc: '' },
    destroyed: {
      icon: <AlertTriangle className="w-10 h-10 text-orange-500" />,
      title: t('read.destroyedTitle'),
      desc: t('read.destroyedDesc'),
    },
    error: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: t('read.errorTitle'),
      desc: t('read.errorDesc'),
    },
  };

  const config = stateConfig[status];

  if (status === 'success-text') {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {t('read.destroyedBanner')}
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> {t('read.back')}
        </Button>
      </div>
    );
  }

  if (status === 'success-image') {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 overflow-hidden shadow-sm">
          <img src={imageUrl} alt="Decrypted" className="w-full" />
        </div>
        {content && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{content}</p>
          </div>
        )}
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {t('read.destroyedBanner')}
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> {t('read.back')}
        </Button>
      </div>
    );
  }

  if (status === 'need-password' || status === 'verifying-password') {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <Lock className="w-12 h-12 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('read.needPassword')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('read.passwordDesc')}</p>

        <div className="w-full max-w-xs space-y-3">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('read.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordVerify(); }}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{passwordError}</p>
          )}
          <Button
            className="w-full"
            onClick={handlePasswordVerify}
            disabled={status === 'verifying-password' || !password.trim()}
          >
            {status === 'verifying-password' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('read.verifyPassword')}
          </Button>
        </div>

        <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> {t('read.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      {config.icon}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{config.title}</h2>
      {config.desc && <p className="text-sm text-gray-500 dark:text-gray-400">{config.desc}</p>}
      <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4" /> {t('read.back')}
      </Button>
    </div>
  );
}
