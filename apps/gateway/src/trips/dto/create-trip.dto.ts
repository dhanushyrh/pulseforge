import { IsString, IsNotEmpty, MaxLength, IsOptional, IsDateString, IsInt, Min, Max, Length } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  countryCode?: string;

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
}
