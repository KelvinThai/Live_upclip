import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UpfileModule } from './upfile/upfile.module';
import { AnalyzerAgentModule } from './analyzer-agent/analyzer-agent.module';
import { VideoEditorModule } from './video-editor/video-editor.module';
import { YouTubeShortsModule } from './youtube-shorts/youtube-shorts.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UpfileModule,
    AnalyzerAgentModule,
    VideoEditorModule,
    YouTubeShortsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
