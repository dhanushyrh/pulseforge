// apps/worker-metadata/src/metadata.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Job } from '@app/database';

const execFileAsync = promisify(execFile);

export interface VideoChapter {
  title:     string;
  startTime: number;
  endTime:   number;
}

export interface ExtractedMetadata {
  caption:     string | null;
  description: string | null;
  creator:     string | null;
  country:     string | null;
  countryCode: string | null;
  contentType: string;
  platform:    string;
  duration:    number | null;
  chapters:    VideoChapter[];
  tags:        string[];
  thumbnail:   string | null;
  viewCount:   number | null;
  uploadDate:  string | null;
}

@Injectable()
export class MetadataService {
  private readonly logger      = new Logger(MetadataService.name);
  private readonly ytDlpPath:  string;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {
    this.ytDlpPath = this.resolveYtDlp();
    this.logger.log(`yt-dlp → ${this.ytDlpPath}`);
  }

  // ── Extract metadata via yt-dlp --dump-json ──────────────
  async extract(jobId: string, url: string): Promise<ExtractedMetadata> {
    this.logger.log(`[${jobId}] Extracting metadata from: ${url}`);

    try {
      // --dump-json fetches metadata only — no download
      const { stdout: raw } = await execFileAsync(
        this.ytDlpPath,
        [
          '--dump-json',
          '--no-playlist',
          '--no-warnings',
          url,
        ],
        {
          timeout: 30_000,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
          },
        }
      );

      const meta = JSON.parse(raw);
      this.logger.log(
        `[${jobId}] Metadata extracted — title: ${meta} · ` +
        `uploader: ${meta.uploader ?? 'N/A'} · ` +
        `duration: ${meta.duration ?? 'N/A'}s`
      );
      return this.parseMetadata(meta, url);

    } catch (err) {
      // Metadata extraction is best-effort — never fail the pipeline
      this.logger.warn(`[${jobId}] Metadata extraction failed: ${err instanceof Error ? err.message : String(err)}, using defaults`);
      return this.defaultMetadata(url);
    }
  }

  // ── Persist metadata to job record ──────────────────────
  async persistMetadata(jobId: string, meta: ExtractedMetadata): Promise<void> {
    await this.jobRepo.update({ id: jobId }, {
      caption:     meta.caption    ?? undefined,
      description: meta.description ?? undefined,
      creator:     meta.creator    ?? undefined,
      country:     meta.country    ?? undefined,
      countryCode: meta.countryCode ?? undefined,
      contentType: meta.contentType,
      platform:    meta.platform,
      duration:    meta.duration   ?? undefined,
      chapters:    meta.chapters.length ? meta.chapters : undefined,
      tags:        meta.tags.length     ? meta.tags     : undefined,
      thumbnail:   meta.thumbnail  ?? undefined,
      viewCount:   meta.viewCount  ?? undefined,
      uploadDate:  meta.uploadDate ?? undefined,
    });
    this.logger.log(
      `[${jobId}] Metadata persisted — ${meta.creator} · ${meta.country ?? 'unknown'} · ` +
      `${meta.contentType} · ${meta.chapters.length} chapters · ${meta.tags.length} tags`
    );
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  // ── Parse yt-dlp JSON output ─────────────────────────────
  private parseMetadata(meta: any, url: string): ExtractedMetadata {
    const platform    = this.detectPlatform(url);
    const contentType = this.detectContentType(url, meta);

    // Caption — yt-dlp calls it 'title' for YouTube, 'description' for Instagram
    const caption = meta.title
      ?? meta.fulltitle
      ?? meta.description?.split('\n')[0]
      ?? null;

    // Description — full text body
    const description = meta.description ?? null;

    // Creator handle
    const creator = meta.uploader_id
      ? (meta.uploader_id.startsWith('@') ? meta.uploader_id : `@${meta.uploader_id}`)
      : meta.uploader
      ?? meta.channel
      ?? null;

    // Country — yt-dlp sometimes provides this directly
    const rawCountry = meta.location
      ?? meta.uploader_url?.match(/country=([A-Z]{2})/i)?.[1]
      ?? null;

    const { country, countryCode } = this.resolveCountry(rawCountry, meta);

    const chapters: VideoChapter[] = (meta.chapters ?? []).map((c: any) => ({
      title:     String(c.title ?? ''),
      startTime: Number(c.start_time ?? 0),
      endTime:   Number(c.end_time ?? 0),
    }));

    const tags: string[] = (meta.tags ?? []).slice(0, 30).map(String);

    return {
      caption:     this.truncate(caption, 500),
      description: this.truncate(description, 2000),
      creator,
      country,
      countryCode,
      contentType,
      platform,
      duration:    meta.duration ?? null,
      chapters,
      tags,
      thumbnail:   meta.thumbnail ?? null,
      viewCount:   meta.view_count ?? null,
      uploadDate:  meta.upload_date ?? null,
    };
  }

  // ── Country resolution ───────────────────────────────────
  private resolveCountry(
    rawCountry: string | null,
    meta: any,
  ): { country: string | null; countryCode: string | null } {
    // Try tags / categories for country hints
    const tags = [
      ...(meta.tags        ?? []),
      ...(meta.categories  ?? []),
    ].join(' ').toLowerCase();

    const COUNTRY_MAP: Record<string, { name: string; code: string }> = {
      japan:        { name: 'Japan',        code: 'JP' },
      tokyo:        { name: 'Japan',        code: 'JP' },
      osaka:        { name: 'Japan',        code: 'JP' },
      kyoto:        { name: 'Japan',        code: 'JP' },
      thailand:     { name: 'Thailand',     code: 'TH' },
      bangkok:      { name: 'Thailand',     code: 'TH' },
      'chiang mai': { name: 'Thailand',     code: 'TH' },
      bali:         { name: 'Indonesia',    code: 'ID' },
      indonesia:    { name: 'Indonesia',    code: 'ID' },
      italy:        { name: 'Italy',        code: 'IT' },
      rome:         { name: 'Italy',        code: 'IT' },
      florence:     { name: 'Italy',        code: 'IT' },
      vietnam:      { name: 'Vietnam',      code: 'VN' },
      'ho chi minh':{ name: 'Vietnam',      code: 'VN' },
      hanoi:        { name: 'Vietnam',      code: 'VN' },
      india:        { name: 'India',        code: 'IN' },
      mumbai:       { name: 'India',        code: 'IN' },
      delhi:        { name: 'India',        code: 'IN' },
      greece:       { name: 'Greece',       code: 'GR' },
      santorini:    { name: 'Greece',       code: 'GR' },
      mexico:       { name: 'Mexico',       code: 'MX' },
      france:       { name: 'France',       code: 'FR' },
      paris:        { name: 'France',       code: 'FR' },
      spain:        { name: 'Spain',        code: 'ES' },
      barcelona:    { name: 'Spain',        code: 'ES' },
      portugal:     { name: 'Portugal',     code: 'PT' },
      lisbon:       { name: 'Portugal',     code: 'PT' },
      morocco:      { name: 'Morocco',      code: 'MA' },
      turkey:       { name: 'Turkey',       code: 'TR' },
      istanbul:     { name: 'Turkey',       code: 'TR' },
      dubai:        { name: 'UAE',          code: 'AE' },
      'sri lanka':  { name: 'Sri Lanka',    code: 'LK' },
      nepal:        { name: 'Nepal',        code: 'NP' },
      maldives:     { name: 'Maldives',     code: 'MV' },
      singapore:    { name: 'Singapore',    code: 'SG' },
      malaysia:     { name: 'Malaysia',     code: 'MY' },
      'kuala lumpur':{ name: 'Malaysia',    code: 'MY' },
      cambodia:     { name: 'Cambodia',     code: 'KH' },
      'siem reap':  { name: 'Cambodia',     code: 'KH' },
      philippines:  { name: 'Philippines',  code: 'PH' },
      'new zealand':{ name: 'New Zealand',  code: 'NZ' },
      australia:    { name: 'Australia',    code: 'AU' },
      sydney:       { name: 'Australia',    code: 'AU' },
      peru:         { name: 'Peru',         code: 'PE' },
      'machu picchu':{ name: 'Peru',        code: 'PE' },
      iceland:      { name: 'Iceland',      code: 'IS' },
      reykjavik:    { name: 'Iceland',      code: 'IS' },
      switzerland:  { name: 'Switzerland',  code: 'CH' },
      austria:      { name: 'Austria',      code: 'AT' },
      germany:      { name: 'Germany',      code: 'DE' },
      amsterdam:    { name: 'Netherlands',  code: 'NL' },
      croatia:      { name: 'Croatia',      code: 'HR' },
      'south korea':{ name: 'South Korea',  code: 'KR' },
      seoul:        { name: 'South Korea',  code: 'KR' },
      taiwan:       { name: 'Taiwan',       code: 'TW' },
      taipei:       { name: 'Taiwan',       code: 'TW' },
      china:        { name: 'China',        code: 'CN' },
      'hong kong':  { name: 'Hong Kong',    code: 'HK' },
    };

    // Search tags + caption + description
    const searchText = `${tags} ${meta.title ?? ''} ${meta.description ?? ''}`.toLowerCase();

    for (const [keyword, val] of Object.entries(COUNTRY_MAP)) {
      if (searchText.includes(keyword)) {
        return { country: val.name, countryCode: val.code };
      }
    }

    // Use rawCountry from yt-dlp if available
    if (rawCountry) {
      const known = Object.values(COUNTRY_MAP).find(
        v => v.code === rawCountry.toUpperCase() || v.name.toLowerCase() === rawCountry.toLowerCase()
      );
      if (known) return { country: known.name, countryCode: known.code };
      return { country: rawCountry, countryCode: null };
    }

    return { country: null, countryCode: null };
  }

  // ── Content type detection ───────────────────────────────
  private detectContentType(url: string, meta: any): string {
    if (url.includes('instagram.com/reel'))   return 'reel';
    if (url.includes('instagram.com/p/'))     return 'reel';
    if (url.includes('/shorts/'))             return 'short';
    if (url.includes('tiktok.com'))           return 'short';
    if (meta.duration && meta.duration < 90)  return 'short';
    if (meta.duration && meta.duration > 600) return 'vlog';
    return 'vlog';
  }

  private detectPlatform(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com'))  return 'instagram';
    if (url.includes('tiktok.com'))     return 'tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'other';
  }

  private defaultMetadata(url: string): ExtractedMetadata {
    return {
      caption:     null,
      description: null,
      creator:     null,
      country:     null,
      countryCode: null,
      contentType: this.detectContentType(url, {}),
      platform:    this.detectPlatform(url),
      duration:    null,
      chapters:    [],
      tags:        [],
      thumbnail:   null,
      viewCount:   null,
      uploadDate:  null,
    };
  }

  private truncate(str: string | null, max: number): string | null {
    if (!str) return null;
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  private resolveYtDlp(): string {
    if (process.env.YT_DLP_PATH && existsSync(process.env.YT_DLP_PATH)) {
      return process.env.YT_DLP_PATH;
    }
    const candidates = [
      '/opt/homebrew/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      path.join(process.cwd(), 'apps/embedding-sidecar/venv/bin/yt-dlp'),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    throw new Error('yt-dlp not found');
  }
}