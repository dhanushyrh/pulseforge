// apps/gateway/src/ingest/ingest.controller.ts
import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import { CreateIngestDto } from './dto/create-ingest.dto';

@ApiTags('Ingest')
@Controller('v1/ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit a URL for processing' })
  @ApiResponse({ status: 202, description: 'Job queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or payload' })
  async ingest(@Body() dto: CreateIngestDto) {
    return this.ingestService.createJob(dto);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Poll job status' })
  async status(@Param('jobId') jobId: string) {
    const result = await this.ingestService.getJobStatus(jobId);
    if (!result) throw new NotFoundException(`Job ${jobId} not found`);
    return result;
  }
}