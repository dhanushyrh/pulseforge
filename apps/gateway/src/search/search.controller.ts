// apps/gateway/src/search/search.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  email:  string;
  plan:   string;
}

@ApiTags('Search')
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Semantic search over user content' })
  async search(@Body() dto: SearchDto, @CurrentUser() user: RequestUser) {
    return this.searchService.search(dto, user.userId);
  }
}
