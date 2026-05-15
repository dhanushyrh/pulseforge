import { Module } from '@nestjs/common';
import { WorkerSummaryController } from './worker-summary.controller';
import { WorkerSummaryService } from './worker-summary.service';

@Module({
  imports: [],
  controllers: [WorkerSummaryController],
  providers: [WorkerSummaryService],
})
export class WorkerSummaryModule {}
