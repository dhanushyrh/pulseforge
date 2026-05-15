import { Controller, Get } from '@nestjs/common';
import { WorkerEmbeddingService } from './worker-embedding.service';

@Controller()
export class WorkerEmbeddingController {
  constructor(private readonly workerEmbeddingService: WorkerEmbeddingService) {}

  @Get()
  getHello(): string {
    return this.workerEmbeddingService.getHello();
  }
}
