// apps/worker-media/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {});
  await app.init();
  console.log('Worker Media → listening on queue: media');
}
bootstrap();