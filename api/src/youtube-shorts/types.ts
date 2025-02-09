import { ApiProperty } from '@nestjs/swagger';

export interface UploadYouTubeShortsRequest {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  isPrivate?: boolean;
}

export class UploadYouTubeShortsDto implements UploadYouTubeShortsRequest {
  @ApiProperty()
  videoPath: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ required: false, default: false })
  isPrivate?: boolean;
}

export interface UploadYouTubeShortsResponse {
  videoId: string;
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: string;
}

export class UploadYouTubeShortsResponseDto
  implements UploadYouTubeShortsResponse
{
  @ApiProperty()
  videoId: string;

  @ApiProperty()
  videoUrl: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  privacyStatus: string;
}
