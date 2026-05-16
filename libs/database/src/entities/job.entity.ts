// libs/database/src/entities/job.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('jobs')
@Index('idx_jobs_user_id',     ['userId'])
@Index('idx_jobs_creator',     ['creator'])
@Index('idx_jobs_country',     ['country'])
@Index('idx_jobs_is_travel',   ['isTravel'])
@Index('idx_jobs_user_travel', ['userId', 'isTravel'])
@Index('idx_jobs_status',      ['status'])
@Index('idx_jobs_created',     ['createdAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ default: 'low' })
  priority: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  contentType: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  creator: string;

  @Column({ nullable: true, type: 'text' })
  caption: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'float' })
  duration: number | null;

  @Column({ default: false })
  isTravel: boolean;

  @Column({ nullable: true, type: 'float' })
  travelConfidence: number;

  @Column({ nullable: true })
  classifiedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  chapters: { title: string; startTime: number; endTime: number }[];

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ nullable: true, type: 'text' })
  thumbnail: string;

  @Column({ nullable: true, type: 'int' })
  viewCount: number;

  @Column({ nullable: true })
  uploadDate: string;

  @Column({ type: 'jsonb', nullable: true })
  metadataOverride: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
