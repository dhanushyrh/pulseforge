// apps/gateway/src/ingest/dto/create-ingest.dto.ts
import { IsUrl, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetadataOverrideDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateIngestDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ enum: ['low', 'high'], default: 'low' })
  @IsOptional()
  @IsEnum(['low', 'high'])
  priority?: 'low' | 'high' = 'low';

  @ApiPropertyOptional({ type: MetadataOverrideDto })
  @IsOptional()
  metadata_override?: MetadataOverrideDto;
}