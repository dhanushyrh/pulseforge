import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerInsightsService {
  getHello(): string {
    return 'Hello World!';
  }
}
