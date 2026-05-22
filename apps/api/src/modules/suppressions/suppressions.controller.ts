import {
  Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuppressionsService } from './suppressions.service';

@ApiTags('Suppressions')
@ApiBearerAuth()
@Controller('suppressions')
export class SuppressionsController {
  constructor(private readonly svc: SuppressionsService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.svc.findAll(query);
  }

  @Post()
  suppress(@Body() dto: { email: string; reason?: string; notes?: string }) {
    return this.svc.suppress(dto);
  }

  @Post('bulk')
  bulkSuppress(@Body() dto: { emails: string[]; reason?: string }) {
    return this.svc.bulkSuppress(dto.emails, dto.reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
