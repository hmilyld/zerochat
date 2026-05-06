import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decryptAES, base64ToBytes, derivePasswordKey } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';

type Status = 'loading' | 'need-password' | 'verifying-password' | 'decrypting' | 'success-text' | 'success-image' | 'destroyed' | 'error';

export default function ReadMessage() {
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

    async function fetchCiphertext() {
      try {
        const res = await fetch(`/api/message/${id}/read`, { method: 'POST' });
        if (!res.ok) {
          if (!cancelled) setStatus('destroyed');
          return;
        }
        const data = await res.json();
        if (!data.ciphertext) {
          if (!cancelled) setStatus('destroyed');
          return;
        }

        if (!cancelled) {
          setCiphertext(data.ciphertext);

          if (fragment.includes(':')) {
            setStatus('need-password');
          } else {
            setStatus('decrypting');
            // Non-password: fragment IS the key
            const key = base64ToBytes(fragment);
            const decrypted = decryptAES(key, data.ciphertext);
            if (!decrypted) { setStatus('error'); return; }
            showDecrypted(decrypted);
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    fetchCiphertext();
    return () => { cancelled = true; };
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

      // The wrappedKey in the fragment is: encryptAES(wrapKey, messageKey)
      // We need to decrypt it to get the messageKey
      const messageKey = decryptAES(wrapKey, fragmentData.wrappedKey);
      if (!messageKey) {
        setPasswordError('密码错误');
        setStatus('need-password');
        return;
      }

      // Now decrypt the ciphertext with the messageKey
      const decrypted = decryptAES(messageKey, ciphertext);
      if (!decrypted) {
        setPasswordError('密码错误');
        setStatus('need-password');
        return;
      }

      showDecrypted(decrypted);
    } catch {
      setPasswordError('密码错误');
      setStatus('need-password');
    }
  }

  const stateConfig: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在获取消息...', desc: '' },
    decrypting: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在解密...', desc: '' },
    'need-password': { icon: <Lock className="w-10 h-10 text-blue-500" />, title: '需要密码', desc: '此消息已设置访问密码' },
    'verifying-password': { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '验证密码...', desc: '' },
    'success-text': { icon: null, title: '', desc: '' },
    'success-image': { icon: null, title: '', desc: '' },
    destroyed: {
      icon: <AlertTriangle className="w-10 h-10 text-orange-500" />,
      title: '消息已销毁',
      desc: '该消息已被查看或链接已过期',
    },
    error: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: '解密失败',
      desc: '密钥不正确或消息数据损坏',
    },
  };

  const config = stateConfig[status];

  if (status === 'success-text') {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <p className="text-gray-900 whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          此消息已被销毁，关闭页面后将无法再次查看
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Button>
      </div>
    );
  }

  if (status === 'success-image') {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <img src={imageUrl} alt="Decrypted" className="w-full" />
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          此消息已被销毁，关闭页面后将无法再次查看
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Button>
      </div>
    );
  }

  if (status === 'need-password' || status === 'verifying-password') {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <Lock className="w-12 h-12 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">需要密码</h2>
        <p className="text-sm text-gray-500">此消息已设置访问密码，请输入密码查看</p>

        <div className="w-full max-w-xs space-y-3">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="输入访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordVerify(); }}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-sm text-red-600 text-center">{passwordError}</p>
          )}
          <Button
            className="w-full"
            onClick={handlePasswordVerify}
            disabled={status === 'verifying-password' || !password.trim()}
          >
            {status === 'verifying-password' ? <Loader2 className="w-4 h-4 animate-spin" /> : '解密查看'}
          </Button>
        </div>

        <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      {config.icon}
      <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
      {config.desc && <p className="text-sm text-gray-500">{config.desc}</p>}
      <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Button>
    </div>
  );
}

function findNull(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] === 0) return i;
  }
  return bytes.length;
}
