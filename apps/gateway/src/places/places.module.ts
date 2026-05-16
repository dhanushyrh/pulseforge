import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PlaceDetails, PlaceCommunityNote, PlaceNoteAgree,
  TripStop, Trip, Job,
} from '@app/database';
import { PlacesService } from './places.service';
import { PlacesController, TripsStopNoteController } from './places.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaceDetails, PlaceCommunityNote, PlaceNoteAgree,
      TripStop, Trip, Job,
    ]),
  ],
  providers:   [PlacesService],
  controllers: [PlacesController, TripsStopNoteController],
  exports:     [PlacesService],
})
export class PlacesModule {}
