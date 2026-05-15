import { Controller, Get } from '@nestjs/common';
import { WorkerInsightsService } from './worker-insights.service';

@Controller()
export class WorkerInsightsController {
  constructor(private readonly workerInsightsService: WorkerInsightsService) {}

  @Get()
  getHello(): string {
    return this.workerInsightsService.getHello();
  }
}
