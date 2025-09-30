import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { env } from '../config/env';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const cors = {
      origin: env.CORS_ORIGIN,
      credentials: true,
    };
    const path = env.WS_PATH;

    const server = super.createIOServer(port, {
      ...options,
      cors,
      path,
      transports: ['websocket'], // puro WS para editor
    });

    if (!this.adapterConstructor) {
      throw new Error('Redis adapter is not initialized. Call connectToRedis() first.');
    }
    server.adapter(this.adapterConstructor);

    return server;
  }
}
