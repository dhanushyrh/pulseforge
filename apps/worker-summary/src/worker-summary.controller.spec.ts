import { Test, TestingModule } from '@nestjs/testing';
import { WorkerSummaryController } from './worker-summary.controller';
import { WorkerSummaryService } from './worker-summary.service';

describe('WorkerSummaryController', () => {
  let workerSummaryController: WorkerSummaryController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerSummaryController],
      providers: [WorkerSummaryService],
    }).compile();

    workerSummaryController = app.get<WorkerSummaryController>(WorkerSummaryController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workerSummaryController.getHello()).toBe('Hello World!');
    });
  });
});
