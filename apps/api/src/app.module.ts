import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import Joi from 'joi';

import { PrismaModule } from './core/database/prisma.module';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ListsModule } from './modules/lists/lists.module';
import { TagsModule } from './modules/tags/tags.module';
import { ImportsModule } from './modules/imports/imports.module';
import { SuppressionsModule } from './modules/suppressions/suppressions.module';
import { SendersModule } from './modules/senders/senders.module';
import { WarmupModule } from './modules/warmup/warmup.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SendingModule } from './modules/sending/sending.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { DeliverabilityModule } from './modules/deliverability/deliverability.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_TTL: Joi.number().default(900),
        JWT_REFRESH_TTL: Joi.number().default(604800),
        ENCRYPTION_KEY: Joi.string().min(16).required(),
        APP_URL: Joi.string().default('http://localhost:3001'),
        FRONTEND_URL: Joi.string().default('http://localhost:3000'),
        UPLOAD_DIR: Joi.string().default('./uploads'),
        MAX_IMPORT_FILE_SIZE_MB: Joi.number().default(50),
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Cron / scheduler
    ScheduleModule.forRoot(),

    // Bull queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL'),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ContactsModule,
    ListsModule,
    TagsModule,
    ImportsModule,
    SuppressionsModule,
    SendersModule,
    WarmupModule,
    TemplatesModule,
    CampaignsModule,
    SendingModule,
    TrackingModule,
    DeliverabilityModule,
    AnalyticsModule,
    NotificationsModule,
    RecommendationsModule,
    ActivityModule,
    SettingsModule,
  ],
  providers: [
    // Apply guards globally
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
