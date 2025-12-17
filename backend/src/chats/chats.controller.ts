import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatsService } from './chats.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CreateUserMessageDto } from './dto/create-user-message.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post(':documentId/threads')
  createThread(@Param('documentId') documentId: string, @CurrentUser() user: AuthUser) {
    return this.chatsService.createThread(user.id, documentId);
  }

  @Post(':threadId/messages')
  addMessage(
    @Param('threadId') threadId: string,
    @Body() dto: CreateUserMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatsService.addUserMessageAndReply(user.id, threadId, dto.content);
  }

  @Get(':threadId')
  getThread(@Param('threadId') threadId: string, @CurrentUser() user: AuthUser) {
    return this.chatsService.getThread(user.id, threadId);
  }
}
