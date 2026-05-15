// libs/types/src/transcript.types.ts
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  transcriptId: string;
  segments: TranscriptSegment[];
  rawText: string;
}