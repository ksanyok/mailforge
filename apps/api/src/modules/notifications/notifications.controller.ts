import {
  Controller, Get, Patch, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, RequestUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markRead(id, user.id);
  }
}
