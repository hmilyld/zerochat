import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatCrypto } from '@/hooks/useChatCrypto';
import { randomId } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/MessageBubble';
import ImageUploader from '@/components/ImageUploader';
import QRCode from '@/components/QRCode';
import CopyButton from '@/components/CopyButton';
import { ArrowLeft, Send, AlertTriangle, Shield, ImageIcon, X, Loader2, Share2 } from 'lucide-react';
import { useT } from '@/i18n/useT';

export default function ChatRoom() {
  const { t } = useT();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, disconnect } = useWebSocket();
  const connected = useChatStore((s) => s.connected);
  const peerConnected = useChatStore((s) => s.peerConnected);
  const peerPublicKey = useChatStore((s) => s.peerPublicKey);
  const decryptedMessages = useChatStore((s) => s.decryptedMessages);
  const encryptedMessages = useChatStore((s) => s.encryptedMessages);
  const addDecryptedMessage = useChatStore((s) => s.addDecryptedMessage);
  const peerTyping = useChatStore((s) => s.peerTyping);
  const reset = useChatStore((s) => s.reset);
  const storeRoomId = useChatStore((s) => s.roomId);

  const { getExchangeData, getFingerprint, encryptText, encryptImage, decryptMessage, isReady } = useChatCrypto(roomId);

  const [input, setInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [destroyConfirm, setDestroyConfirm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [remoteDestroyed, setRemoteDestroyed] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(3600);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const joinedRef = useRef(false);
  const hadRoomRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  // Connect WebSocket on mount
  useEffect(() => {
    const existing = useChatStore.getState().ws;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    connect();
  }, []);

  // Join room when connected
  useEffect(() => {
    if (connected && roomId && !joinedRef.current) {
      joinedRef.current = true;
      send({ type: 'join-room', roomId });
    }
  }, [connected, roomId]);

  // Watch for remote room destruction (reset via WebSocket handler)
  useEffect(() => {
    if (storeRoomId) {
      hadRoomRef.current = true;
    } else if (hadRoomRef.current) {
      disconnect();
      setRemoteDestroyed(true);
    }
  }, [storeRoomId]);

  // Key exchange: send our key when we know someone is in the room and encryption not ready
  useEffect(() => {
    if (peerConnected && !isReady) {
      const exchangeData = getExchangeData();
      send({
        type: 'exchange-key',
        roomId,
        ...exchangeData,
      });
    }
  }, [peerConnected, peerPublicKey, isReady, roomId]);

  // Decrypt new incoming messages
  useEffect(() => {
    const last = encryptedMessages[encryptedMessages.length - 1];

    if (!last || processedRef.current.has(last.id) || last.fromMe || !isReady) return;

    processedRef.current.add(last.id);

    decryptMessage(last.encryptedData)
      .then((result) => {
        addDecryptedMessage({
          id: last.id,
          ...result,
          fromMe: false,
          timestamp: last.timestamp,
        });
      })
      .catch((err) => {
        console.error('[ChatRoom] decrypt failed:', err);
        processedRef.current.delete(last.id);
      });
  }, [encryptedMessages, isReady, decryptMessage, addDecryptedMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [decryptedMessages]);

  // Typing indicator (debounced)
  useEffect(() => {
    if (!input.trim() || !isReady) return;
    const timer = setTimeout(() => send({ type: 'typing', roomId }), 300);
    return () => clearTimeout(timer);
  }, [input]);

  // Idle countdown timer
  useEffect(() => {
    const IDLE_TIMEOUT = 3600;
    const tick = () => {
      const remaining = IDLE_TIMEOUT - Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(Math.max(0, remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSendText = useCallback(async () => {
    if (!input.trim() || !isReady || encrypting) return;
    setEncrypting(true);
    try {
      const encrypted = await encryptText(input.trim());
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      lastActivityRef.current = Date.now();
      addDecryptedMessage({
        id: randomId(),
        content: input.trim(),
        isImage: false,
        fromMe: true,
        timestamp: Date.now(),
      });
      setInput('');
    } catch (err) {
      console.error('Encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [input, isReady, encrypting, encryptText, roomId, send, addDecryptedMessage]);

  const handleSendImage = useCallback(async (bytes: ArrayBuffer, mimeType: string) => {
    if (!isReady || encrypting) return;
    setEncrypting(true);
    try {
      const caption = input.trim();
      const encrypted = await encryptImage(bytes, mimeType, caption);
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      lastActivityRef.current = Date.now();
      const blob = new Blob([bytes], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      addDecryptedMessage({
        id: randomId(),
        content: caption,
        isImage: true,
        imageUrl,
        fromMe: true,
        timestamp: Date.now(),
      });
      if (caption) setInput('');
      setShowImageUpload(false);
    } catch (err) {
      console.error('Image encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [input, isReady, encrypting, encryptImage, roomId, send, addDecryptedMessage]);

  const handleDestroy = () => {
    send({ type: 'destroy-room', roomId });
    reset();
    navigate('/', { replace: true });
  };

  const fingerprint = getFingerprint();
  const inviteUrl = roomId ? `${window.location.origin}/chat?join=${roomId}` : '';

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => { disconnect(); reset(); navigate('/'); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{t('chat.entryTitle')}</p>
              {roomId && (
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded truncate" title={roomId}>
                  {roomId.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {peerConnected ? (isReady ? t('chat.encrypted') : t('chat.negotiating')) : t('chat.waiting')}
              {isReady && (
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  {t('chat.idle')}: {String(Math.floor(idleSeconds / 60)).padStart(2, '0')}:{String(idleSeconds % 60).padStart(2, '0')}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Shield className="w-3 h-3" />
            {fingerprint}
          </div>
          <Button
            variant="ghost"
            size="icon"
            title={t('chat.invite')}
            onClick={() => setShowInvite(true)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDestroyConfirm(true)}
          >
            {t('chat.destroy')}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 px-1">
        {decryptedMessages.map((msg) =>
          msg.isSystem ? (
            <div key={msg.id} className="flex justify-center mb-3">
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {msg.content}
              </span>
            </div>
          ) : (
            <MessageBubble key={msg.id} message={msg} />
          )
        )}
        {peerTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image upload area */}
      {showImageUpload && (
        <div className="border-t dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('chat.sendImage')}</span>
            <button onClick={() => setShowImageUpload(false)}>
              <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
          <ImageUploader
            onImageReady={(bytes, mimeType) => handleSendImage(bytes, mimeType)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
        <div className="flex items-end gap-2">
          <button
            className="w-11 h-11 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            onClick={() => setShowImageUpload(!showImageUpload)}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder={t('chat.inputPlaceholder')}
            className="flex-1"
            disabled={!isReady || encrypting}
          />
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!input.trim() || !isReady || encrypting}
          >
            {encrypting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Invite dialog */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('chat.invite')}</h3>
              <button onClick={() => setShowInvite(false)}>
                <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 break-all text-sm text-gray-800 dark:text-gray-100 font-mono">
              {roomId}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('chat.inviteDesc')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('chat.sharePreface')}</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 break-all text-xs text-gray-600 dark:text-gray-400 font-mono">
              {inviteUrl}
            </div>
            <div className="flex gap-2">
              <CopyButton text={roomId!} label={t('chat.copyRoomId')} />
              <CopyButton text={inviteUrl} preface={t('chat.sharePreface')} label={t('chat.copyLink')} />
            </div>
            <QRCode url={inviteUrl} />
          </div>
        </div>
      )}

      {/* Remote destroyed dialog */}
      {remoteDestroyed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('chat.roomDestroyed')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('chat.roomDestroyedDesc')}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
              {t('chat.goHome')}
            </Button>
          </div>
        </div>
      )}

      {/* Destroy confirmation dialog */}
      {destroyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('chat.confirmDestroy')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('chat.destroyWarning')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDestroyConfirm(false)}>
                {t('chat.cancel')}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDestroy}>
                {t('chat.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
