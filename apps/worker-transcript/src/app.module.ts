// apps/worker-transcript/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, DB_ENTITIES } from '@app/database';
import { QUEUES } from '@app/queue';
import { TranscriptService } from './transcript.service';
import { TranscriptProcessor } from './transcript.processor';

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
      {
        name: QUEUES.TRANSCRIPT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        },
      },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.SUMMARY },
      { name: QUEUES.INSIGHTS },
    ),
    DatabaseModule,
    TypeOrmModule.forFeature(DB_ENTITIES),
  ],
  providers: [TranscriptService, TranscriptProcessor],
})
export class AppModule {}