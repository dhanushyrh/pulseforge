// libs/database/src/entities/job.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('jobs')
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