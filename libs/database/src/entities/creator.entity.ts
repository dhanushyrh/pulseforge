import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('creators')
export class Creator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  handle: string;

  @Column({ nullable: true })
  displayName: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  platformId: string;

  @Column({ nullable: true })
  profileUrl: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, type: 'int' })
  videoCount: number;

  @Column({ nullable: true, type: 'float' })
  avgCommentCount: number;

  @Column({ nullable: true, type: 'float' })
  avgTravelConfidence: number;

  @Column({ type: 'jsonb', nullable: true })
  topCountries: string[];

  @Column({ type: 'jsonb', nullable: true })
  contentTypes: string[];

  @Column({ type: 'jsonb', nullable: true })
  topEntities: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
