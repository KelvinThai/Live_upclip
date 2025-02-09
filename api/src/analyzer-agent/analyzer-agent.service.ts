import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { ViralMomentAnalysis } from './types';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BATCH_SIZE = 10; // Process 3 frames per request
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

@Injectable()
export class AnalyzerAgentService {
  private openai: OpenAI;
  private readonly framesDir = 'uploads/frames';

  constructor() {
    console.log('Initializing AnalyzerAgentService...');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.ensureDirectoryExists().catch(console.error);
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
    console.log(
      `Starting content-based frame extraction for video: ${videoPath}`,
    );
    const framePrefix = path.join(
      this.framesDir,
      path.basename(videoPath, path.extname(videoPath)),
    );

    try {
      // First, detect scenes based on content changes
      const sceneCommand = `ffmpeg -i "${videoPath}" -vf "select=gt(scene\\,0.3),metadata=print:file=${framePrefix}_scenes.txt" -f null -`;
      console.log('Detecting scene changes...');
      await execAsync(sceneCommand);

      // Extract keyframes from each significant scene
      const command = `ffmpeg -i "${videoPath}" -vf "select='gt(scene,0.3)',setpts=N/FRAME_RATE/TB" -vsync vfr -frame_pts 1 "${framePrefix}_%d.jpg"`;
      console.log('Executing frame extraction command:', command);
      await execAsync(command);
      console.log('Frame extraction completed successfully');

      // Get list of generated frames
      const files = await fs.readdir(this.framesDir);
      console.log('Reading frames directory contents...');
      const frames = files
        .filter(
          (file) =>
            file.startsWith(
              path.basename(videoPath, path.extname(videoPath)),
            ) && file.endsWith('.jpg'),
        )
        .map((file) => path.join(this.framesDir, file));

      console.log(`Found ${frames.length} significant scenes:`, frames);
      return frames;
    } catch (error) {
      console.error('Error extracting frames:', error);
      throw new BadRequestException('Failed to process video frames');
    }
  }

