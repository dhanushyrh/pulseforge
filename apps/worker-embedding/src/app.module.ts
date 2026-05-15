// apps/worker-embedding/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, DB_ENTITIES } from '@app/database';
import { QUEUES } from '@app/queue';
import { EmbeddingService } from './embedding.service';
import { EmbeddingProcessor } from './embedding.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.EMBEDDING },
    ),
    DatabaseModule,
    TypeOrmModule.forFeature(DB_ENTITIES),
  ],
  providers: [EmbeddingService, EmbeddingProcessor],
})
export class AppModule {}