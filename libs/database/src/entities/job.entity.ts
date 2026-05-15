// libs/database/src/entities/job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'jsonb', nullable: true })
  metadataOverride: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}