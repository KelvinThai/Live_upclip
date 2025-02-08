import { ApiProperty } from '@nestjs/swagger';

export interface ViralMomentAnalysis {
  timestamp: string;
  startTime: string;
  endTime: string;
  duration: string;
  description: string;
  viralPotential: number;
  suggestedTitle: string;
  suggestedHashtags: string[];
}

export class ViralMomentAnalysisResponse implements ViralMomentAnalysis {
  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  duration: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  viralPotential: number;

  @ApiProperty()
  suggestedTitle: string;

  @ApiProperty({ type: [String] })
  suggestedHashtags: string[];
}

export interface AnalyzeVideoDto {
  videoPath: string;
}

export interface GenerateShortContentDto {
  videoPath: string;
  timestamp: string;
}

export class AnalyzeVideoDto {
  @ApiProperty()
  videoPath: string;
}

export class GenerateShortContentDto {
  @ApiProperty()
  videoPath: string;

  @ApiProperty()
  timestamp: string;
}
