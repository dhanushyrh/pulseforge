import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  await app.init();
  process.stdin.resume();
  process.on('SIGTERM', async () => { await app.close(); process.exit(0); });
  process.on('SIGINT',  async () => { await app.close(); process.exit(0); });
  console.log('Worker Geocode → listening on queue: geocode');
}
bootstrap();
