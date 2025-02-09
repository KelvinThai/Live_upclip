import { Module } from '@nestjs/common';
import { YouTubeShortsController } from './youtube-shorts.controller';
import { YouTubeShortsService } from './youtube-shorts.service';

@Module({
  controllers: [YouTubeShortsController],
  providers: [YouTubeShortsService],
  exports: [YouTubeShortsService],
})
export class YouTubeShortsModule {}
