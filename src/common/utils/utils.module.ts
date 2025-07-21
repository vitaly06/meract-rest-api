import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.serivice';

@Global()
@Module({
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
