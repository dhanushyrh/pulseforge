// libs/database/src/entities/intelligence.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn
} from 'typeorm';

@Entity('intelligence')
export class Intelligence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @Column({ type: 'text', nullable: true })
  rawText: string;

  @Column({ type: 'text', nullable: true })
  ocrText: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ nullable: true })
  sentiment: string;

  @Column({ type: 'jsonb', nullable: true })
  entities: string[];

  @CreateDateColumn()
  createdAt: Date;
}