import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { YouTubeShortsService } from './youtube-shorts.service';
import {
  UploadYouTubeShortsDto,
  UploadYouTubeShortsResponseDto,
} from './types';

@ApiTags('YouTube Shorts')
@Controller('youtube-shorts')
export class YouTubeShortsController {
  constructor(private readonly youtubeShortsService: YouTubeShortsService) {}

  @Get('auth')
  @ApiOperation({ summary: 'Get YouTube authentication URL' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authentication URL',
    type: String,
  })
  getAuthUrl(): string {
    return this.youtubeShortsService.getAuthUrl();
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle YouTube OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Returns the refresh token',
    type: String,
  })
  async handleCallback(@Query('code') code: string): Promise<string> {
    return await this.youtubeShortsService.handleCallback(code);
  }

  @Post('set-token')
  @ApiOperation({ summary: 'Set YouTube refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token set successfully',
  })
  setRefreshToken(@Body('refreshToken') refreshToken: string): void {
    this.youtubeShortsService.setRefreshToken(refreshToken);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a video to YouTube Shorts' })
  @ApiResponse({
    status: 200,
    description: 'Returns the uploaded video information',
    type: UploadYouTubeShortsResponseDto,
  })
  async uploadShorts(
    @Body() uploadDto: UploadYouTubeShortsDto,
  ): Promise<UploadYouTubeShortsResponseDto> {
    return await this.youtubeShortsService.uploadShorts(uploadDto);
  }
}
