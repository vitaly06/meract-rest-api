import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  Req, 
  UseGuards, 
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard'; 
import { RequestWithUser } from '../auth/interfaces/request-with-user.dto';

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
  @UseGuards(JwtAuthGuard)
  @Post('tickets/:ticketId/message')
  async sendTicketMessage(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.ticketService.sendMessage(+ticketId, req.user.sub, dto);
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
}
  

