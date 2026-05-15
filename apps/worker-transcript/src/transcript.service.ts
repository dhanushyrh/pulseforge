// apps/worker-transcript/src/transcript.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as MinioClient } from 'minio';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync, readdirSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Job, Intelligence } from '@app/database';

@Injectable()
export class TranscriptService {
  private readonly logger:     Logger = new Logger(TranscriptService.name);
  private readonly minio:      MinioClient;
  private readonly pythonPath: string;
  private readonly ytDlpPath:  string;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Intelligence)
    private readonly intelligenceRepo: Repository<Intelligence>,
  ) {
    this.pythonPath = this.resolvePython();
    this.ytDlpPath  = this.resolveYtDlp();
    this.minio      = new MinioClient({
      endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
      port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL:    false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });

    this.logger.log(`python → ${this.pythonPath}`);
    this.logger.log(`yt-dlp → ${this.ytDlpPath}`);
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
    url:         string,
    description: string | null,
  ): Promise<{ transcriptId: string; rawText: string }> {
    const tmpDir     = os.tmpdir();
    const audioFile  = path.join(tmpDir, `${jobId}-audio.mp3`);
    const scriptFile = path.join(tmpDir, `whisper_${jobId}.py`);
    const ocrScript  = path.join(tmpDir, `ocr_${jobId}.py`);
    let   actualVideoFile = '';

    try {
      // Download audio from MinIO
      const [bucket, ...rest] = storagePath.split('/');
      const objectName        = rest.join('/');
      await this.minio.fGetObject(bucket, objectName, audioFile);
      this.logger.log(`[${jobId}] Audio downloaded, starting Whisper`);

      // Write and run Whisper script
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

      const whisperOutput = execSync(`"${this.pythonPath}" "${scriptFile}"`, {
        timeout:   300_000,
        maxBuffer: 10 * 1024 * 1024,
        encoding:  'utf8',
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
        },
      });

      const parsed = JSON.parse(whisperOutput.trim());
      this.logger.log(`[${jobId}] Transcription complete — ${parsed.segments.length} segments`);

      // ── OCR: download video + sample frames ──────────────
      let ocrText = '';
      try {
        const videoBase = `${jobId}-video`;
        // Use %(ext)s so yt-dlp picks the extension — avoids mismatch when video is .webm/.mkv
        execSync(
          `"${this.ytDlpPath}" -f "worst" --no-playlist -o "${path.join(os.tmpdir(), videoBase + '.%(ext)s')}" "${url}"`,
          {
            timeout: 120_000,
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
            },
          },
        );

        // Find whichever file yt-dlp actually created (extension varies by platform)
        const found = readdirSync(os.tmpdir()).find(f => f.startsWith(videoBase + '.'));
        actualVideoFile = found ? path.join(os.tmpdir(), found) : '';

        if (actualVideoFile && existsSync(actualVideoFile)) {
          const escapedVideo = actualVideoFile.replace(/\\/g, '/').replace(/"/g, '\\"');
          const ocrPy = `
import cv2, json, os, platform, tempfile
from rapidfuzz import fuzz

if platform.system() == 'Darwin':
    import Vision
    from Foundation import NSURL
    def ocr_frame(img_path):
        url = NSURL.fileURLWithPath_(img_path)
        handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(url, {})
        request = Vision.VNRecognizeTextRequest.alloc().init()
        request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
        request.setUsesLanguageCorrection_(True)
        handler.performRequests_error_([request], None)
        lines = []
        for obs in (request.results() or []):
            cands = obs.topCandidates_(1)
            if cands and cands[0].confidence() > 0.3:
                lines.append(cands[0].string())
        return " ".join(lines).strip()
else:
    import pytesseract
    from PIL import Image
    def ocr_frame(img_path):
        return pytesseract.image_to_string(
            Image.open(img_path), config='--psm 6'
        ).strip()

cap = cv2.VideoCapture("${escapedVideo}")
fps      = cap.get(cv2.CAP_PROP_FPS) or 25
interval = max(1, int(fps * 2))
results, seen, frame_n = [], [], 0
tmp = tempfile.mkdtemp()

while cap.isOpened():
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_n)
    ok, frame = cap.read()
    if not ok:
        break
    frame_path = os.path.join(tmp, f"frame_{frame_n}.jpg")
    cv2.imwrite(frame_path, frame)
    text = ocr_frame(frame_path)
    os.unlink(frame_path)
    if text and not any(fuzz.ratio(text, s) > 80 for s in seen[-5:]):
        seen.append(text)
        results.append({"ts": round(frame_n / fps, 2), "text": text})
    frame_n += interval

cap.release()
os.rmdir(tmp)
combined = " | ".join(r["text"] for r in results)
print(json.dumps({"texts": results, "combined": combined}))
`.trim();

          writeFileSync(ocrScript, ocrPy);
          const ocrOutput = execSync(`"${this.pythonPath}" "${ocrScript}"`, {
            timeout:   300_000,
            maxBuffer: 10 * 1024 * 1024,
            encoding:  'utf8',
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
            },
          });
          const ocrParsed = JSON.parse(ocrOutput.trim());
          ocrText = ocrParsed.combined ?? '';
          this.logger.log(`[${jobId}] OCR complete — ${ocrParsed.texts?.length ?? 0} unique captions`);
        }
      } catch (ocrErr) {
        this.logger.warn(`[${jobId}] OCR failed (non-fatal): ${ocrErr.message}`);
      }

      // Merge transcript + description + OCR text
      // Description is included only if it carries real content beyond hashtags/emoji
      const descriptionText = this.extractUsefulDescription(description);
      let mergedText = parsed.rawText;
      if (descriptionText) mergedText += `\n\n[Description]:\n${descriptionText}`;
      if (ocrText)         mergedText += `\n\n[On-screen text]:\n${ocrText}`;

      // Persist to Intelligence table
      const intel = this.intelligenceRepo.create({
        jobId,
        rawText: mergedText,
        ocrText: ocrText || undefined,
      });
      await this.intelligenceRepo.save(intel);

      return { transcriptId: intel.id, rawText: mergedText };

    } finally {
      if (existsSync(audioFile))                          unlinkSync(audioFile);
      if (actualVideoFile && existsSync(actualVideoFile)) unlinkSync(actualVideoFile);
      if (existsSync(scriptFile))                         unlinkSync(scriptFile);
      if (existsSync(ocrScript))                          unlinkSync(ocrScript);
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  // Strip lines that are only hashtags, @mentions, emoji, or URLs — keep the rest.
  // Returns null when nothing meaningful survives (short or hashtag-only descriptions).
  private extractUsefulDescription(raw: string | null): string | null {
    if (!raw) return null;
    const meaningful = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .filter(l => !/^(#\S+\s*)+$/.test(l))          // skip hashtag-only lines
      .filter(l => !/^(@\S+\s*)+$/.test(l))           // skip @mention-only lines
      .filter(l => !/^https?:\/\/\S+$/.test(l))       // skip bare URL lines
      .join('\n')
      .trim();
    // Require at least 30 meaningful characters to bother including
    return meaningful.length >= 30 ? meaningful : null;
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