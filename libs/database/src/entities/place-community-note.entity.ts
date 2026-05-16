import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('place_community_notes')
export class PlaceCommunityNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  googlePlaceId: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  note: string;

  @Column({ default: 0 })
  agreeCount: number;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
