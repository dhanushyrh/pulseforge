import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('affiliate_links')
export class AffiliateLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tripStopId: string;

  @Column()
  provider: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ nullable: true })
  displayPrice: string;

  @Column({ nullable: true })
  currency: string;

  @Column({ default: false })
  isSponsored: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: 0 })
  clickCount: number;

  @Column({ nullable: true })
  lastClickedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
