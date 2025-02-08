import { Injectable, BadRequestException } from '@nestjs/common';
import { EditVideoRequest, EditVideoResponse } from './types';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const FADE_DURATION = 0.5; // Fade duration in seconds

@Injectable()
export class VideoEditorService {
  private readonly outputDir = 'uploads/edited';

  constructor() {
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating output directory:', error);
    }
  }

  private getResolutionDimensions(resolution: string): string {
    switch (resolution) {
      case '1080p':
        return '1920:1080';
      case '720p':
        return '1280:720';
      case '480p':
        return '854:480';
      default:
        return '1280:720';
    }
  }

  private async addCaptionToVideo(
    inputPath: string,
    outputPath: string,
    caption: string,
  ): Promise<void> {
    const command = `ffmpeg -i "${inputPath}" -vf "drawtext=text='${caption}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-10" -c:v libx264 -c:a aac "${outputPath}"`;
    await execAsync(command);
  }

  private async addHashtags(
    inputPath: string,
    outputPath: string,
    hashtags: string[],
  ): Promise<void> {
    const hashtagText = hashtags.join(' ');
    const command = `ffmpeg -i "${inputPath}" -vf "drawtext=text='${hashtagText}':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=10" -c:v libx264 -c:a aac "${outputPath}"`;
    await execAsync(command);
  }

  private async addFadeEffects(
    inputPath: string,
    outputPath: string,
    duration: number,
  ): Promise<void> {
    const command = `ffmpeg -i "${inputPath}" -vf "fade=t=in:st=0:d=${FADE_DURATION},fade=t=out:st=${
      duration - FADE_DURATION
    }:d=${FADE_DURATION}" -af "afade=t=in:st=0:d=${FADE_DURATION},afade=t=out:st=${
      duration - FADE_DURATION
    }:d=${FADE_DURATION}" -c:v libx264 -c:a aac "${outputPath}"`;

    console.log('Executing fade effect command:', command);
    await execAsync(command);
  }

  async editVideo(request: EditVideoRequest): Promise<EditVideoResponse> {
    try {
      // Validate input video exists
      if (!existsSync(request.videoPath)) {
        throw new BadRequestException('Input video file not found');
      }

      const outputFileName = `${uuidv4()}.${request.outputFormat}`;
      const outputPath = path.join(this.outputDir, outputFileName);
      let currentInputPath = request.videoPath;
      let tempOutputPath: string | null = null;

      // Extract the segment based on moment timestamps
      const extractCommand = `ffmpeg -i "${currentInputPath}" -ss ${
        request.moment.startTime
      } -t ${
        request.customDuration || request.moment.duration
      } -c:v libx264 -c:a aac "${outputPath}"`;

      console.log('Executing extract command:', extractCommand);
      await execAsync(extractCommand);
      currentInputPath = outputPath;

      // Get current duration for fade effects
      const { stdout: durationOutput } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${currentInputPath}"`,
      );
      const duration = parseFloat(durationOutput);

      // Add fade effects
      tempOutputPath = path.join(this.outputDir, `temp_${outputFileName}`);
      await this.addFadeEffects(currentInputPath, tempOutputPath, duration);
      await fs.rename(tempOutputPath, currentInputPath);

      // Resize video if needed
      if (request.resolution) {
        tempOutputPath = path.join(this.outputDir, `temp_${outputFileName}`);
        const dimensions = this.getResolutionDimensions(request.resolution);
        const resizeCommand = `ffmpeg -i "${currentInputPath}" -vf "scale=${dimensions}" -c:v libx264 -c:a aac "${tempOutputPath}"`;

        console.log('Executing resize command:', resizeCommand);
        await execAsync(resizeCommand);
        await fs.rename(tempOutputPath, currentInputPath);
      }

      // Add caption if requested
      if (request.includeCaption) {
        tempOutputPath = path.join(this.outputDir, `temp_${outputFileName}`);
        console.log('Adding caption:', request.moment.suggestedTitle);
        await this.addCaptionToVideo(
          currentInputPath,
          tempOutputPath,
          request.moment.suggestedTitle,
        );
        await fs.rename(tempOutputPath, currentInputPath);
      }

      // Add hashtags if requested
      if (request.includeHashtags) {
        tempOutputPath = path.join(this.outputDir, `temp_${outputFileName}`);
        console.log('Adding hashtags:', request.moment.suggestedHashtags);
        await this.addHashtags(
          currentInputPath,
          tempOutputPath,
          request.moment.suggestedHashtags,
        );
        await fs.rename(tempOutputPath, currentInputPath);
      }

      // Get output file information
      const { size } = await fs.stat(outputPath);
      const { stdout: finalDurationOutput } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
      );

      return {
        outputPath,
        duration: parseFloat(finalDurationOutput),
        format: request.outputFormat,
        resolution: request.resolution,
        fileSize: size,
      };
    } catch (error) {
      console.error('Error editing video:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to edit video');
    }
  }
}
