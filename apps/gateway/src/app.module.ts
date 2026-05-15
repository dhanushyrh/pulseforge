// apps/gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { DatabaseModule } from '@app/database';
import { QUEUES } from '@app/queue';
import { IngestModule } from './ingest/ingest.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),

    // Register all queues so Bull Board can see them
    BullModule.registerQueue(
      { name: QUEUES.MEDIA },
      { name: QUEUES.TRANSCRIPT },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.SUMMARY },
    ),

    // Bull Board UI at /queues
    BullBoardModule.forRoot({
      route:   '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({ name: QUEUES.MEDIA,      adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.TRANSCRIPT, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.EMBEDDING,  adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.SUMMARY,    adapter: BullMQAdapter }),

    DatabaseModule,
    IngestModule,
    SearchModule,
  ],
})
export class AppModule {}