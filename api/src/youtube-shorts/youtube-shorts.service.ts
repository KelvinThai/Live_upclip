import { Injectable, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { existsSync } from 'fs';
import { createReadStream } from 'fs';
import {
  UploadYouTubeShortsRequest,
  UploadYouTubeShortsResponse,
} from './types';

@Injectable()
export class YouTubeShortsService {
  private youtube;
  private oauth2Client: OAuth2Client;

  constructor() {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI,
    );

    // Initialize YouTube API client
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<string> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Store refresh_token securely - you should save this in your database
      if (tokens.refresh_token) {
        console.log('Refresh Token:', tokens.refresh_token);
        return tokens.refresh_token;
      }
      throw new BadRequestException('No refresh token received');
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new BadRequestException('Failed to get authentication tokens');
    }
  }

  setRefreshToken(refreshToken: string): void {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  async uploadShorts(
    request: UploadYouTubeShortsRequest,
  ): Promise<UploadYouTubeShortsResponse> {
    try {
      // Validate video file exists
      if (!existsSync(request.videoPath)) {
        throw new BadRequestException('Video file not found');
      }

      // Create video metadata
      const requestBody = {
        snippet: {
          title: request.title,
          description: request.description,
          tags: request.tags,
        },
        status: {
          privacyStatus: request.isPrivate ? 'private' : 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      // Upload the video
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: requestBody,
        media: {
          body: createReadStream(request.videoPath),
        },
      });

      if (!response.data.id) {
        throw new BadRequestException('Failed to upload video to YouTube');
      }

      // Return upload response
      return {
        videoId: response.data.id,
        videoUrl: `https://youtube.com/shorts/${response.data.id}`,
        title: request.title,
        description: request.description,
        tags: request.tags,
        privacyStatus: request.isPrivate ? 'private' : 'public',
      };
    } catch (error) {
      console.error('Error uploading YouTube Shorts:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload YouTube Shorts');
    }
  }
}
