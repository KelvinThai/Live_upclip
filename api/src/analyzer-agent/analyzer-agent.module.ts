import { Module } from '@nestjs/common';
import { AnalyzerAgentService } from './analyzer-agent.service';
import { AnalyzerAgentController } from './analyzer-agent.controller';

@Module({
  providers: [AnalyzerAgentService],
  controllers: [AnalyzerAgentController],
})
export class AnalyzerAgentModule {}
