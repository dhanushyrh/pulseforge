import {
  Controller, Get, Post, Put, Delete, Param, Body,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsArray, IsInt, IsUUID, Min } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/auth.service';
import { TripsService } from './trips.service';
import { StopsService } from './stops.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { BulkImportStopsDto } from './dto/bulk-import-stops.dto';

class ReorderDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  orderedIds: string[];

  @IsInt()
  @Min(1)
  dayNumber: number;
}

@ApiTags('Trips')
@Controller('v1/trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly stopsService: StopsService,
  ) {}

  // ── Trips ──────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a trip' })
  async createTrip(@CurrentUser() user: JwtUser, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(user.userId, user.plan, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user trips' })
  async getTrips(@CurrentUser() user: JwtUser) {
    return this.tripsService.getTrips(user.userId);
  }

  @Get('shared/:token')
  @Public()
  @ApiOperation({ summary: 'Get shared trip (public)' })
  async getSharedTrip(@Param('token') token: string) {
    return this.tripsService.getSharedTrip(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip detail' })
  async getTripDetail(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.tripsService.getTripDetail(user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update trip' })
  async updateTrip(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.updateTrip(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete trip' })
  async deleteTrip(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.tripsService.deleteTrip(user.userId, id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Generate share token' })
  async share(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.tripsService.generateShareToken(user.userId, id);
  }

  // ── Stops ──────────────────────────────────────────────────────────

  @Post(':id/stops')
  @ApiOperation({ summary: 'Add a stop to a trip' })
  async addStop(@CurrentUser() user: JwtUser, @Param('id') tripId: string, @Body() dto: CreateStopDto) {
    dto.tripId = tripId;
    return this.stopsService.addStop(user.userId, dto);
  }

  @Post(':id/stops/bulk-import')
  @ApiOperation({ summary: 'Bulk import stops from ingested content' })
  async bulkImport(@CurrentUser() user: JwtUser, @Param('id') tripId: string, @Body() dto: BulkImportStopsDto) {
    return this.stopsService.bulkImportStops(user.userId, tripId, dto);
  }

  @Put(':id/stops/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder stops within a day' })
  async reorder(@CurrentUser() user: JwtUser, @Param('id') tripId: string, @Body() dto: ReorderDto) {
    return this.stopsService.reorderStops(user.userId, tripId, dto.dayNumber, dto.orderedIds);
  }

  @Put(':id/stops/:stopId')
  @ApiOperation({ summary: 'Update a stop' })
  async updateStop(
    @CurrentUser() user: JwtUser,
    @Param('id') _tripId: string,
    @Param('stopId') stopId: string,
    @Body() dto: UpdateStopDto,
  ) {
    return this.stopsService.updateStop(user.userId, stopId, dto);
  }

  @Delete(':id/stops/:stopId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stop' })
  async deleteStop(
    @CurrentUser() user: JwtUser,
    @Param('id') _tripId: string,
    @Param('stopId') stopId: string,
  ) {
    return this.stopsService.deleteStop(user.userId, stopId);
  }
}
