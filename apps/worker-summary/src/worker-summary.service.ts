import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerSummaryService {
  getHello(): string {
    return 'Hello World!';
  }
}
