import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectRedis } from './redis/client.ts';
import { messageRouter } from './api/message.ts';
import { roomRouter } from './api/room.ts';
import { setupWebSocket } from './websocket/server.ts';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // CSP belongs on frontend nginx, not JSON API
}));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// Rate limiting for read-and-destroy (both GET and POST variants)
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip || 'unknown',
});
app.use('/api/message/:id', readLimiter);

// Global rate limit for message/room creation
const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip || 'unknown',
});
app.use('/api/message', createLimiter);
app.use('/api/room', createLimiter);

app.use(roomRouter);
app.use(messageRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = createServer(app);
setupWebSocket(server);

async function start() {
  await connectRedis();
  server.listen(PORT, () => {
    console.log('ZeroChat backend running on http://localhost:' + PORT);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
