import { Controller, Get } from '@nestjs/common';
import { WorkerMediaService } from './worker-media.service';

@Controller()
export class WorkerMediaController {
  constructor(private readonly workerMediaService: WorkerMediaService) {}

  @Get()
  getHello(): string {
    return this.workerMediaService.getHello();
  }
}
