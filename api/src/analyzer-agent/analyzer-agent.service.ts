import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { ViralMomentAnalysis } from './types';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class AnalyzerAgentService {
  private openai: OpenAI;
  private readonly framesDir = 'uploads/frames';

  constructor() {
    console.log('Initializing AnalyzerAgentService...');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.ensureDirectoryExists();
    console.log('AnalyzerAgentService initialized successfully');
  }

  private async ensureDirectoryExists() {
    try {
      console.log(`Creating frames directory: ${this.framesDir}`);
      await fs.mkdir(this.framesDir, { recursive: true });
      console.log('Frames directory created/verified successfully');
    } catch (error) {
      console.error('Error creating frames directory:', error);
    }
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      console.log('Getting video duration...');
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      );
      const duration = parseFloat(stdout);
      console.log(`Video duration: ${duration} seconds`);
      return duration;
    } catch (error) {
      console.error('Error getting video duration:', error);
      throw new BadRequestException('Failed to get video duration');
    }
  }

  private formatTimeRange(
    frameNumber: number,
    totalFrames: number,
    videoDuration: number,
  ): {
    startTime: string;
    endTime: string;
    duration: string;
  } {
    const secondsPerFrame = videoDuration / totalFrames;
    const startSeconds = frameNumber * secondsPerFrame;
    const endSeconds = Math.min(
      (frameNumber + 1) * secondsPerFrame,
      videoDuration,
    );
    const durationSeconds = endSeconds - startSeconds;

    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    return {
      startTime: formatTime(startSeconds),
      endTime: formatTime(endSeconds),
      duration: formatTime(durationSeconds),
    };
  }

  private async extractFrames(videoPath: string): Promise<string[]> {
    console.log(`Starting frame extraction for video: ${videoPath}`);
    const framePrefix = path.join(
      this.framesDir,
      path.basename(videoPath, path.extname(videoPath)),
    );

    try {
      // Extract 5 frames from the video
      const command = `ffmpeg -i "${videoPath}" -vf "fps=1/5" -frame_pts 1 "${framePrefix}_%d.jpg"`;
      console.log('Executing ffmpeg command:', command);
      await execAsync(command);
      console.log('Frame extraction completed successfully');

      // Get list of generated frames
      const files = await fs.readdir(this.framesDir);
      console.log('Reading frames directory contents...');
      const frames = files
        .filter((file) =>
          file.startsWith(path.basename(videoPath, path.extname(videoPath))),
        )
        .map((file) => path.join(this.framesDir, file));

      console.log(`Found ${frames.length} frames:`, frames);
      return frames;
    } catch (error) {
      console.error('Error extracting frames:', error);
      throw new BadRequestException('Failed to process video frames');
    }
  }

  private async convertFramesToBase64(frames: string[]): Promise<string[]> {
    console.log(`Starting base64 conversion for ${frames.length} frames`);
    try {
      const base64Frames = await Promise.all(
        frames.map(async (frame) => {
          console.log(`Converting frame to base64: ${frame}`);
          const data = await fs.readFile(frame);
          const base64 = `data:image/jpeg;base64,${data.toString('base64')}`;
          console.log(`Frame converted successfully: ${frame}`);
          return base64;
        }),
      );
      console.log('All frames converted to base64 successfully');
      return base64Frames;
    } catch (error) {
      console.error('Error converting frames to base64:', error);
      throw new BadRequestException('Failed to process video frames');
    }
  }

  async analyzeVideo(videoPath: string): Promise<ViralMomentAnalysis[]> {
    console.log(`Starting video analysis for: ${videoPath}`);
    try {
      // Check if video exists
      console.log('Checking if video file exists...');
      if (!existsSync(videoPath)) {
        console.error('Video file not found:', videoPath);
        throw new BadRequestException('Video file not found');
      }
      console.log('Video file exists, proceeding with analysis');

      // Get video duration
      const videoDuration = await this.getVideoDuration(videoPath);

      // Extract frames from video
      console.log('Starting frame extraction process...');
      const frames = await this.extractFrames(videoPath);
      console.log('Converting frames to base64...');
      const base64Frames = await this.convertFramesToBase64(frames);

      console.log('Making OpenAI API request for video analysis...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze these frames from a video and identify potential viral moments. For each moment:
                1. Identify the frame number (1-based index)
                2. Describe what makes it engaging
                3. Rate its viral potential (1-10)
                4. Suggest a catchy title
                5. Suggest relevant hashtags
                Format the response as JSON with these fields in an array called 'moments': frameNumber, description, viralPotential, suggestedTitle, suggestedHashtags.
                Example format:
                {
                  "moments": [
                    {
                      "frameNumber": 1,
                      "description": "...",
                      "viralPotential": 8,
                      "suggestedTitle": "...",
                      "suggestedHashtags": ["..."]
                    }
                  ]
                }`,
              } as const,
              ...base64Frames.map((frame) => ({
                type: 'image_url' as const,
                image_url: {
                  url: frame,
                },
              })),
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' as const },
      });
      console.log('Received response from OpenAI');

      // Cleanup frames
      console.log('Cleaning up temporary frame files...');
      await Promise.all(
        frames.map((frame) => fs.unlink(frame).catch(console.error)),
      );
      console.log('Frame cleanup completed');

      const content = response.choices[0].message.content;
      if (!content) {
        console.log('No content in OpenAI response, returning empty array');
        return [];
      }

      try {
        console.log('Parsing OpenAI response...');
        interface MomentData {
          frameNumber: number;
          description: string;
          viralPotential: number;
          suggestedTitle: string;
          suggestedHashtags: string[];
        }

        interface OpenAIResponse {
          moments?: MomentData[];
          frameNumber?: number;
          description?: string;
          viralPotential?: number;
          suggestedTitle?: string;
          suggestedHashtags?: string[];
        }

        const parsedContent = JSON.parse(content) as OpenAIResponse;
        console.log('Parsed content:', parsedContent);

        // Handle both array and single moment responses
        const moments: MomentData[] = parsedContent.moments
          ? parsedContent.moments
          : parsedContent.frameNumber
            ? [
                {
                  frameNumber: parsedContent.frameNumber,
                  description: parsedContent.description || '',
                  viralPotential: parsedContent.viralPotential || 0,
                  suggestedTitle: parsedContent.suggestedTitle || '',
                  suggestedHashtags: parsedContent.suggestedHashtags || [],
                },
              ]
            : [];

        if (!Array.isArray(moments)) {
          console.error('Invalid response format from OpenAI:', parsedContent);
          return [];
        }

        // Add time ranges to each moment
        const momentsWithTimeRanges = moments
          .map((moment: MomentData) => {
            if (!moment.frameNumber) {
              console.error('Invalid moment format:', moment);
              return null;
            }

            const timeRange = this.formatTimeRange(
              moment.frameNumber - 1,
              frames.length,
              videoDuration,
            );
            return {
              timestamp: timeRange.startTime,
              startTime: timeRange.startTime,
              endTime: timeRange.endTime,
              duration: timeRange.duration,
              description: moment.description,
              viralPotential: moment.viralPotential,
              suggestedTitle: moment.suggestedTitle,
              suggestedHashtags: moment.suggestedHashtags,
            } satisfies ViralMomentAnalysis;
          })
          .filter((moment): moment is ViralMomentAnalysis => moment !== null);

        console.log(
          'Analysis results with time ranges:',
          momentsWithTimeRanges,
        );
        return momentsWithTimeRanges;
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error analyzing video:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to analyze video for viral moments',
      );
    }
  }

  async generateShortContent(
    videoPath: string,
    timestamp: string,
  ): Promise<string> {
    console.log(
      `Generating short content suggestions for ${videoPath} at ${timestamp}`,
    );
    try {
      console.log('Checking if video file exists...');
      if (!existsSync(videoPath)) {
        console.error('Video file not found:', videoPath);
        throw new BadRequestException('Video file not found');
      }

      // Extract frame at specific timestamp
      const framePrefix = path.join(this.framesDir, 'temp_frame');
      const command = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${framePrefix}.jpg"`;
      console.log('Executing ffmpeg command:', command);
      await execAsync(command);
      console.log('Frame extracted successfully');

      // Convert frame to base64
      console.log('Converting frame to base64...');
      const frameData = await fs.readFile(`${framePrefix}.jpg`);
      const base64Frame = `data:image/jpeg;base64,${frameData.toString('base64')}`;
      console.log('Frame converted to base64 successfully');

      console.log('Making OpenAI API request for editing suggestions...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text' as const,
                text: `For this moment from the video, provide specific editing suggestions to make it more engaging:
                1. Recommended duration
                2. Suggested transitions or effects
                3. Background music style
                4. Caption placement
                5. Any additional enhancement tips`,
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: base64Frame,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });
      console.log('Received response from OpenAI');

      // Cleanup frame
      console.log('Cleaning up temporary frame file...');
      await fs.unlink(`${framePrefix}.jpg`).catch(console.error);
      console.log('Frame cleanup completed');

      const suggestions =
        response.choices[0].message.content ||
        'No editing suggestions available';
      console.log('Generated suggestions:', suggestions);
      return suggestions;
    } catch (error) {
      console.error('Error generating short content suggestions:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate editing suggestions');
    }
  }
}
