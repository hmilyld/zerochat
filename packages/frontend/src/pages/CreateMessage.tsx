import { useState } from 'react';
import { encryptAES, randomBytes, bytesToBase64, derivePasswordKey } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ImageUploader from '@/components/ImageUploader';
import QRCode from '@/components/QRCode';
import CopyButton from '@/components/CopyButton';
import { ArrowLeft, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/i18n/useT';

export default function CreateMessage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imageType, setImageType] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; hasPassword: boolean } | null>(null);
  const [error, setError] = useState('');

  const hasContent = text.trim() || imageBytes;

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const key = randomBytes(32);
      let plaintext: Uint8Array;

      if (imageBytes) {
        const hasText = !!text.trim();
        const prefix = new TextEncoder().encode(
          (hasText ? 'IMAGE_TEXT:' : 'IMAGE:') + imageType + '\x00'
        );
        const imgArr = new Uint8Array(imageBytes);

        if (hasText) {
          const lenBuf = new Uint8Array(4);
          new DataView(lenBuf.buffer).setUint32(0, imgArr.length);
          const textBytes = new TextEncoder().encode(text.trim());
          const total = prefix.length + 4 + imgArr.length + textBytes.length;
          const combined = new Uint8Array(total);
          let off = 0;
          combined.set(prefix, off); off += prefix.length;
          combined.set(lenBuf, off); off += 4;
          combined.set(imgArr, off); off += imgArr.length;
          combined.set(textBytes, off);
          plaintext = combined;
        } else {
          const combined = new Uint8Array(prefix.length + imgArr.length);
          combined.set(prefix);
          combined.set(imgArr, prefix.length);
          plaintext = combined;
        }
      } else {
        plaintext = new TextEncoder().encode(text.trim());
      }

      const encrypted = encryptAES(key, plaintext);

      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext: encrypted }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }

      const { id } = await res.json();

      let url: string;
      if (password) {
        const salt = randomBytes(16);
        const wrapKey = derivePasswordKey(password, salt);
        const wrappedKey = encryptAES(wrapKey, key);
        const fragment = bytesToBase64(salt) + ':' + wrappedKey;
        url = `${window.location.origin}/read/${id}#${fragment}`;
      } else {
        url = `${window.location.origin}/read/${id}#${bytesToBase64(key)}`;
      }

      setResult({ url, hasPassword: !!password });
    } catch (err: any) {
      setError(err.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setText('');
    setImageBytes(null);
    setPassword('');
    setResult(null);
    setError('');
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-green-600 dark:text-green-200" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('create.resultTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {result.hasPassword
              ? t('create.resultDescPwd')
              : t('create.resultDesc')}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 break-all text-sm text-gray-800 dark:text-gray-100 font-mono">
              {result.url}
            </div>
            <div className="flex gap-2">
              <CopyButton text={result.url} />
              <Button variant="outline" onClick={handleReset}>{t('create.another')}</Button>
            </div>
          </CardContent>
        </Card>

        <QRCode url={result.url} />

        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
          {t('create.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('create.title')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('create.subtitle')}</p>
        </div>
      </div>

      <Textarea
        placeholder={t('create.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="text-center text-sm text-gray-400 dark:text-gray-500">{t('create.orImage')}</div>

      <ImageUploader
        onImageReady={(bytes, mimeType) => {
          setImageBytes(bytes);
          setImageType(mimeType);
        }}
        onClear={() => {
          setImageBytes(null);
          setImageType('');
        }}
      />

      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('create.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!hasContent || loading}
        onClick={handleSubmit}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('create.submit')}
      </Button>
    </div>
  );
}
