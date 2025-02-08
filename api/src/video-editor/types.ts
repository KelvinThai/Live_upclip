import { ApiProperty } from '@nestjs/swagger';
import { ViralMomentAnalysis } from '../analyzer-agent/types';

export interface EditVideoRequest {
  videoPath: string;
  moment: ViralMomentAnalysis;
  outputFormat: 'mp4' | 'mov' | 'gif';
  resolution: '1080p' | '720p' | '480p';
  includeCaption: boolean;
  includeHashtags: boolean;
  customDuration?: number;
}

export interface EditVideoResponse {
  outputPath: string;
  duration: number;
  format: string;
  resolution: string;
  fileSize: number;
}

export class EditVideoDto implements EditVideoRequest {
  @ApiProperty()
  videoPath: string;

  @ApiProperty()
  moment: ViralMomentAnalysis;

  @ApiProperty({ enum: ['mp4', 'mov', 'gif'] })
  outputFormat: 'mp4' | 'mov' | 'gif';

  @ApiProperty({ enum: ['1080p', '720p', '480p'] })
  resolution: '1080p' | '720p' | '480p';

  @ApiProperty()
  includeCaption: boolean;

  @ApiProperty()
  includeHashtags: boolean;

  @ApiProperty({ required: false })
  customDuration?: number;
}

export class EditVideoResponseDto implements EditVideoResponse {
  @ApiProperty()
  outputPath: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  format: string;

  @ApiProperty()
  resolution: string;

  @ApiProperty()
  fileSize: number;
}
