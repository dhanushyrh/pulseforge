// apps/worker-transcript/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {});
  await app.init();
  console.log('Worker Transcript → listening on queue: transcript');
}
bootstrap();