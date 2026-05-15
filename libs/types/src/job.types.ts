// libs/types/src/job.types.ts
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobPriority = 'low' | 'high';
export type Platform = 'youtube' | 'instagram' | 'twitter' | 'other';

export interface CreateJobDto {
  url: string;
  priority?: JobPriority;
  metadata_override?: { tags?: string[] };
}

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  estimatedTime: string;
}