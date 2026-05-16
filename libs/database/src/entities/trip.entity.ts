import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ nullable: true, type: 'date' })
  startDate: string;

  @Column({ nullable: true, type: 'date' })
  endDate: string;

  @Column({ default: 1 })
  dayCount: number;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true, unique: true })
  shareToken: string;

  @Column({ nullable: true, type: 'float' })
  centerLat: number;

  @Column({ nullable: true, type: 'float' })
  centerLng: number;

  @Column({ default: 11 })
  defaultZoom: number;

  @Column({ nullable: true, type: 'float' })
  totalBudgetEstimate: number;

  @Column({ nullable: true })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
