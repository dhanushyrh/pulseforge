// apps/gateway/src/search/dto/search.dto.ts
import { IsString, IsOptional, IsInt, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creator?: string;

  @ApiPropertyOptional({ enum: ['reel', 'vlog', 'short', 'unknown'] })
  @IsOptional()
  @IsEnum(['reel', 'vlog', 'short', 'unknown'])
  contentType?: string;

  @ApiPropertyOptional({ enum: ['transcript', 'caption', 'description'] })
  @IsOptional()
  @IsEnum(['transcript', 'caption', 'description'])
  chunkType?: string;
}

export class SearchDto {
  @ApiProperty({ example: 'best street food in Tokyo' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1) @Max(20)
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({ default: 0.3, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  @Type(() => Number)
  scoreThreshold?: number = 0.3;

  @ApiPropertyOptional({ type: SearchFiltersDto })
  @IsOptional()
  filters?: SearchFiltersDto;
}
