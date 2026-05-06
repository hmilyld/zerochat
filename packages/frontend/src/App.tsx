import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateMessage />} />
          <Route path="/read/:id" element={<ReadMessage />} />
        </Routes>
      </main>
    </div>
  );
}
