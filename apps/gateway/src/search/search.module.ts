// apps/gateway/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, Intelligence, ContentInsights } from '@app/database';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports:     [TypeOrmModule.forFeature([Job, Intelligence, ContentInsights])],
  controllers: [SearchController],
  providers:   [SearchService],
})
export class SearchModule {}
