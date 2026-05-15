import { Test, TestingModule } from '@nestjs/testing';
import { WorkerInsightsController } from './worker-insights.controller';
import { WorkerInsightsService } from './worker-insights.service';

describe('WorkerInsightsController', () => {
  let workerInsightsController: WorkerInsightsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerInsightsController],
      providers: [WorkerInsightsService],
    }).compile();

    workerInsightsController = app.get<WorkerInsightsController>(WorkerInsightsController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workerInsightsController.getHello()).toBe('Hello World!');
    });
  });
});
