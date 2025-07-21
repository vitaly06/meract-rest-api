import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateAdminRequest } from './dto/create-admin.dto';
import { UpdateAdminRequest } from './dto/update-admin.dto';

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
  async createAdmin(@Body() dto: CreateAdminRequest) {
    return await this.adminService.createAdmin(dto);
  }

  @Put(':id')
  async updateAdmin(@Body() dto: UpdateAdminRequest, @Param('id') id: string) {
    return await this.adminService.update(dto, +id);
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string) {
    return await this.adminService.delete(+id);
  }
}
