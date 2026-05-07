import { Routes, Route, Link } from 'react-router-dom';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';
import ChatEntry from './pages/ChatEntry.tsx';
import ChatRoom from './pages/ChatRoom.tsx';
import About from './pages/About.tsx';
import ThemeToggle from './components/ThemeToggle.tsx';
import LocaleToggle from './components/LocaleToggle.tsx';
import { useT } from '@/i18n/useT';
import { Shield } from 'lucide-react';

function Header() {
  const { t } = useT();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-lg md:max-w-xl lg:max-w-2xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">ZeroChat</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/chat" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {t('nav.chat')}
          </Link>
          <Link to="/about" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {t('nav.about')}
          </Link>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 safe-bottom flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg md:max-w-xl lg:max-w-2xl px-4 py-6">
        {children}
      </main>
      <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
        ZeroChat &copy; ZChat.CC {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PageWrapper><CreateMessage /></PageWrapper>} />
      <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
      <Route path="/chat" element={<PageWrapper><ChatEntry /></PageWrapper>} />
      <Route path="/chat/:roomId" element={
        <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 safe-top">
          <div className="mx-auto max-w-lg md:max-w-xl lg:max-w-2xl h-dvh flex flex-col">
            <ChatRoom />
          </div>
        </div>
      } />
      <Route path="/read/:id" element={<PageWrapper><ReadMessage /></PageWrapper>} />
    </Routes>
  );
}
