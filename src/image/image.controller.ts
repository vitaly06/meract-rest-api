import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ImageService } from './image.service';
import { ApiOperation, ApiParam, ApiProduces } from '@nestjs/swagger';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { lookup } from 'mime-types';
import { Response } from 'express';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @ApiOperation({
    summary: 'Get photo',
  })
  @ApiParam({
    name: 'type',
    description: 'Photo type',
    enum: ['act', 'guild'],
  })
  @ApiParam({ name: 'filename', description: 'Image filename', type: String })
  @ApiProduces('image/*')
  @Get('photo/:type/:filename')
  async getPhoto(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!['act', 'guild'].includes(type)) {
      throw new BadRequestException('Invalid file type. Valid values: stream');
    }

    const filePath = join(process.cwd(), 'uploads', `${type}s`, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const mimeType = lookup(filePath) || 'application/octet-stream';

    const fileStream = createReadStream(filePath);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=31536000',
    });

    return new StreamableFile(fileStream);
  }
}
