import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CreateAdminRequest } from './dto/create-admin.dto';
import { UpdateAdminRequest } from './dto/update-admin.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { SendWarningDto } from './dto/send-warning.dto';
import { AddLikesDto } from './dto/add-likes.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { CreateAdminTaskDto } from './dto/create-admin-task.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateLocationRangeDto } from './dto/create-location-range.dto';
import { UpdateLocationRangeDto } from './dto/update-location-range.dto';
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

  // ============================================
  // ЧАТ МЕЖДУ АДМИНАМИ
  // ============================================

  @ApiOperation({
    summary: 'Список админов для связи',
    description:
      'main admin видит всех admin; admin видит main admin. Возвращает id, login, email, avatarUrl.',
  })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Get('contacts')
  async getAdminContacts(@Req() req: RequestWithUser) {
    return this.adminService.getAdminContacts(req.user.sub);
  }

  // ============================================
  // ЗАДАЧИ (ADMIN TASKS) — статические GET перед :id
  // ============================================

  @ApiOperation({
    summary: 'Все задачи (только main admin)',
    description: 'Все задачи для всех админов',
  })
  @UseGuards(JwtAuthGuard)
  @Get('tasks')
  async getAllAdminTasks(@Req() req: RequestWithUser) {
    return this.adminService.getAllAdminTasks(req.user.sub);
  }

  @ApiOperation({
    summary: 'Мои задачи (для админа)',
    description: 'Все задачи, назначенные текущему админу',
  })
  @UseGuards(JwtAuthGuard)
  @Get('tasks/my')
  async getMyAdminTasks(@Req() req: RequestWithUser) {
    return this.adminService.getMyAdminTasks(req.user.sub);
  }

  @ApiOperation({ summary: 'Все интро (admin)' })
  @UseGuards(JwtAuthGuard)
  @Get('intros')
  async getAdminIntros() {
    return this.adminService.getAdminIntros();
  }

  @ApiOperation({ summary: 'Все политики' })
  @UseGuards(JwtAuthGuard)
  @Get('policies')
  async getPolicies() {
    return this.adminService.getPolicies();
  }

  @ApiOperation({ summary: 'Все согласия' })
  @UseGuards(JwtAuthGuard)
  @Get('consents')
  async getConsents() {
    return this.adminService.getConsents();
  }

  @ApiOperation({ summary: 'Все категории актов' })
  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories() {
    return this.adminService.getCategories();
  }

  @ApiOperation({ summary: 'Категория + её акты' })
  @UseGuards(JwtAuthGuard)
  @Get('categories/:categoryId/acts')
  async getCategoryWithActs(@Param('categoryId') categoryId: string) {
    return this.adminService.getCategoryWithActs(+categoryId);
  }

  @ApiOperation({ summary: 'Все диапазоны расстояний для ползунка' })
  @UseGuards(JwtAuthGuard)
  @Get('location-ranges')
  async getLocationRanges() {
    return this.adminService.getLocationRanges();
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

  // ============================================
  // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
  // ============================================

  @ApiOperation({
    summary: 'Накрутить/списать импульсы (points) пользователю',
    description: 'Положительное amount — начислить, отрицательное — списать',
  })
  @ApiResponse({ status: 200, description: 'Импульсы обновлены' })
  @UseGuards(JwtAuthGuard)
  @Post('users/adjust-points')
  async adjustPoints(
    @Body() dto: AdjustPointsDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.adjustPoints(
      dto.userId,
      dto.amount,
      req.user.sub,
    );
  }

  @ApiOperation({
    summary: 'Накрутить/списать баланс (echo) пользователю',
    description: 'Положительное amount — начислить, отрицательное — списать',
  })
  @ApiResponse({ status: 200, description: 'Баланс обновлён' })
  @UseGuards(JwtAuthGuard)
  @Post('users/adjust-balance')
  async adjustBalance(
    @Body() dto: AdjustBalanceDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.adminService.adjustBalance(
      dto.userId,
      dto.amount,
      req.user.sub,
    );
  }

  @ApiOperation({
    summary: 'Открыть/создать личный чат с админом',
    description:
      'Возвращает { id, type } чата. Дальше использовать стандартные chat-эндпоинты.',
  })
  @ApiResponse({ status: 201, schema: { example: { id: 12, type: 'direct' } } })
  @UseGuards(JwtAuthGuard)
  @Post('chat/:adminId')
  async openChatWithAdmin(
    @Param('adminId') adminId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.openChatWithAdmin(req.user.sub, +adminId);
  }

  // ============================================
  // ЗАДАЧИ (АДМИН TASKS)
  // ============================================

  @ApiOperation({
    summary: 'Создать задачу админу (только main admin)',
  })
  @ApiResponse({ status: 201, description: 'Задача создана' })
  @UseGuards(JwtAuthGuard)
  @Post('tasks')
  async createAdminTask(
    @Body() dto: CreateAdminTaskDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.createAdminTask(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Переключить выполнение задачи (assignee или main admin)',
  })
  @ApiResponse({ status: 200, description: 'Статус изменён' })
  @UseGuards(JwtAuthGuard)
  @Patch('tasks/:taskId/toggle')
  async toggleAdminTask(
    @Param('taskId') taskId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.toggleAdminTask(+taskId, req.user.sub);
  }

  @ApiOperation({
    summary: 'Удалить задачу (только main admin)',
  })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Задача удалена' } },
  })
  @UseGuards(JwtAuthGuard)
  @Delete('tasks/:taskId')
  async deleteAdminTask(
    @Param('taskId') taskId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.deleteAdminTask(+taskId, req.user.sub);
  }

  // ============================================
  // УПРАВЛЕНИЕ ИНТРО
  // ============================================

  @ApiOperation({
    summary: 'Загрузить интро (admin)',
    description:
      'targetUserId — необязательный; если не указан, интро станет глобальным',
  })
  @UseGuards(JwtAuthGuard)
  @Post('intros/upload')
  @UseInterceptors(FileInterceptor('intro'))
  async uploadAdminIntro(
    @UploadedFile() file: Express.Multer.File,
    @Query('targetUserId') targetUserId?: string,
  ) {
    return this.adminService.uploadAdminIntro(
      file.filename,
      targetUserId ? +targetUserId : undefined,
    );
  }

  @ApiOperation({ summary: 'Удалить интро (admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('intros/:introId')
  async deleteAdminIntro(@Param('introId') introId: string) {
    return this.adminService.deleteAdminIntro(+introId);
  }

  // ============================================
  // ПОЛИТИКИ
  // ============================================

  @ApiOperation({ summary: 'Создать политику (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('policies')
  async createPolicy(
    @Body() dto: CreatePolicyDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.createPolicy(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Обновить политику (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Patch('policies/:policyId')
  async updatePolicy(
    @Param('policyId') policyId: string,
    @Body() dto: UpdatePolicyDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.updatePolicy(req.user.sub, +policyId, dto);
  }

  @ApiOperation({ summary: 'Удалить политику (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('policies/:policyId')
  async deletePolicy(
    @Param('policyId') policyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.deletePolicy(req.user.sub, +policyId);
  }

  // ============================================
  // СОГЛАСИЯ
  // ============================================

  @ApiOperation({ summary: 'Создать согласие (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('consents')
  async createConsent(
    @Body() dto: CreateConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.createConsent(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Обновить согласие (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Patch('consents/:consentId')
  async updateConsent(
    @Param('consentId') consentId: string,
    @Body() dto: UpdateConsentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.updateConsent(req.user.sub, +consentId, dto);
  }

  @ApiOperation({ summary: 'Удалить согласие (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('consents/:consentId')
  async deleteConsent(
    @Param('consentId') consentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.deleteConsent(req.user.sub, +consentId);
  }

  // ============================================
  // КАТЕГОРИИ АКТОВ
  // ============================================

  @ApiOperation({ summary: 'Создать категорию (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('categories')
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.createCategory(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Обновить категорию (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.updateCategory(req.user.sub, +categoryId, dto);
  }

  @ApiOperation({ summary: 'Удалить категорию (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('categories/:categoryId')
  async deleteCategory(
    @Param('categoryId') categoryId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.deleteCategory(req.user.sub, +categoryId);
  }

  @ApiOperation({
    summary: 'Назначить один акт в категорию (categoryId=null — убрать)',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('categories/:categoryId/acts/:actId')
  async setActCategory(
    @Param('categoryId') categoryId: string,
    @Param('actId') actId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.setActCategory(req.user.sub, +actId, +categoryId);
  }

  @ApiOperation({ summary: 'Массово добавить акты в категорию' })
  @UseGuards(JwtAuthGuard)
  @Post('categories/:categoryId/acts')
  async setActsToCategory(
    @Param('categoryId') categoryId: string,
    @Body('actIds') actIds: number[],
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.setActsToCategory(
      req.user.sub,
      +categoryId,
      actIds,
    );
  }

  @ApiOperation({ summary: 'Убрать акты из категории' })
  @UseGuards(JwtAuthGuard)
  @Delete('categories/:categoryId/acts')
  async removeActsFromCategory(
    @Param('categoryId') categoryId: string,
    @Body('actIds') actIds: number[],
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.removeActsFromCategory(
      req.user.sub,
      +categoryId,
      actIds,
    );
  }

  // ============================================
  // ДИАПАЗОНЫ РАССТОЯНИЙ ДЛЯ ПОЛЗУНКА ЛОКАЦИИ
  // ============================================

  @ApiOperation({ summary: 'Создать диапазон расстояния (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Post('location-ranges')
  async createLocationRange(
    @Body() dto: CreateLocationRangeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.createLocationRange(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Обновить диапазон расстояния (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Patch('location-ranges/:rangeId')
  async updateLocationRange(
    @Param('rangeId') rangeId: string,
    @Body() dto: UpdateLocationRangeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.updateLocationRange(req.user.sub, +rangeId, dto);
  }

  @ApiOperation({ summary: 'Удалить диапазон расстояния (main admin)' })
  @UseGuards(JwtAuthGuard)
  @Delete('location-ranges/:rangeId')
  async deleteLocationRange(
    @Param('rangeId') rangeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.adminService.deleteLocationRange(req.user.sub, +rangeId);
  }
}
