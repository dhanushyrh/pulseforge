import { IsString, IsOptional, MaxLength, IsDateString, IsInt, Min, Max, IsIn } from 'class-validator';

export class UpdateTripDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  dayCount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'active', 'shared', 'archived'])
  status?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
