import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AiUsage } from '@app/database';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiUsageService, REDIS_CLIENT } from './ai-usage.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiUsage]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiUsageService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: false,
        }),
    },
  ],
  exports: [AiUsageService],
})
export class AiModule {}
