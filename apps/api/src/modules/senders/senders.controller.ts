import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SendersService } from './senders.service';
import { MailboxService } from './mailbox.service';

@ApiTags('Senders')
@ApiBearerAuth()
@Controller('senders')
export class SendersController {
  constructor(
    private readonly sendersService: SendersService,
    private readonly mailboxService: MailboxService,
  ) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.sendersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sendersService.findOne(id);
  }

  @Get(':id/health-logs')
  getHealthLogs(@Param('id') id: string) {
    return this.sendersService.getHealthLogs(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.sendersService.create(dto);
  }

  @Post(':id/test')
  testConnection(@Param('id') id: string, @Body('to') to: string) {
    return this.sendersService.testConnection(id, to);
  }

  @Post(':id/reset-status')
  resetStatus(@Param('id') id: string) {
    return this.sendersService.resetStatus(id);
  }

  @Post(':id/health')
  updateHealth(@Param('id') id: string) {
    return this.sendersService.updateHealthScore(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.sendersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.sendersService.remove(id);
  }

  @Post(':id/provision-mailbox')
  provisionMailbox(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    return this.mailboxService.provisionMailbox(id, password);
  }

  @Delete(':id/remove-mailbox')
  removeMailbox(
    @Param('id') id: string,
    @Body('deleteFiles') deleteFiles?: boolean,
  ) {
    return this.mailboxService.removeMailbox(id, deleteFiles);
  }
}
