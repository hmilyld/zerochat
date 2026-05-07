import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('REDIS_URL environment variable is required');
  process.exit(1);
}

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  console.log('Redis connected');
}

const DEFAULT_MSG_TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || '3600', 10);
const ROOM_TTL = parseInt(process.env.ROOM_TTL_SECONDS || '3600', 10);
const ROOM_IDLE = parseInt(process.env.ROOM_IDLE_SECONDS || '3600', 10);

export async function storeCiphertext(id: string, ciphertext: string, ttl?: number): Promise<void> {
  await redis.setex(`msg:${id}`, ttl || DEFAULT_MSG_TTL, ciphertext);
}

export async function getAndDeleteCiphertext(id: string): Promise<string | null> {
  const key = `msg:${id}`;
  const val = await redis.get(key);
  if (val) {
    await redis.del(key);
  }
  return val;
}

export async function createRoom(roomId: string): Promise<void> {
  await redis.hset(`room:${roomId}`, {
    members: '0',
    createdAt: Date.now().toString(),
    lastActive: Date.now().toString(),
  });
  await redis.expire(`room:${roomId}`, ROOM_TTL);
}

export async function joinRoom(roomId: string, userId: string): Promise<number> {
  const key = `room:${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return -1;
  const members = await redis.hget(key, 'members');
  const count = parseInt(members || '0', 10);
  if (count >= 2) return -2;
  await redis.hset(key, 'members', (count + 1).toString(), 'lastActive', Date.now().toString());
  // Second person joined → full room, switch to idle-based TTL
  await redis.expire(key, ROOM_IDLE);
  return count + 1;
}

export async function touchRoom(roomId: string): Promise<void> {
  const key = `room:${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return;
  await redis.hset(key, 'lastActive', Date.now().toString());
  await redis.expire(key, ROOM_IDLE);
}

export async function getRoom(roomId: string): Promise<Record<string, string> | null> {
  const key = `room:${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return null;
  return redis.hgetall(key);
}

export async function destroyRoom(roomId: string): Promise<void> {
  await redis.del(`room:${roomId}`);
}
