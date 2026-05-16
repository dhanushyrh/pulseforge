// libs/database/src/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Job } from './entities/job.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { Intelligence } from './entities/intelligence.entity';
import { ContentInsights } from './entities/content-insights.entity';
import { Creator } from './entities/creator.entity';
import { User } from './entities/user.entity';
import { InviteCode } from './entities/invite-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { IngestUsage } from './entities/ingest-usage.entity';
import { Trip } from './entities/trip.entity';
import { TripStop } from './entities/trip-stop.entity';
import { AffiliateLink } from './entities/affiliate-link.entity';
import { AffiliateClick } from './entities/affiliate-click.entity';
import { AiUsage } from './entities/ai-usage.entity';
import { PlaceDetails } from './entities/place-details.entity';
import { PlaceCommunityNote } from './entities/place-community-note.entity';
import { PlaceNoteAgree } from './entities/place-note-agree.entity';

export const DB_ENTITIES = [
  Job, MediaAsset, Intelligence, ContentInsights,
  Creator, User, InviteCode, RefreshToken, IngestUsage,
  Trip, TripStop, AffiliateLink, AffiliateClick,
  AiUsage,
  PlaceDetails, PlaceCommunityNote, PlaceNoteAgree,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     +config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: DB_ENTITIES,
        synchronize: true,   // auto-creates tables in dev; use migrations in prod
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}