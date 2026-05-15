import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerMediaService {
  getHello(): string {
    return 'Hello World!';
  }
}
