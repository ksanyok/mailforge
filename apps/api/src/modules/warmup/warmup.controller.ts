import {
  Controller, Get, Post, Put, Body, Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WarmupService } from './warmup.service';

@ApiTags('Warmup')
@ApiBearerAuth()
@Controller('warmup')
export class WarmupController {
  constructor(private readonly warmupService: WarmupService) {}

  @Get()
  findAll() {
    return this.warmupService.findAll();
  }

  @Get(':senderId/rule')
  getRule(@Param('senderId') senderId: string) {
    return this.warmupService.getRule(senderId);
  }

  @Get(':senderId/logs')
  getLogs(@Param('senderId') senderId: string) {
    return this.warmupService.getLogs(senderId);
  }

  @Get(':senderId/progress')
  getProgress(@Param('senderId') senderId: string) {
    return this.warmupService.getProgress(senderId);
  }

  @Put(':senderId/rule')
  upsertRule(@Param('senderId') senderId: string, @Body() dto: any) {
    return this.warmupService.upsertRule(senderId, dto);
  }

  @Post('advance')
  advanceAll() {
    return this.warmupService.advanceAllSenders();
  }
}
