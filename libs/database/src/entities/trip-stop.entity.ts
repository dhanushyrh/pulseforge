import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('trip_stops')
export class TripStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tripId: string;

  @Column()
  dayNumber: number;

  @Column()
  position: number;

  @Column()
  stopType: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  timeOfDay: string;

  @Column({ nullable: true })
  durationMinutes: number;

  @Column({ nullable: true })
  googlePlaceId: string;

  @Column({ nullable: true, type: 'float' })
  latitude: number;

  @Column({ nullable: true, type: 'float' })
  longitude: number;

  @Column({ nullable: true })
  formattedAddress: string;

  @Column({ nullable: true, type: 'float' })
  googleRating: number;

  @Column({ nullable: true })
  priceLevel: number;

  @Column({ nullable: true, type: 'float' })
  priceEstimate: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  sourceJobId: string;

  @Column({ nullable: true })
  sourceInsightType: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ default: false })
  isGeocoded: boolean;

  @Column({ default: false })
  placeDetailsFetched: boolean;

  @Column({ nullable: true, type: 'text' })
  privateNote: string;

  @Column({ nullable: true })
  transitFromPrev: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
