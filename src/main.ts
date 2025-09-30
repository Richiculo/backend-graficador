import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { env } from './config/env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedisIoAdapter } from './common/websocket.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Graficador API')
    .setDescription('API del diagramador (Ciclo 1–2)')
    .setVersion('1.0.0')
    .addBearerAuth() // JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  app.enableCors({
  origin: 'http://localhost:3000',
  methods: 'GET,POST,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
})
  app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
app.use((req, _res, next) => {
  // 👇 te imprime TODO lo que entra al backend
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
  const redisAdapter = new RedisIoAdapter(app as any);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);
  
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
