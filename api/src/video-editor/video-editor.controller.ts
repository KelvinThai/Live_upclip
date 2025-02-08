import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VideoEditorService } from './video-editor.service';
import { EditVideoDto, EditVideoResponseDto } from './types';

@ApiTags('Video Editor')
@Controller('video-editor')
export class VideoEditorController {
  constructor(private readonly videoEditorService: VideoEditorService) {}

  @Post('edit')
  @ApiOperation({
    summary: 'Edit a video segment based on viral moment analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the edited video information',
    type: EditVideoResponseDto,
  })
  async editVideo(
    @Body() editVideoDto: EditVideoDto,
  ): Promise<EditVideoResponseDto> {
    return await this.videoEditorService.editVideo(editVideoDto);
  }
}
