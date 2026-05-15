// apps/worker-media/src/media.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as MinioClient } from 'minio';
import { execFileSync, execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Job, MediaAsset } from '@app/database';

@Injectable()
export class MediaService {
  private readonly logger:     Logger = new Logger(MediaService.name);
  private readonly minio:      MinioClient;
  private readonly bucket:     string;
  private readonly ytDlpPath:  string;
  private readonly ffmpegDir:  string;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(MediaAsset)
    private readonly mediaRepo: Repository<MediaAsset>,
  ) {
    this.bucket    = process.env.MINIO_BUCKET ?? 'pulseforge-media';
    this.ytDlpPath = this.resolveYtDlp();
    this.ffmpegDir = this.resolveFfmpegDir();
    this.minio     = new MinioClient({
      endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
      port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL:    false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });

    this.logger.log(`yt-dlp → ${this.ytDlpPath}`);
    this.logger.log(`ffmpeg → ${this.ffmpegDir}`);
  }

  // ── Path Resolution ──────────────────────────────────────

  private resolveYtDlp(): string {
    // 1. Explicit env override
    if (process.env.YT_DLP_PATH) {
      if (!existsSync(process.env.YT_DLP_PATH)) {
        throw new Error(`YT_DLP_PATH set but not found: ${process.env.YT_DLP_PATH}`);
      }
      return process.env.YT_DLP_PATH;
    }

    // 3. Hardcoded Homebrew locations as fallback
    const candidates = [
      '/opt/homebrew/bin/yt-dlp',   // Apple Silicon
      '/usr/local/bin/yt-dlp',      // Intel Mac
      '/usr/bin/yt-dlp',            // Linux
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }

    throw new Error('yt-dlp not found. Run: brew install yt-dlp');
  }

  private resolveFfmpegDir(): string {
    // 1. Explicit env override
    if (process.env.FFMPEG_DIR && existsSync(process.env.FFMPEG_DIR)) {
      return process.env.FFMPEG_DIR;
    }

    // 2. which ffmpeg — returns binary path, we need the directory
    try {
      const found = execSync('which ffmpeg', {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
        },
      }).trim();
      if (found && existsSync(found)) return path.dirname(found);
    } catch {}

    // 3. Hardcoded Homebrew locations as fallback
    const candidates = [
      '/opt/homebrew/bin',   // Apple Silicon
      '/usr/local/bin',      // Intel Mac
      '/usr/bin',            // Linux
    ];
    for (const candidate of candidates) {
      if (existsSync(path.join(candidate, 'ffmpeg'))) return candidate;
    }

    throw new Error('ffmpeg not found. Run: brew install ffmpeg');
  }

  // ── Bucket ───────────────────────────────────────────────

  async ensureBucket(): Promise<void> {
    const exists = await this.minio.bucketExists(this.bucket);
    if (!exists) {
      await this.minio.makeBucket(this.bucket);
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }
  }

  // ── Download + Upload ────────────────────────────────────

  async downloadAndUpload(
    jobId: string,
    url:   string,
  ): Promise<{ mediaId: string; storagePath: string }> {
    const tmpDir  = os.tmpdir();
    const tmpFile = path.join(tmpDir, `${jobId}.mp3`);

    try {
      this.logger.log(`[${jobId}] Downloading audio from: ${url}`);

      execFileSync(
        this.ytDlpPath,
        [
          '-x',
          '--audio-format',    'mp3',
          '--audio-quality',   '0',
          '--no-playlist',
          '--ffmpeg-location', this.ffmpegDir,
          '-o', tmpFile,
          url,
        ],
        {
          timeout: 120_000,
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
          },
        },
      );

      if (!existsSync(tmpFile)) {
        throw new Error(`yt-dlp produced no output at: ${tmpFile}`);
      }

      this.logger.log(`[${jobId}] Download complete, uploading to MinIO`);

      // Upload to MinIO
      const objectName = `audio/${jobId}.mp3`;
      await this.minio.fPutObject(this.bucket, objectName, tmpFile, {
        'Content-Type': 'audio/mpeg',
      });

      const storagePath = `${this.bucket}/${objectName}`;
      this.logger.log(`[${jobId}] Uploaded → ${storagePath}`);

      // Persist MediaAsset record
      const asset = this.mediaRepo.create({
        jobId,
        storagePath,
        type:     'audio',
        platform: this.detectPlatform(url),
      });
      await this.mediaRepo.save(asset);

      return { mediaId: asset.id, storagePath };

    } finally {
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
        this.logger.log(`[${jobId}] Temp file cleaned up`);
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  private detectPlatform(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com'))                            return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com'))    return 'twitter';
    return 'other';
  }
}