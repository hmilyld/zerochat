import { Routes, Route, Link } from 'react-router-dom';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';
import ChatEntry from './pages/ChatEntry.tsx';
import ChatRoom from './pages/ChatRoom.tsx';
import About from './pages/About.tsx';
import ThemeToggle from './components/ThemeToggle.tsx';
import LocaleToggle from './components/LocaleToggle.tsx';
import { useT } from '@/i18n/useT';

function PageWrapper({ children }: { children: React.ReactNode }) {
  const { t } = useT();

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 safe-top safe-bottom">
      <main className="mx-auto max-w-lg md:max-w-xl lg:max-w-2xl px-4 py-6">
        {children}

        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <Link to="/about">{t('nav.about')}</Link>
          <ThemeToggle />
          <LocaleToggle />
        </div>
      </main>
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
