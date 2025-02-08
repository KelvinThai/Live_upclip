import { Test, TestingModule } from '@nestjs/testing';
import { VideoEditorService } from './video-editor.service';

describe('VideoEditorService', () => {
  let service: VideoEditorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoEditorService],
    }).compile();

    service = module.get<VideoEditorService>(VideoEditorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
