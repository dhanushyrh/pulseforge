// apps/gateway/src/creator/creator.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Creator } from '@app/database';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';

@Module({
  imports:     [TypeOrmModule.forFeature([Creator])],
  controllers: [CreatorController],
  providers:   [CreatorService],
  exports:     [CreatorService],
})
export class CreatorModule {}
