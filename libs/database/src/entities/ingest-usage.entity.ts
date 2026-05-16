import {
  Entity, PrimaryGeneratedColumn, Column,
  Index, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';

@Entity('ingest_usage')
@Unique(['userId', 'date'])
export class IngestUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  count: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
