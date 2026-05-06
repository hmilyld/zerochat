import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Redis } from "ioredis";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const redis = new Redis();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.on("message", (data) => {
    console.log("received:", data.toString());
  });
  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

export { app, server, wss, redis };
