import { Module } from '@nestjs/common';
import { UpfileService } from './upfile.service';
import { UpfileController } from './upfile.controller';

@Module({
  providers: [UpfileService],
  controllers: [UpfileController]
})
export class UpfileModule {}
