import { Test, TestingModule } from '@nestjs/testing';
import { VideoEditorController } from './video-editor.controller';

describe('VideoEditorController', () => {
  let controller: VideoEditorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoEditorController],
    }).compile();

    controller = module.get<VideoEditorController>(VideoEditorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
