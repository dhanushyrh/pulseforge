// apps/worker-media/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, DB_ENTITIES } from '@app/database';
import { QUEUES } from '@app/queue';
import { MediaService } from './media.service';
import { MediaProcessor } from './media.processor';

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
      { name: QUEUES.MEDIA },
      { name: QUEUES.METADATA }, 
    ),
    DatabaseModule,
    TypeOrmModule.forFeature(DB_ENTITIES),
  ],
  providers: [MediaService, MediaProcessor],
})
export class AppModule {}