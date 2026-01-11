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
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateAdminRequest } from './dto/create-admin.dto';
import { UpdateAdminRequest } from './dto/update-admin.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { SendWarningDto } from './dto/send-warning.dto';
import { AddLikesDto } from './dto/add-likes.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('find-all')
  async findAll() {
    return await this.adminService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.adminService.findById(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-admin')
  async createAdmin(
    @Body() dto: CreateAdminRequest,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.createAdmin(dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateAdmin(
    @Body() dto: UpdateAdminRequest,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.update(dto, +id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteAdmin(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.adminService.delete(+id, req.user.sub);
  }

  // ============================================
  // УПРАВЛЕНИЕ СТРИМАМИ
  // ============================================

  @ApiOperation({ summary: 'Получить список активных стримов' })
  @ApiResponse({ status: 200, description: 'Список активных стримов' })
  @UseGuards(JwtAuthGuard)
  @Get('streams/active')
  async getActiveStreams() {
    return await this.adminService.getActiveStreams();
  }

  @ApiOperation({ summary: 'Получить сообщения чата стрима' })
  @ApiParam({ name: 'actId', description: 'ID стрима' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Лимит сообщений',
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Смещение',
    example: 0,
  })
  @ApiResponse({ status: 200, description: 'Сообщения чата стрима' })
  @UseGuards(JwtAuthGuard)
  @Get('streams/:actId/chat')
  async getStreamChat(
    @Param('actId') actId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.adminService.getStreamChat(
      +actId,
      limit ? +limit : 100,
      offset ? +offset : 0,
    );
  }

  @ApiOperation({ summary: 'Отправить предупреждение стримеру' })
  @ApiParam({ name: 'actId', description: 'ID стрима' })
  @ApiResponse({ status: 200, description: 'Предупреждение отправлено' })
  @UseGuards(JwtAuthGuard)
  @Post('streams/:actId/warning')
  async sendWarning(
    @Param('actId') actId: string,
    @Body() dto: SendWarningDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.sendWarningToStreamer(
      +actId,
      dto.message,
      req.user.sub,
    );
  }

  @ApiOperation({ summary: 'Добавить лайки стриму' })
  @ApiParam({ name: 'actId', description: 'ID стрима' })
  @ApiResponse({ status: 200, description: 'Лайки добавлены' })
  @UseGuards(JwtAuthGuard)
  @Post('streams/:actId/add-likes')
  async addLikes(
    @Param('actId') actId: string,
    @Body() dto: AddLikesDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.addLikesToStream(
      +actId,
      dto.count,
      req.user.sub,
    );
  }
}
