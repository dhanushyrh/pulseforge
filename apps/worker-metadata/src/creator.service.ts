import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '@app/database';
import type { CreatorData } from './metadata.service';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);

  constructor(
    @InjectRepository(Creator)
    private readonly repo: Repository<Creator>,
  ) {}

  async upsert(
    data:        CreatorData,
    country:     string | null,
    contentType: string,
    confidence:  number,
    entities:    string[],
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { handle: data.handle } });

    if (!existing) {
      await this.repo.save(this.repo.create({
        handle:              data.handle,
        displayName:         data.displayName  ?? undefined,
        platform:            data.platform,
        platformId:          data.platformId   ?? undefined,
        profileUrl:          data.profileUrl   ?? undefined,
        bio:                 data.bio          ?? undefined,
        avatarUrl:           data.avatarUrl    ?? undefined,
        videoCount:          1,
        avgCommentCount:     data.commentCount ?? undefined,
        avgTravelConfidence: confidence,
        topCountries:        country ? [country] : [],
        contentTypes:        [contentType],
        topEntities:         entities.slice(0, 10),
      }));
    } else {
      const newCount = (existing.videoCount ?? 0) + 1;

      const avgCommentCount = data.commentCount != null
        ? (((existing.avgCommentCount ?? 0) * (existing.videoCount ?? 0)) + data.commentCount) / newCount
        : existing.avgCommentCount;

      const avgTravelConfidence =
        (((existing.avgTravelConfidence ?? 0) * (existing.videoCount ?? 0)) + confidence) / newCount;

      const topCountries = Array.from(new Set([
        ...(existing.topCountries ?? []),
        ...(country ? [country] : []),
      ])).slice(0, 10);

      const contentTypes = Array.from(new Set([
        ...(existing.contentTypes ?? []),
        contentType,
      ]));

      const topEntities = Array.from(new Set([
        ...(existing.topEntities ?? []),
        ...entities,
      ])).slice(0, 20);

      await this.repo.update({ handle: data.handle }, {
        ...(data.displayName != null && { displayName: data.displayName }),
        ...(data.platformId  != null && { platformId:  data.platformId  }),
        ...(data.profileUrl  != null && { profileUrl:  data.profileUrl  }),
        ...(data.bio         != null && { bio:         data.bio         }),
        ...(data.avatarUrl   != null && { avatarUrl:   data.avatarUrl   }),
        videoCount: newCount,
        avgCommentCount,
        avgTravelConfidence,
        topCountries,
        contentTypes,
        topEntities,
      });
    }

    this.logger.log(`Creator upserted: ${data.handle} (${data.platform})`);
  }
}
