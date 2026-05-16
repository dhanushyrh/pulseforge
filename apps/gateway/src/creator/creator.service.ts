// apps/gateway/src/creator/creator.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '@app/database';

@Injectable()
export class CreatorService {
  constructor(
    @InjectRepository(Creator)
    private readonly repo: Repository<Creator>,
  ) {}

  async findByHandle(handle: string): Promise<Creator | null> {
    const normalized = handle.startsWith('@') ? handle : `@${handle}`;
    return this.repo.findOne({ where: { handle: normalized } });
  }

  async findByUsernames(handles: string[]): Promise<Map<string, Creator>> {
    if (!handles.length) return new Map();
    const normalized = handles.map(h => (h.startsWith('@') ? h : `@${h}`));
    const rows = await this.repo.find({
      where: normalized.map(h => ({ handle: h })),
    });
    return new Map(rows.map(c => [c.handle, c]));
  }

  async findAll(): Promise<Creator[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { videoCount: 'DESC' },
    });
  }
}
