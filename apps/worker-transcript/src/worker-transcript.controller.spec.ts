import { Test, TestingModule } from '@nestjs/testing';
import { WorkerTranscriptController } from './worker-transcript.controller';
import { WorkerTranscriptService } from './worker-transcript.service';

describe('WorkerTranscriptController', () => {
  let workerTranscriptController: WorkerTranscriptController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WorkerTranscriptController],
      providers: [WorkerTranscriptService],
    }).compile();

    workerTranscriptController = app.get<WorkerTranscriptController>(WorkerTranscriptController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(workerTranscriptController.getHello()).toBe('Hello World!');
    });
  });
});
