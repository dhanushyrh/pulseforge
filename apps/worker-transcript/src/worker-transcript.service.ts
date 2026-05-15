import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerTranscriptService {
  getHello(): string {
    return 'Hello World!';
  }
}
