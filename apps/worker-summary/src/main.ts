// apps/worker-summary/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  await app.init();

  // Keep the process alive — BullMQ workers need the event loop running
  process.stdin.resume();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Worker Summary → shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Worker Summary → shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  console.log('Worker Summary → listening on queue: summary');
}
bootstrap();