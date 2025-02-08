import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MulterFile } from './upfile.types';
@Injectable()
export class UpfileService {
  private readonly uploadDir = 'uploads/videos';

  constructor() {
    // Ensure upload directory exists
    this.createUploadDirIfNotExists();
  }

  private async createUploadDirIfNotExists() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async uploadVideo(file: MulterFile) {
    if (!file) {
      throw new BadRequestException('No video file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only video files are allowed.',
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      // Save file
      await fs.writeFile(filePath, file.buffer);

      return {
        success: true,
        fileName: fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
      };
    } catch (error: any) {
      throw new BadRequestException('Failed to save video file');
    }
  }
}
