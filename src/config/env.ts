export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  WS_PATH: process.env.WS_PATH ?? '/socket.io',
  CORS_ORIGIN: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : (process.env.NODE_ENV === 'production' 
        ? true // Permite todos los orígenes en producción temporalmente
        : ['http://localhost:3000', 'http://127.0.0.1:3000']
      ),
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  REDIS_URL: process.env.REDIS_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'redis://localhost:6379'),
};
