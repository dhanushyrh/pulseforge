// libs/database/src/entities/media-asset.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @Column()
  storagePath: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true, type: 'int' })
  durationSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
}