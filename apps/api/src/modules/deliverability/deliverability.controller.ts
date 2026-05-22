import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliverabilityService } from './deliverability.service';

@ApiTags('Deliverability')
@ApiBearerAuth()
@Controller('deliverability')
export class DeliverabilityController {
  constructor(private readonly deliverabilityService: DeliverabilityService) {}

  @Get(':senderId')
  getSummary(@Param('senderId') senderId: string) {
    return this.deliverabilityService.getSummary(senderId);
  }

  @Get(':senderId/checks')
  getChecks(@Param('senderId') senderId: string) {
    return this.deliverabilityService.getChecks(senderId);
  }

  @Post(':senderId/check')
  runCheck(@Param('senderId') senderId: string) {
    return this.deliverabilityService.checkSender(senderId);
  }
}
