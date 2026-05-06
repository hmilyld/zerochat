import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectRedis } from './redis/client.ts';
import { messageRouter } from './api/message.ts';
import { setupWebSocket } from './websocket/server.ts';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
    },
  },
}));

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip || 'unknown',
});
app.use('/api/message/:id', readLimiter);

app.use(messageRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = createServer(app);
setupWebSocket(server);

async function start() {
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`ZeroChat backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
