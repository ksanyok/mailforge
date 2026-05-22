import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email-sending' }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
