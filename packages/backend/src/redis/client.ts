import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const r = getRedis();
  await r.connect();
  console.log('Redis connected');
}

const DEFAULT_MSG_TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || '3600', 10);
const ROOM_TTL = parseInt(process.env.ROOM_TTL_SECONDS || '3600', 10);
const ROOM_IDLE = parseInt(process.env.ROOM_IDLE_SECONDS || '3600', 10);

export async function storeCiphertext(id: string, ciphertext: string, ttl?: number): Promise<void> {
  await getRedis().setex(`msg:${id}`, ttl || DEFAULT_MSG_TTL, ciphertext);
}

export async function getAndDeleteCiphertext(id: string): Promise<string | null> {
  const r = getRedis();
  const key = `msg:${id}`;
  const val = await r.get(key);
  if (val) {
    await r.del(key);
  }
  return val;
}

export async function createRoom(roomId: string): Promise<void> {
  const r = getRedis();
  await r.hset(`room:${roomId}`, {
    members: '0',
    createdAt: Date.now().toString(),
    lastActive: Date.now().toString(),
  });
  await r.expire(`room:${roomId}`, ROOM_TTL);
}

export async function joinRoom(roomId: string, _userId: string): Promise<number> {
  const r = getRedis();
  const key = `room:${roomId}`;
  const exists = await r.exists(key);
  if (!exists) return -1;
  const members = await r.hget(key, 'members');
  const count = parseInt(members || '0', 10);
  if (count >= 2) return -2;
  await r.hset(key, 'members', (count + 1).toString(), 'lastActive', Date.now().toString());
  await r.expire(key, ROOM_IDLE);
  return count + 1;
}

export async function touchRoom(roomId: string): Promise<void> {
  const r = getRedis();
  const key = `room:${roomId}`;
  const exists = await r.exists(key);
  if (!exists) return;
  await r.hset(key, 'lastActive', Date.now().toString());
  await r.expire(key, ROOM_IDLE);
}

export async function getRoom(roomId: string): Promise<Record<string, string> | null> {
  const r = getRedis();
  const key = `room:${roomId}`;
  const exists = await r.exists(key);
  if (!exists) return null;
  return r.hgetall(key);
}

export async function destroyRoom(roomId: string): Promise<void> {
  const r = getRedis();
  const key = `room:${roomId}`;
  await r.del(key);
}
