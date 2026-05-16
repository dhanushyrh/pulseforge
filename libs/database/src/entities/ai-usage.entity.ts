import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, Unique,
} from 'typeorm';

@Entity('ai_usage')
@Unique(['userId', 'date'])
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  messageCount: number;

  @Column({ default: 0 })
  inputTokensUsed: number;

  @Column({ default: 0 })
  outputTokensUsed: number;

  @Column({ default: 0 })
  toolCallCount: number;

  @Column({ default: 0 })
  generateTripCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
