import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RequestWithUser } from '../auth/interfaces/request-with-user.dto';
import { TicketStatus } from '@prisma/client';

@ApiTags('Support')
@Controller('support')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @ApiOperation({ summary: 'Create new support ticket' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('tickets')
  async createTicket(
    @Body() dto: CreateTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.createTicket(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Add message to ticket' })
  @ApiParam({ name: 'ticketId', type: 'number' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @Post('tickets/:ticketId/message')
  async sendTicketMessage(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.sendMessage(+ticketId, req.user.sub, dto, file);
  }

  @ApiOperation({ summary: 'Get my tickets' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('tickets/my')
  async getMyTickets(@Req() req: RequestWithUser) {
    return await this.ticketService.getMyTickets(req.user.sub);
  }

  @ApiOperation({ summary: 'Get ticket messages' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('tickets/:ticketId/messages')
  async getTicketMessages(
    @Param('ticketId') ticketId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.getMessages(+ticketId, req.user.sub);
  }

  @ApiOperation({ summary: 'Get all tickets (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All tickets retrieved' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllTickets(@Req() req: RequestWithUser) {
    return await this.ticketService.getAllTickets(req.user.sub);
  }

  @ApiOperation({ summary: 'Get single ticket with messages' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('tickets/:ticketId')
  async getTicketById(
    @Param('ticketId') ticketId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.getTicketById(+ticketId, req.user.sub);
  }

  @ApiOperation({
    summary: 'Set ticket status (Admin only): OPEN | IN_PROGRESS | CLOSED',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('tickets/:ticketId/status')
  async setTicketStatus(
    @Param('ticketId') ticketId: string,
    @Body('status') status: TicketStatus,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.setTicketStatus(
      +ticketId,
      req.user.sub,
      status,
    );
  }
}
