import { Module } from '@nestjs/common';
import { AgoraRecordingService } from './agora-recording.service';
import { AgoraRecordingController } from './agora-recording.controller';

@Module({
  controllers: [AgoraRecordingController],
  providers: [AgoraRecordingService],
  exports: [AgoraRecordingService],
})
export class AgoraRecordingModule {}
