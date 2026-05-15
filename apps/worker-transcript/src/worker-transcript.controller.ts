import { Controller, Get } from '@nestjs/common';
import { WorkerTranscriptService } from './worker-transcript.service';

@Controller()
export class WorkerTranscriptController {
  constructor(private readonly workerTranscriptService: WorkerTranscriptService) {}

  @Get()
  getHello(): string {
    return this.workerTranscriptService.getHello();
  }
}
