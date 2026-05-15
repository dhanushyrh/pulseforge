// libs/types/src/media.types.ts
export interface MediaAsset {
  id: string;
  jobId: string;
  storagePath: string;
  type: 'audio' | 'video';
  platform: string;
  durationSeconds?: number;
}