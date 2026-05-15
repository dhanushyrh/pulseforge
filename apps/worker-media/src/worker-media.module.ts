import { Module } from '@nestjs/common';
import { WorkerMediaController } from './worker-media.controller';
import { WorkerMediaService } from './worker-media.service';

@Module({
  imports: [],
  controllers: [WorkerMediaController],
  providers: [WorkerMediaService],
})
export class WorkerMediaModule {}
