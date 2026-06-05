import { Module } from '@nestjs/common';
import { SendersController } from './senders.controller';
import { SendersService } from './senders.service';
import { MailboxService } from './mailbox.service';

@Module({
  controllers: [SendersController],
  providers: [SendersService, MailboxService],
  exports: [SendersService, MailboxService],
})
export class SendersModule {}
