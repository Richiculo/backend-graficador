import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { env } from '../config/env';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(): Promise<void> {
    try {
      // Si no hay REDIS_URL configurado, no intentar conectar
      if (!env.REDIS_URL) {
        console.log('⚠️ No REDIS_URL configured, WebSocket will work without clustering');
        this.adapterConstructor = null;
        return;
      }

      const pubClient = createClient({ url: env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      console.log('✅ Redis connected successfully for WebSocket adapter');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, WebSocket will work without clustering:', error.message);
      // En caso de no poder conectar a Redis, no configuramos el adapter
      // Esto permite que Socket.IO funcione sin Redis, pero sin clustering
      this.adapterConstructor = null;
    }
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

    // Solo aplicar el adapter de Redis si está disponible
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      console.log('✅ Redis adapter applied to Socket.IO server');
    } else {
      console.log('⚠️ Socket.IO running without Redis adapter (no clustering)');
    }

    return server;
  }
}
