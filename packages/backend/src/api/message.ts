import { Router, Request, Response } from 'express';
import { randomBase64Url } from '@zerochat/shared';
import { storeCiphertext, getAndDeleteCiphertext } from '../redis/client.ts';

export const messageRouter = Router();

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

messageRouter.post('/api/message', async (req: Request, res: Response) => {
  try {
    const { ciphertext, ttl } = req.body as { ciphertext: string; ttl?: number };

    if (!ciphertext || typeof ciphertext !== 'string') {
      res.status(400).json({ error: 'Missing ciphertext' });
      return;
    }

    if (ciphertext.length > MAX_BODY_SIZE) {
      res.status(413).json({ error: 'Message too large' });
      return;
    }

    const id = randomBase64Url(16);
    await storeCiphertext(id, ciphertext, ttl);
    res.json({ id });
  } catch (err) {
    console.error('POST /api/message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

messageRouter.get('/api/message/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.length > 64) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const ciphertext = await getAndDeleteCiphertext(id);
    if (!ciphertext) {
      res.status(404).json({ error: '消息已销毁或链接无效' });
      return;
    }

    res.json({ ciphertext });
  } catch (err) {
    console.error('GET /api/message/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
