import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';

export class UpdateStopDto {
  @IsString()
  @IsOptional()
  name?: string;

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
}
