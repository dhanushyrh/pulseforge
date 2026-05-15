import { Module } from '@nestjs/common';
import { WorkerEmbeddingController } from './worker-embedding.controller';
import { WorkerEmbeddingService } from './worker-embedding.service';

@Module({
  imports: [],
  controllers: [WorkerEmbeddingController],
  providers: [WorkerEmbeddingService],
})
export class WorkerEmbeddingModule {}
