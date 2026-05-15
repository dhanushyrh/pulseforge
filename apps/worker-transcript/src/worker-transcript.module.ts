import { Module } from '@nestjs/common';
import { WorkerTranscriptController } from './worker-transcript.controller';
import { WorkerTranscriptService } from './worker-transcript.service';

@Module({
  imports: [],
  controllers: [WorkerTranscriptController],
  providers: [WorkerTranscriptService],
})
export class WorkerTranscriptModule {}
