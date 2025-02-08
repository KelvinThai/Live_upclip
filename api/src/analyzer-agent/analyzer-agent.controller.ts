import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyzerAgentService } from './analyzer-agent.service';
import {
  AnalyzeVideoDto,
  GenerateShortContentDto,
  ViralMomentAnalysis,
  ViralMomentAnalysisResponse,
} from './types';

@ApiTags('Video Analysis')
@Controller('analyzer')
export class AnalyzerAgentController {
  constructor(private readonly analyzerService: AnalyzerAgentService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze video for viral moments' })
  @ApiResponse({
    status: 200,
    description: 'Returns potential viral moments from the video',
    type: [ViralMomentAnalysisResponse],
  })
  async analyzeVideo(
    @Body() dto: AnalyzeVideoDto,
  ): Promise<ViralMomentAnalysis[]> {
    return await this.analyzerService.analyzeVideo(dto.videoPath);
  }

  @Post('generate-short')
  @ApiOperation({ summary: 'Generate short content suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Returns editing suggestions for the specified moment',
    type: String,
  })
  async generateShortContent(
    @Body() dto: GenerateShortContentDto,
  ): Promise<string> {
    return await this.analyzerService.generateShortContent(
      dto.videoPath,
      dto.timestamp,
    );
  }
}
