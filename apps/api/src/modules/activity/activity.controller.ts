import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; userId?: string; resourceType?: string }) {
    return this.activityService.findAll(query);
  }
}
