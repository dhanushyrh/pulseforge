import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerEmbeddingService {
  getHello(): string {
    return 'Hello World!';
  }
}
