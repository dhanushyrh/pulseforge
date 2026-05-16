import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Trip, TripStop, AffiliateLink, ContentInsights, Job } from '@app/database';
import { QUEUES } from '@app/queue';
import { TripsService } from './trips.service';
import { StopsService } from './stops.service';
import { TripsController } from './trips.controller';
import { MapsModule } from '../maps/maps.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripStop, AffiliateLink, ContentInsights, Job]),
    BullModule.registerQueue({ name: QUEUES.GEOCODE }),
    MapsModule,
    AffiliatesModule,
  ],
  providers: [TripsService, StopsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
