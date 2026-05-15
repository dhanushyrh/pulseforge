// libs/database/src/entities/content-insights.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

export interface StayItem {
  name:          string;
  location:      string | null;
  pricePerNight: string | null;
  type:          'hotel' | 'hostel' | 'airbnb' | 'resort' | 'other';
  notes:         string | null;
  placeId?:      string | null;
  lat?:          number | null;
  lng?:          number | null;
  address?:      string | null;
  rating?:       number | null;
}

export interface PlaceItem {
  name:      string;
  category:  'landmark' | 'neighborhood' | 'attraction' | 'viewpoint' | 'other';
  notes:     string | null;
  mustVisit: boolean;
  placeId?:  string | null;
  lat?:      number | null;
  lng?:      number | null;
  address?:  string | null;
  rating?:   number | null;
}

export interface FoodItem {
  name:       string;
  restaurant: string | null;
  price:      string | null;
  rating:     string | null;
  notes:      string | null;
  placeId?:   string | null;
  lat?:       number | null;
  lng?:       number | null;
  address?:   string | null;
}

export interface BudgetItem {
  category: 'accommodation' | 'food' | 'transport' | 'activities' | 'shopping' | 'other';
  amount:   string;
  currency: string;
  notes:    string | null;
}

// Legacy day-based structure kept for backwards compatibility
export interface ItineraryStop {
  time:        string | null;
  description: string;
  place:       string | null;
}

export interface ItineraryDay {
  day:   number;
  title: string | null;
  stops: ItineraryStop[];
}

// New flat 4-category structure
export interface ItineraryItem {
  type:       'commute' | 'stay' | 'activity' | 'food';
  name:       string;
  place:      string | null;
  notes:      string | null;
  day:        number | null;
  time:       string | null;
  // Google Places enrichment (populated after extraction)
  placeId?:   string | null;
  lat?:       number | null;
  lng?:       number | null;
  address?:   string | null;
  rating?:    number | null;
  priceLevel?: number | null;
}

@Entity('content_insights')
export class ContentInsights {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  jobId: string;

  @Column({ type: 'jsonb', nullable: true })
  stays: StayItem[];

  @Column({ type: 'jsonb', nullable: true })
  places: PlaceItem[];

  @Column({ type: 'jsonb', nullable: true })
  food: FoodItem[];

  @Column({ type: 'jsonb', nullable: true })
  budget: BudgetItem[];

  @Column({ type: 'jsonb', nullable: true })
  itinerary: ItineraryDay[];

  @Column({ type: 'jsonb', nullable: true })
  itineraryItems: ItineraryItem[];

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true, type: 'float' })
  totalBudgetPerDay: number;

  @Column({ default: false })
  hasItinerary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
