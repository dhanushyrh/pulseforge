// apps/gateway/src/ingest/ingest.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Job } from '@app/database';
import { QUEUES } from '@app/queue';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    BullModule.registerQueue({ name: QUEUES.MEDIA }),
  ],
  controllers: [IngestController],
  providers:   [IngestService],
})
export class IngestModule {}