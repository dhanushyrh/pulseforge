import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('affiliate_clicks')
export class AffiliateClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  affiliateLinkId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  tripId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  ipHash: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column()
  clickedAt: Date;

  @Column({ nullable: true })
  convertedAt: Date;

  @Column({ nullable: true, type: 'float' })
  commissionEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
