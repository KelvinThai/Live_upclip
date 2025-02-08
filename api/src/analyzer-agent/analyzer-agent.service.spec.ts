import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerAgentService } from './analyzer-agent.service';

describe('AnalyzerAgentService', () => {
  let service: AnalyzerAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyzerAgentService],
    }).compile();

    service = module.get<AnalyzerAgentService>(AnalyzerAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
