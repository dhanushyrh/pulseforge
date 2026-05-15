// apps/worker-embedding/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {});
  await app.init();
  console.log('Worker Embedding → listening on queue: embedding');
}
bootstrap();