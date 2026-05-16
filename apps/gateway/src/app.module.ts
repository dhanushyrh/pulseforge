// apps/gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { DatabaseModule } from '@app/database';
import { QUEUES } from '@app/queue';
import { IngestModule }     from './ingest/ingest.module';
import { SearchModule }     from './search/search.module';
import { ContentModule }    from './content/content.module';
import { CreatorModule }    from './creator/creator.module';
import { AuthModule }       from './auth/auth.module';
import { JwtAuthGuard }     from './auth/guards/jwt-auth.guard';
import { TripsModule }      from './trips/trips.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { MapsModule }       from './maps/maps.module';
import { AiModule }         from './ai/ai.module';
import { PlacesModule }     from './places/places.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1_000,  limit: 5   },
      { name: 'medium', ttl: 60_000, limit: 100  },
    ]),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),

    BullModule.registerQueue(
      { name: QUEUES.MEDIA },
      { name: QUEUES.METADATA },
      { name: QUEUES.CLASSIFIER },
      { name: QUEUES.TRANSCRIPT },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.SUMMARY },
      { name: QUEUES.GEOCODE },
    ),

    BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.MEDIA,      adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.METADATA,   adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.CLASSIFIER, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.TRANSCRIPT, adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.EMBEDDING,  adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.SUMMARY,    adapter: BullMQAdapter }),
    BullBoardModule.forFeature({ name: QUEUES.GEOCODE,    adapter: BullMQAdapter }),

    DatabaseModule,
    AuthModule,
    IngestModule,
    SearchModule,
    ContentModule,
    CreatorModule,
    TripsModule,
    AffiliatesModule,
    MapsModule,
    AiModule,
    PlacesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
