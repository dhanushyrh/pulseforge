// apps/gateway/src/search/dto/search.dto.ts
import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFiltersDto {
  @ApiPropertyOptional({ enum: ['youtube', 'instagram', 'twitter', 'other'] })
  @IsOptional()
  @IsEnum(['youtube', 'instagram', 'twitter', 'other'])
  platform?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  min_duration?: number;
}

export class SearchDto {
  @ApiProperty({ example: 'How to scale Node.js?' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1) @Max(20)
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({ type: SearchFiltersDto })
  @IsOptional()
  filters?: SearchFiltersDto;
}