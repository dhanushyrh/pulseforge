// apps/gateway/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation (class-validator on all DTOs)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger at /api
  const config = new DocumentBuilder()
    .setTitle('PulseForge AI')
    .setDescription('Semantic memory for social content')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.GATEWAY_PORT ?? 3000);
  console.log(`Gateway running → http://localhost:${process.env.GATEWAY_PORT ?? 3000}`);
  console.log(`Swagger docs   → http://localhost:${process.env.GATEWAY_PORT ?? 3000}/api`);
}
bootstrap();