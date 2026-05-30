import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InboxService } from './inbox.service';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  getConversations() {
    return this.inboxService.getConversations();
  }

  @Get('thread')
  getThread(
    @Query('senderId') senderId: string,
    @Query('contactEmail') contactEmail: string,
  ) {
    return this.inboxService.getThread(senderId, contactEmail);
  }

  @Post('read')
  markRead(
    @Query('senderId') senderId: string,
    @Query('uid') uid: string,
  ) {
    return this.inboxService.markRead(senderId, Number(uid));
  }
}
