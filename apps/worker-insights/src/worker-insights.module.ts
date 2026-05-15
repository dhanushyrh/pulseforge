import { Module } from '@nestjs/common';
import { WorkerInsightsController } from './worker-insights.controller';
import { WorkerInsightsService } from './worker-insights.service';

@Module({
  imports: [],
  controllers: [WorkerInsightsController],
  providers: [WorkerInsightsService],
})
export class WorkerInsightsModule {}
