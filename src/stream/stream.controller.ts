import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StreamService } from './stream.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateStreamRequest } from './dto/create-stream.dto';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'userId', 'categoryId'],
      properties: {
        name: { type: 'string' },
        userId: { type: 'number' },
        categoryId: { type: 'number' },
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create stream',
  })
  @ApiConsumes('multipart/form-data')
  @Post('create-stream')
  @UseInterceptors(FileInterceptor('photo'))
  async createProject(
    @Body() dto: CreateStreamRequest,
    @UploadedFile() photo: Multer.File,
  ) {
    return await this.streamService.createStream(dto, photo.filename);
  }

  @Get('get-streams')
  async getStreams() {
    return await this.streamService.getStreams();
  }

  @Post('stop-stream')
  @UseGuards(JwtAuthGuard)
  async stopStream(@Query('id') id: string, @Req() req: RequestWithUser) {
    return await this.streamService.stopStream(+id, req);
  }

  @ApiOperation({
    summary: 'Blocks with statistics',
  })
  @Get('statistic')
  async getStatistic() {
    return await this.streamService.getStatistic();
  }
}
