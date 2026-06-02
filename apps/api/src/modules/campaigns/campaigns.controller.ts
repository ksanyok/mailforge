import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CurrentUser, RequestUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string; status?: string }) {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/recipients')
  getRecipients(@Param('id') id: string, @Query() query: any) {
    return this.campaignsService.getRecipients(id, query);
  }

  @Get(':id/events')
  getEvents(@Param('id') id: string, @Query() query: any) {
    return this.campaignsService.getEvents(id, query);
  }

  @Get(':id/funnel')
  getFunnel(@Param('id') id: string) {
    return this.campaignsService.getFunnel(id);
  }

  @Get(':id/non-responders')
  getNonResponders(@Param('id') id: string) {
    return this.campaignsService.getNonResponders(id);
  }

  @Post(':id/create-followup')
  createFollowUp(
    @Param('id') id: string,
    @Body() dto: { subject?: string; body?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.createFollowUp(id, user.id, dto);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: RequestUser) {
    return this.campaignsService.create(dto, user.id);
  }

  @Post(':id/dispatch')
  dispatch(@Param('id') id: string, @Body('senderId') senderId?: string) {
    return this.campaignsService.dispatch(id, senderId);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  pause(@Param('id') id: string) {
    return this.campaignsService.pause(id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  resume(@Param('id') id: string) {
    return this.campaignsService.resume(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id') id: string) {
    return this.campaignsService.cancel(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
