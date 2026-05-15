// apps/gateway/src/search/search.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';

@ApiTags('Search')
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Semantic search over ingested content' })
  async search(@Body() dto: SearchDto) {
    return this.searchService.search(dto);
  }
}