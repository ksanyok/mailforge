import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SendingProcessor } from './sending.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email-sending' }),
  ],
  providers: [SendingProcessor],
})
export class SendingModule {}
