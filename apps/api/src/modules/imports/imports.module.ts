import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsProcessor } from './imports.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'imports' }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
