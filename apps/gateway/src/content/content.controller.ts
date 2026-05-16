// apps/gateway/src/content/content.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { ContentQueryDto } from './dto/content-query.dto';

@ApiTags('Content')
@Controller('v1/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'List ingested content with filters' })
  async findAll(@Query() dto: ContentQueryDto) {
    return this.contentService.findAll(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate stats for the dashboard' })
  async getStats() {
    return this.contentService.getStats();
  }

  @Get('countries')
  @ApiOperation({ summary: 'Distinct countries with content counts' })
  async getCountries() {
    return this.contentService.getCountries();
  }

  @Get('types')
  @ApiOperation({ summary: 'Content types with counts' })
  async getTypes() {
    return this.contentService.getTypes();
  }

  @Get('creators')
  @ApiOperation({ summary: 'All creators ordered by video count' })
  async getCreators() {
    return this.contentService.getCreators();
  }

  @Get('creators/:handle')
  @ApiOperation({ summary: 'Creator profile + their videos' })
  async getCreatorByHandle(@Param('handle') handle: string) {
    const decoded = decodeURIComponent(handle);
    const creator = await this.contentService.getCreatorByHandle(decoded);
    if (!creator) throw new NotFoundException(`Creator ${decoded} not found`);
    return creator;
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Single content item with intelligence' })
  async findOne(@Param('jobId') jobId: string) {
    const item = await this.contentService.findOne(jobId);
    if (!item) throw new NotFoundException(`Content ${jobId} not found`);
    return item;
  }

  @Get(':jobId/insights')
  @ApiOperation({ summary: 'Structured insights for a content item' })
  async getInsights(@Param('jobId') jobId: string) {
    const data = await this.contentService.getInsights(jobId);
    if (!data) throw new NotFoundException(`Insights for ${jobId} not found`);
    return data;
  }
}
