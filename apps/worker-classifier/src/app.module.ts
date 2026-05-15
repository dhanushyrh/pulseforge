// apps/worker-classifier/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, DB_ENTITIES } from '@app/database';
import { QUEUES } from '@app/queue';
import { ClassifierService } from './classifier.service';
import { ClassifierProcessor } from './classifier.processor';

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
      { name: QUEUES.CLASSIFIER },
      { name: QUEUES.TRANSCRIPT },
    ),
    DatabaseModule,
    TypeOrmModule.forFeature(DB_ENTITIES),
  ],
  providers: [ClassifierService, ClassifierProcessor],
})
export class AppModule {}