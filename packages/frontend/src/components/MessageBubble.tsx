import type { DecryptedMessage } from '@/stores/chatStore';

interface Props {
  message: DecryptedMessage;
}

export default function MessageBubble({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          message.fromMe
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm'
        }`}
      >
        {message.isImage ? (
          <img
            src={message.imageUrl}
            alt="Shared"
            className="max-w-full rounded-lg"
            loading="lazy"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <p className={`text-[10px] mt-1 ${message.fromMe ? 'text-blue-200' : 'text-gray-400'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
