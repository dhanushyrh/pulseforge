import {
  Controller, Get, Post, Param, Body, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { AffiliatesService } from './affiliates.service';
import { Public } from '../auth/decorators/public.decorator';

class TrackClickDto {
  @IsUUID()
  linkId: string;

  @IsUUID()
  @IsOptional()
  tripId?: string;
}

@ApiTags('Affiliates')
@Controller('v1/affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get('links/:stopId')
  @ApiOperation({ summary: 'Get affiliate links for a stop' })
  async getLinks(@Param('stopId') stopId: string) {
    return this.affiliatesService.getLinksForStop(stopId);
  }

  @Post('click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track affiliate click and get redirect URL' })
  async trackClick(@Body() dto: TrackClickDto, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id ?? 'anonymous';
    const ip     = req.ip ?? req.connection?.remoteAddress;
    const ua     = req.headers['user-agent'];
    return this.affiliatesService.trackClick(dto.linkId, userId, dto.tripId, ip, ua);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate affiliate click stats' })
  async getStats() {
    return this.affiliatesService.getStats();
  }
}
