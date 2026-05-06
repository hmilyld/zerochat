import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
