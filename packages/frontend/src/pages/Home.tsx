import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, MessageCircle, Shield } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ZeroChat</h1>
        <p className="text-sm text-gray-500">私密通讯，零信任架构</p>
      </div>

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/create')}
      >
        <CardHeader className="flex-row items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-base">一次性消息</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">阅后即焚 · 不可追溯</p>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/chat')}
      >
        <CardHeader className="flex-row items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">加密聊天室</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">端到端加密 · 双向阅后即焚</p>
          </div>
        </CardHeader>
      </Card>

      <p className="text-center text-xs text-gray-400">
        无需注册 · 不收集信息 · 端到端加密
      </p>
    </div>
  );
}
