import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: 'Send message to stream chat',
    description: 'Send a message to the chat of a specific stream',
  })
  @ApiParam({
    name: 'actId',
    description: 'Stream ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    schema: {
      example: {
        id: 1,
        message: 'Hello everyone!',
        createdAt: '2025-11-02T12:00:00.000Z',
        user: {
          id: 1,
          username: 'john_doe',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Stream not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is blocked or stream is offline',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':actId/message')
  async sendMessage(
    @Param('actId') actId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.chatService.sendMessage(+actId, req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Get chat messages',
    description: 'Get chat messages for a specific stream',
  })
  @ApiParam({
    name: 'actId',
    description: 'Stream ID',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of messages to fetch',
    required: false,
    type: 'number',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of messages to skip',
    required: false,
    type: 'number',
    example: 0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat messages retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          message: { type: 'string' },
          createdAt: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              username: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Get(':actId/messages')
  async getMessages(
    @Param('actId') actId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? +limit : 50;
    const offsetNum = offset ? +offset : 0;
    return await this.chatService.getMessages(+actId, limitNum, offsetNum);
  }

  @ApiOperation({
    summary: 'Delete chat message',
    description: 'Delete a chat message (author, stream owner, or admin only)',
  })
  @ApiParam({
    name: 'messageId',
    description: 'Message ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message deleted successfully',
    schema: {
      example: { message: 'Message deleted successfully' },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Message not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No permission to delete this message',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('message/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.chatService.deleteMessage(+messageId, req.user.sub);
  }

  @ApiOperation({
    summary: 'Get message count',
    description: 'Get total number of messages in stream chat',
  })
  @ApiParam({
    name: 'actId',
    description: 'Stream ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message count retrieved successfully',
    schema: {
      example: { count: 150 },
    },
  })
  @Get(':actId/count')
  async getMessageCount(@Param('actId') actId: string) {
    const count = await this.chatService.getMessageCount(+actId);
    return { count };
  }
}
