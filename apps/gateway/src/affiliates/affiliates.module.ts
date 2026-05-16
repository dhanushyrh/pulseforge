import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliateLink, AffiliateClick, TripStop } from '@app/database';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateGeneratorService } from './affiliate-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([AffiliateLink, AffiliateClick, TripStop])],
  providers: [AffiliatesService, AffiliateGeneratorService],
  controllers: [AffiliatesController],
  exports: [AffiliatesService, AffiliateGeneratorService],
})
export class AffiliatesModule {}
