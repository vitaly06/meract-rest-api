import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GuildService } from './guild.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateGuildRequest } from './dto/create-guild.dto';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { UpdateGuildRequest } from './dto/update-guild.dto';

@Controller('guild')
export class GuildController {
  constructor(private readonly guildService: GuildService) {}

  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create guild',
  })
  @ApiConsumes('multipart/form-data')
  @Post('create-guild')
  @UseInterceptors(FileInterceptor('photo'))
  @UseGuards(JwtAuthGuard)
  async createGuild(
    @Body() dto: CreateGuildRequest,
    @Req() req: RequestWithUser,
    @UploadedFile() photo?: Multer.File,
  ) {
    console.log(photo?.filename);
    return await this.guildService.createGuild(dto, req, photo?.filename);
  }

  @Get('find-all')
  async findAll() {
    return await this.guildService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-my-guild')
  async getMyGuild(@Req() req: RequestWithUser) {
    return await this.guildService.getMyGuild(req.user.sub);
  }

  @ApiOperation({
    summary: 'Find guild by id',
  })
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.guildService.findById(+id);
  }

  @ApiOperation({
    summary: 'Update guild information',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Put(':id')
  @UseInterceptors(FileInterceptor('photo'))
  @UseGuards(JwtAuthGuard)
  async updateGuild(
    @Param('id') id: string,
    @Body() dto: UpdateGuildRequest,
    @UploadedFile() photo?: Multer.File,
  ) {
    return await this.guildService.updateGuild(+id, dto, photo || null);
  }

  @ApiOperation({
    summary: 'Adding a user to a guild',
  })
  @Post('invite-user')
  async inviteUser(
    @Query('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return await this.guildService.inviteUser(+userId, +guildId);
  }

  @ApiOperation({
    summary: 'Delete user from guild',
  })
  @Post('kick-out-user')
  async kickOutUser(
    @Query('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return await this.guildService.kickOutUser(+userId, +guildId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteGuild(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.guildService.deleteGuild(+id, req);
  }
}
