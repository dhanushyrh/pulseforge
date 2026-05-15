// apps/worker-transcript/src/transcript.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as MinioClient } from 'minio';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Job, Intelligence } from '@app/database';

@Injectable()
export class TranscriptService {
  private readonly logger:     Logger = new Logger(TranscriptService.name);
  private readonly minio:      MinioClient;
  private readonly pythonPath: string;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Intelligence)
    private readonly intelligenceRepo: Repository<Intelligence>,
  ) {
    this.pythonPath = this.resolvePython();
    this.minio      = new MinioClient({
      endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
      port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL:    false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });

    this.logger.log(`python → ${this.pythonPath}`);
  }

  // ── Path Resolution ──────────────────────────────────────

  private resolvePython(): string {
    // 1. Explicit env override
    if (process.env.PYTHON_PATH && existsSync(process.env.PYTHON_PATH)) {
      return process.env.PYTHON_PATH;
    }

    // 2. Venv python — has faster_whisper installed
    const venvPython = path.join(
      process.cwd(),
      'apps/embedding-sidecar/venv/bin/python3',
    );
    if (existsSync(venvPython)) return venvPython;

    // 3. System python3
    try {
      const found = execSync('which python3', {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
        },
      }).trim();
      if (found && existsSync(found)) return found;
    } catch {}

    throw new Error('python3 not found');
  }

  // ── Transcribe ───────────────────────────────────────────

  async transcribe(
    jobId:       string,
    storagePath: string,
  ): Promise<{ transcriptId: string; rawText: string }> {
    const tmpDir    = os.tmpdir();
    const audioFile = path.join(tmpDir, `${jobId}-audio.mp3`);
    const scriptFile = path.join(tmpDir, `whisper_${jobId}.py`);

    try {
      // Download audio from MinIO
      const [bucket, ...rest] = storagePath.split('/');
      const objectName        = rest.join('/');
      await this.minio.fGetObject(bucket, objectName, audioFile);
      this.logger.log(`[${jobId}] Audio downloaded, starting Whisper`);

      // Write whisper script to temp file
      const whisperScript = `
import json
from faster_whisper import WhisperModel

model    = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioFile.replace(/\\/g, '/')}", beam_size=5)

result = { "segments": [], "rawText": "" }
texts  = []

for s in segments:
    result["segments"].append({
        "start": s.start,
        "end":   s.end,
        "text":  s.text.strip()
    })
    texts.append(s.text.strip())

result["rawText"] = " ".join(texts)
print(json.dumps(result))
`.trim();

      writeFileSync(scriptFile, whisperScript);

      // Run with venv python
      const output = execSync(`"${this.pythonPath}" "${scriptFile}"`, {
        timeout:   300_000,
        maxBuffer: 10 * 1024 * 1024,
        encoding:  'utf8',
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
        },
      });

      const parsed = JSON.parse(output.trim());
      this.logger.log(`[${jobId}] Transcription complete — ${parsed.segments.length} segments`);

      // Persist to Intelligence table
      const intel = this.intelligenceRepo.create({
        jobId,
        rawText: parsed.rawText,
      });
      await this.intelligenceRepo.save(intel);

      return { transcriptId: intel.id, rawText: parsed.rawText };

    } finally {
      if (existsSync(audioFile))  unlinkSync(audioFile);
      if (existsSync(scriptFile)) unlinkSync(scriptFile);
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.jobRepo.update({ id: jobId }, { status });
  }
}