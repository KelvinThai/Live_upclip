import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UpfileModule } from './upfile/upfile.module';
import { AnalyzerAgentModule } from './analyzer-agent/analyzer-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UpfileModule,
    AnalyzerAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
