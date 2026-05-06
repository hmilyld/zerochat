import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, LogIn, Loader2 } from 'lucide-react';

export default function ChatEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomInput, setRoomInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const joinId = searchParams.get('join');
    if (joinId) setRoomInput(joinId);
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/room', { method: 'POST' });
      if (!res.ok) throw new Error('创建失败');
      const { roomId } = await res.json();
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!roomInput.trim()) return;
    setJoining(true);
    setError('');
    const roomId = roomInput.trim();
    try {
      const res = await fetch(`/api/room/${roomId}/join`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '加入失败');
      }
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">加密聊天室</h2>
          <p className="text-xs text-gray-500">端到端加密，阅后即焚</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">创建新房间</h3>
          <p className="text-sm text-gray-500">创建一个加密聊天室，分享房间 ID 给对方</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full gap-2" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? '创建中...' : '创建房间'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-400">或</div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">加入已有房间</h3>
          <Input
            placeholder="输入房间 ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
          />
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={handleJoin}
            disabled={joining || !roomInput.trim()}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {joining ? '加入中...' : '加入房间'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
