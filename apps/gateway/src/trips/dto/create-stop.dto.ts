import {
  IsString, IsNotEmpty, IsUUID, IsInt, Min, IsOptional,
  IsEnum, MaxLength, IsNumber,
} from 'class-validator';

const STOP_TYPES   = ['stay', 'place', 'food', 'activity', 'transport'] as const;
const INSIGHT_TYPES = ['stays', 'places', 'food', 'itinerary'] as const;

export class CreateStopDto {
  @IsUUID()
  tripId: string;

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  position?: number;

  @IsEnum(STOP_TYPES)
  stopType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  timeOfDay?: string;

  @IsInt()
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @IsOptional()
  priceEstimate?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsUUID()
  @IsOptional()
  sourceJobId?: string;

  @IsEnum(INSIGHT_TYPES)
  @IsOptional()
  sourceInsightType?: string;
}
