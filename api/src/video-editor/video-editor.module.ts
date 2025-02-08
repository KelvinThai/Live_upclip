import { Module } from '@nestjs/common';
import { VideoEditorController } from './video-editor.controller';
import { VideoEditorService } from './video-editor.service';

@Module({
  controllers: [VideoEditorController],
  providers: [VideoEditorService]
})
export class VideoEditorModule {}
