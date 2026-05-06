import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';
import ChatEntry from './pages/ChatEntry.tsx';
import ChatRoom from './pages/ChatRoom.tsx';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg md:max-w-xl lg:max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
      <Route path="/create" element={<PageWrapper><CreateMessage /></PageWrapper>} />
      <Route path="/read/:id" element={<PageWrapper><ReadMessage /></PageWrapper>} />
      <Route path="/chat" element={<PageWrapper><ChatEntry /></PageWrapper>} />
      <Route path="/chat/:roomId" element={
        <div className="min-h-screen bg-gray-50 safe-top">
          <div className="mx-auto max-w-lg md:max-w-xl lg:max-w-2xl h-screen flex flex-col">
            <ChatRoom />
          </div>
        </div>
      } />
    </Routes>
  );
}
