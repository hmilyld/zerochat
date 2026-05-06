import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decryptAES, base64ToBytes } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

type Status = 'loading' | 'decrypting' | 'success-text' | 'success-image' | 'destroyed' | 'error';

export default function ReadMessage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const keyB64 = window.location.hash.slice(1);
    if (!keyB64 || !id) {
      setStatus('error');
      return;
    }

    let cancelled = false;

    async function fetchAndDecrypt() {
      try {
        const res = await fetch(`/api/message/${id}/read`, { method: 'POST' });
        if (!res.ok) {
          if (!cancelled) setStatus('destroyed');
          return;
        }
        const { ciphertext } = await res.json();
        if (!ciphertext) {
          if (!cancelled) setStatus('destroyed');
          return;
        }

        if (!cancelled) setStatus('decrypting');

        const key = base64ToBytes(keyB64);
        const decrypted = decryptAES(key, ciphertext);

        if (!decrypted) {
          if (!cancelled) setStatus('error');
          return;
        }

        if (!cancelled) {
          const decStr = new TextDecoder().decode(decrypted);

          if (decStr.startsWith('IMAGE:')) {
            const nullIdx = decStr.indexOf('\x00');
            const mimeType = decStr.slice(6, nullIdx);
            const imgBytes = decrypted.slice(nullIdx + 1);
            const blob = new Blob([imgBytes], { type: mimeType });
            setImageUrl(URL.createObjectURL(blob));
            setStatus('success-image');
          } else {
            setContent(decStr);
            setStatus('success-text');
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    fetchAndDecrypt();

    return () => { cancelled = true; };
  }, [id]);

  const stateConfig: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在获取消息...', desc: '' },
    decrypting: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在解密...', desc: '' },
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
