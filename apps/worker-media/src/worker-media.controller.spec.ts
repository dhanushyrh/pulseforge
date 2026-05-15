import { Test, TestingModule } from '@nestjs/testing';
import { WorkerMediaController } from './worker-media.controller';
import { WorkerMediaService } from './worker-media.service';

describe('WorkerMediaController', () => {
  let workerMediaController: WorkerMediaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerMediaController],
      providers: [WorkerMediaService],
    }).compile();

    workerMediaController = app.get<WorkerMediaController>(WorkerMediaController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workerMediaController.getHello()).toBe('Hello World!');
    });
  });
});
