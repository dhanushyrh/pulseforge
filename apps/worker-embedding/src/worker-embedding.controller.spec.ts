import { Test, TestingModule } from '@nestjs/testing';
import { WorkerEmbeddingController } from './worker-embedding.controller';
import { WorkerEmbeddingService } from './worker-embedding.service';

describe('WorkerEmbeddingController', () => {
  let workerEmbeddingController: WorkerEmbeddingController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerEmbeddingController],
      providers: [WorkerEmbeddingService],
    }).compile();

    workerEmbeddingController = app.get<WorkerEmbeddingController>(WorkerEmbeddingController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workerEmbeddingController.getHello()).toBe('Hello World!');
    });
  });
});
