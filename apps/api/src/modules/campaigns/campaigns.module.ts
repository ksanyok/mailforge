import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { FollowUpService } from './follow-up.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'email-sending' }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, FollowUpService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
