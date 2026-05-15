import { Controller, Get } from '@nestjs/common';
import { WorkerSummaryService } from './worker-summary.service';

@Controller()
export class WorkerSummaryController {
  constructor(private readonly workerSummaryService: WorkerSummaryService) {}

  @Get()
  getHello(): string {
    return this.workerSummaryService.getHello();
  }
}
