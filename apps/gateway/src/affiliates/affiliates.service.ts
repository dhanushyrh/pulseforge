import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AffiliateLink, AffiliateClick } from '@app/database';
import { createHash } from 'crypto';

@Injectable()
export class AffiliatesService {
  constructor(
    @InjectRepository(AffiliateLink)
    private readonly linkRepo: Repository<AffiliateLink>,
    @InjectRepository(AffiliateClick)
    private readonly clickRepo: Repository<AffiliateClick>,
  ) {}

  async getLinksForStop(stopId: string): Promise<Omit<AffiliateLink, 'url'>[]> {
    const links = await this.linkRepo.find({
      where: { tripStopId: stopId },
      order: { isFeatured: 'DESC', provider: 'ASC' },
    });
    return links.map(({ url: _url, ...safe }) => safe);
  }

  async trackClick(
    linkId: string,
    userId: string,
    tripId?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ clickId: string; redirectUrl: string }> {
    const link = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Affiliate link not found');

    const ipHash = ip
      ? createHash('sha256').update(ip).digest('hex')
      : null;

    const click = (this.clickRepo.create as any)({
      affiliateLinkId: linkId,
      userId,
      tripId:    tripId   ?? undefined,
      ipHash:    ipHash   ?? undefined,
      userAgent: userAgent ?? undefined,
      clickedAt: new Date(),
    }) as AffiliateClick;
    await this.clickRepo.save(click);

    await this.linkRepo.update(linkId, {
      clickCount:    link.clickCount + 1,
      lastClickedAt: new Date(),
    });

    return { clickId: click.id, redirectUrl: link.url };
  }

  async getStats() {
    const rows = await this.linkRepo
      .createQueryBuilder('l')
      .select('l.provider', 'provider')
      .addSelect('SUM(l.clickCount)', 'totalClicks')
      .groupBy('l.provider')
      .orderBy('totalClicks', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      provider:    r.provider,
      totalClicks: parseInt(r.totalClicks, 10),
    }));
  }
}
