import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, LogIn, Loader2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatStore } from '@/stores/chatStore';

export default function ChatEntry() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const { connect } = useWebSocket();

  async function handleCreate() {
    setCreating(true);
    setJoinError('');
    connect();

    const waitForState = () => new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        const s = useChatStore.getState();
        if (s.connected) {
          clearInterval(check);
          s.ws!.send(JSON.stringify({ type: 'create-room' }));
          const checkRoom = setInterval(() => {
            const st = useChatStore.getState();
            if (st.roomId && st.userId) {
              clearInterval(checkRoom);
              resolve();
            }
          }, 100);
        }
        if (Date.now() - start > 10000) {
          clearInterval(check);
          reject(new Error('创建房间超时'));
        }
      }, 100);
    });

    try {
      await waitForState();
      const roomId = useChatStore.getState().roomId;
      setCreating(false);
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setCreating(false);
      setJoinError(err.message);
    }
  }

  async function handleJoin() {
    if (!roomInput.trim()) return;
    setJoining(true);
    setJoinError('');
    connect();

    const roomId = roomInput.trim();
    const waitForState = () => new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        const s = useChatStore.getState();
        if (s.connected) {
          clearInterval(check);
          s.ws!.send(JSON.stringify({ type: 'join-room', roomId }));
          const checkJoin = setInterval(() => {
            const st = useChatStore.getState();
            if (st.roomId) {
              clearInterval(checkJoin);
              resolve();
            }
            if (st.error) {
              clearInterval(checkJoin);
              reject(new Error(st.error));
            }
          }, 100);
        }
        if (Date.now() - start > 10000) {
          clearInterval(check);
          reject(new Error('加入房间超时'));
        }
      }, 100);
    });

    try {
      await waitForState();
      setJoining(false);
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setJoining(false);
      setJoinError(err.message);
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
          {joinError && (
            <p className="text-sm text-red-600">{joinError}</p>
          )}
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
