import { IsUUID, IsInt, Min, IsOptional, IsArray, IsEnum } from 'class-validator';

const INSIGHT_TYPES = ['stays', 'places', 'food', 'itinerary'] as const;

export class BulkImportStopsDto {
  @IsUUID()
  jobId: string;

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsArray()
  @IsEnum(INSIGHT_TYPES, { each: true })
  @IsOptional()
  types?: string[];
}
