import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('daily')
  getDailyMetrics(@Query('days') days?: number) {
    return this.analyticsService.getDailyMetrics(days ? +days : 30);
  }

  @Get('senders')
  getSenderComparison() {
    return this.analyticsService.getSenderComparison();
  }

  @Get('campaigns/comparison')
  getCampaignComparison(@Query('limit') limit?: number) {
    return this.analyticsService.getCampaignComparison(limit ? +limit : 10);
  }
}
