import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@mailforge/shared';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settingsService.get(key);
  }

  @Put(':key')
  @Roles(Role.ADMIN)
  set(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.set(key, value);
  }

  @Put()
  @Roles(Role.ADMIN)
  bulkUpdate(@Body() settings: { key: string; value: string }[]) {
    return this.settingsService.bulkUpdate(settings);
  }
}
