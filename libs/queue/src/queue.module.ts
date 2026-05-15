import { BullModule } from '@nestjs/bullmq';   
import { DynamicModule } from '@nestjs/common';
import { QUEUES } from './queues.constants';

export class SharedQueueModule {
  static forWorker(queueName: string): DynamicModule {
    return BullModule.registerQueue({ name: queueName });
  }

  static forGateway(): DynamicModule[] {
    return Object.values(QUEUES).map(name =>
      BullModule.registerQueue({ name })
    );
  }
}