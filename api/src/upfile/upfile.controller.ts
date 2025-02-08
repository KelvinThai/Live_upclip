import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpfileService } from './upfile.service';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MulterFile } from './upfile.types';

@ApiTags('File Upload')
@Controller('upfile')
export class UpfileController {
  constructor(private readonly upfileService: UpfileService) {}

  @Post('upload/video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file to upload',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: MulterFile) {
    return await this.upfileService.uploadVideo(file);
  }
}
