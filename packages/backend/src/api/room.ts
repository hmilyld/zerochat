import { Router, Request, Response } from 'express';
import { randomBase64Url } from '@zerochat/shared';
import { createRoom as redisCreateRoom, joinRoom } from '../redis/client.ts';

export const roomRouter = Router();

roomRouter.post('/api/room', async (_req: Request, res: Response) => {
  try {
    const roomId = randomBase64Url(16);
    await redisCreateRoom(roomId);
    res.json({ roomId });
  } catch (err) {
    console.error('POST /api/room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

roomRouter.post('/api/room/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.length > 64) {
      res.status(400).json({ error: 'Invalid room id' });
      return;
    }

    const result = await joinRoom(id, 'check');
    if (result === -1) {
      res.status(404).json({ error: '房间不存在或已过期' });
      return;
    }
    if (result === -2) {
      res.status(403).json({ error: '房间已满' });
      return;
    }
    res.json({ roomId: id });
  } catch (err) {
    console.error('POST /api/room/:id/join error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
