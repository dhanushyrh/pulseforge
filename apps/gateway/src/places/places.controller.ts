import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/auth.service';
import { PlacesService } from './places.service';
import { AddNoteDto, UpdatePrivateNoteDto } from './dto/place.dto';

@ApiTags('Places')
@Controller('v1/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get(':googlePlaceId')
  @ApiOperation({ summary: 'Get cached Place Details' })
  getPlaceDetails(@Param('googlePlaceId') googlePlaceId: string) {
    return this.placesService.getPlaceDetails(googlePlaceId);
  }

  @Get(':googlePlaceId/full')
  @ApiOperation({ summary: 'Get place with community notes and sources' })
  getPlaceFull(
    @CurrentUser() user: JwtUser,
    @Param('googlePlaceId') googlePlaceId: string,
    @Query('tripStopId') tripStopId?: string,
  ) {
    return this.placesService.getPlaceWithContext(googlePlaceId, user.userId, tripStopId);
  }

  @Get(':googlePlaceId/notes')
  @ApiOperation({ summary: 'Get community notes for a place' })
  getNotes(
    @CurrentUser() user: JwtUser,
    @Param('googlePlaceId') googlePlaceId: string,
  ) {
    return this.placesService.getCommunityNotes(googlePlaceId, user.userId);
  }

  @Post(':googlePlaceId/notes')
  @ApiOperation({ summary: 'Add a community note' })
  addNote(
    @CurrentUser() user: JwtUser,
    @Param('googlePlaceId') googlePlaceId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.placesService.addCommunityNote(googlePlaceId, user.userId, dto.note);
  }

  @Delete(':googlePlaceId/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own community note' })
  deleteNote(
    @CurrentUser() user: JwtUser,
    @Param('googlePlaceId') googlePlaceId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.placesService.deleteCommunityNote(googlePlaceId, noteId, user.userId);
  }

  @Post('notes/:noteId/agree')
  @ApiOperation({ summary: 'Toggle agree on a community note' })
  agreeNote(
    @CurrentUser() user: JwtUser,
    @Param('noteId') noteId: string,
  ) {
    return this.placesService.agreeWithNote(noteId, user.userId);
  }

  @Post(':googlePlaceId/refresh')
  @ApiOperation({ summary: 'Request a refresh of Place Details' })
  refreshPlace(@Param('googlePlaceId') googlePlaceId: string) {
    return this.placesService.refreshPlaceDetails(googlePlaceId);
  }
}

// Private note endpoint hangs off trips — separate controller prefix
import { Controller as NestController, Patch as NestPatch, Param as NestParam, Body as NestBody } from '@nestjs/common';
import { CurrentUser as NestCurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Trips')
@NestController('v1/trips')
export class TripsStopNoteController {
  constructor(private readonly placesService: PlacesService) {}

  @NestPatch(':tripId/stops/:stopId/private-note')
  @ApiOperation({ summary: 'Update private note on a trip stop' })
  updatePrivateNote(
    @NestCurrentUser() user: JwtUser,
    @NestParam('tripId') tripId: string,
    @NestParam('stopId') stopId: string,
    @NestBody() dto: UpdatePrivateNoteDto,
  ) {
    return this.placesService.updatePrivateNote(tripId, stopId, user.userId, dto.note);
  }
}
