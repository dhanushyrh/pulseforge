// apps/gateway/src/content/content.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, Intelligence, ContentInsights } from '@app/database';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Intelligence, ContentInsights]),
  ],
  controllers: [ContentController],
  providers:   [ContentService],
})
export class ContentModule {}