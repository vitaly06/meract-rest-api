import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateAdminRequest } from './dto/create-admin.dto';
import { UpdateAdminRequest } from './dto/update-admin.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

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

  @Put(':id')
  async updateAdmin(
    @Body() dto: UpdateAdminRequest,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.update(dto, +id, req);
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.adminService.delete(+id, req);
  }
}