  private async getSceneInfo(
    videoPath: string,
  ): Promise<Array<{ time: number; score: number }>> {
    const sceneInfoPath = path.join(
      this.framesDir,
      `${path.basename(videoPath, path.extname(videoPath))}_scenes.txt`,
    );

    try {
      const sceneData = await fs.readFile(sceneInfoPath, 'utf-8');
      const scenes = sceneData
        .split('\n')
        .filter((line) => line.includes('pts_time'))
        .map((line) => {
          const timeMatch = line.match(/pts_time:([\d.]+)/);
          const scoreMatch = line.match(/scene_score=([\d.]+)/);
          return {
            time: timeMatch ? parseFloat(timeMatch[1]) : 0,
            score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
          };
        });

      await fs.unlink(sceneInfoPath).catch(console.error);
      return scenes;
    } catch (error) {
      console.error('Error reading scene information:', error);
      return [];
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

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processBatch(
    base64Frames: string[],
    startIndex: number,
    sceneInfo: Array<{ time: number; score: number }>,
  ): Promise<{
    moments: Array<{
      frameNumber: number;
      description: string;
      viralPotential: number;
      suggestedTitle: string;
      suggestedHashtags: string[];
    }>;
  }> {
    console.log(`Processing batch starting at frame ${startIndex + 1}`);

    // Format scene timings for context
    const sceneContexts = sceneInfo.map((scene, idx) => {
      const nextScene = sceneInfo[idx + 1];
      const duration = nextScene ? nextScene.time - scene.time : 'end';
      return `Scene ${idx + 1}: starts at ${scene.time}s, duration: ${duration}s, change score: ${scene.score}`;
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these key scenes from the video and identify potential viral moments. Each frame represents a significant scene change or important moment.
              
              Scene timing information:
              ${sceneContexts.join('\n')}
              
              For each scene:
              1. Identify the frame number (use absolute frame numbers starting from ${startIndex + 1})
              2. Describe the scene content and what makes it engaging, considering its timing and transition score
              3. Rate its viral potential (1-10) based on visual appeal and content
              4. Suggest a catchy title that captures the scene's essence
              5. Suggest relevant hashtags for social media
              Format the response as JSON with these fields in an array called 'moments': frameNumber, description, viralPotential, suggestedTitle, suggestedHashtags.`,
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

    const content = response.choices[0].message.content;
    if (!content) {
      console.log('No content in OpenAI response for batch');
      return { moments: [] };
    }

    interface BatchResponse {
      moments: Array<{
        frameNumber: number;
        description: string;
        viralPotential: number;
        suggestedTitle: string;
        suggestedHashtags: string[];
      }>;
    }

    const parsedContent = JSON.parse(content) as BatchResponse;
    return parsedContent;
  }

  private async processFramesInBatches(base64Frames: string[]): Promise<
    Array<{
      frameNumber: number;
      description: string;
      viralPotential: number;
      suggestedTitle: string;
      suggestedHashtags: string[];
    }>
  > {
    const allMoments: Array<{
      frameNumber: number;
      description: string;
      viralPotential: number;
      suggestedTitle: string;
      suggestedHashtags: string[];
    }> = [];

    for (let i = 0; i < base64Frames.length; i += BATCH_SIZE) {
      const batch = base64Frames.slice(i, i + BATCH_SIZE);
      try {
        console.log(
          `Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(base64Frames.length / BATCH_SIZE)}`,
        );
        const sceneInfo = await this.getSceneInfo(batch[0]);
        const result = await this.processBatch(batch, i, sceneInfo);
        if (result.moments) {
          allMoments.push(...result.moments);
        }

        if (i + BATCH_SIZE < base64Frames.length) {
          console.log(
            `Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`,
          );
          await this.delay(DELAY_BETWEEN_BATCHES);
        }
      } catch (error) {
        console.error(
          `Error processing batch starting at frame ${i + 1}:`,
          error,
        );
        // Continue with next batch even if current one fails
      }
    }

    return allMoments;
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

      // Extract frames from video based on scene changes
      console.log('Starting scene-based frame extraction...');
      const frames = await this.extractFrames(videoPath);
      const sceneInfo = await this.getSceneInfo(videoPath);

      console.log('Converting frames to base64...');
      const base64Frames = await this.convertFramesToBase64(frames);

      // Process frames in batches
      console.log('Processing frames in batches...');
      const moments = await this.processFramesInBatches(base64Frames);

      // Cleanup frames
      console.log('Cleaning up temporary frame files...');
      await Promise.all(
        frames.map((frame) => fs.unlink(frame).catch(console.error)),
      );
      console.log('Frame cleanup completed');

      // Add time ranges to moments using scene information
      const momentsWithTimeRanges = moments
        .map((moment, index) => {
          if (!moment.frameNumber || !sceneInfo[index]) {
            console.error(
              'Invalid moment format or missing scene info:',
              moment,
            );
            return null;
          }

          const sceneTime = sceneInfo[index].time;
          const nextSceneTime = sceneInfo[index + 1]?.time || videoDuration;
          const duration = nextSceneTime - sceneTime;

          const formatTime = (seconds: number): string => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            const milliseconds = Math.floor((seconds % 1) * 1000);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
          };

          return {
            timestamp: formatTime(sceneTime),
            startTime: formatTime(sceneTime),
            endTime: formatTime(nextSceneTime),
            duration: formatTime(duration),
            description: moment.description,
            viralPotential: moment.viralPotential,
            suggestedTitle: moment.suggestedTitle,
            suggestedHashtags: moment.suggestedHashtags,
          } satisfies ViralMomentAnalysis;
        })
        .filter((moment): moment is ViralMomentAnalysis => moment !== null);

      console.log('Analysis results with time ranges:', momentsWithTimeRanges);
      return momentsWithTimeRanges;
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
