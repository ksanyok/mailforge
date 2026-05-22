import { Controller, Get, Patch, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; severity?: string }) {
    return this.recommendationsService.findAll(query);
  }

  @Patch(':id/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  dismiss(@Param('id') id: string) {
    return this.recommendationsService.dismiss(id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string) {
    return this.recommendationsService.markRead(id);
  }
}
