import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  constructor() {
    try {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        connectTimeout: 3000,
        retryStrategy(times) {
          if (times > 1) return null;
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('Redis connected');
      });
      this.client.on('error', () => {
        this.connected = false;
      });
    } catch {
      this.logger.warn('Redis not available, running without cache');
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      try {
        await this.client.quit();
      } catch {}
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected || !this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.connected || !this.client) return;
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.connected || !this.client) return 0;
    return this.client.incr(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.expire(key, ttl);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) return null;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheSet(key: string, value: any, ttl = 300): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async cacheDel(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.del(key);
  }

  async addToBlacklist(token: string, ttl: number): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.set(`blacklist:${token}`, '1', 'EX', ttl);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;
    const result = await this.client.get(`blacklist:${token}`);
    return result === '1';
  }

  async ping(): Promise<boolean> {
    if (!this.connected || !this.client) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
