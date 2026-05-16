import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export interface OpeningHoursData {
  openNow: boolean;
  periods: Array<{
    open:  { day: number; time: string };
    close: { day: number; time: string };
  }>;
  weekdayText: string[];
}

export interface PlacePhoto {
  photoReference: string;
  width:          number;
  height:         number;
  cachedUrl:      string | null;
}

@Entity('place_details')
export class PlaceDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  googlePlaceId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  placeType: string;

  @Column({ type: 'jsonb', nullable: true })
  allTypes: string[];

  @Column({ nullable: true, type: 'float' })
  rating: number;

  @Column({ nullable: true, type: 'int' })
  userRatingsTotal: number;

  @Column({ nullable: true })
  formattedAddress: string;

  @Column({ nullable: true })
  vicinity: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  googleMapsUrl: string;

  @Column({ nullable: true, type: 'int' })
  priceLevel: number;

  @Column({ nullable: true, type: 'float' })
  latitude: number;

  @Column({ nullable: true, type: 'float' })
  longitude: number;

  @Column({ nullable: true, type: 'text' })
  editorialSummary: string;

  @Column({ type: 'jsonb', nullable: true })
  openingHours: OpeningHoursData;

  @Column({ type: 'jsonb', nullable: true })
  photos: PlacePhoto[];

  @Column({ nullable: true })
  primaryPhotoUrl: string;

  @Column({ nullable: true })
  primaryPhotoRef: string;

  @Column({ default: false })
  isOpenNow: boolean;

  @Column({ nullable: true })
  lastFetchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
