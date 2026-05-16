import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class GenerateInviteDto {
  @IsEnum(['free', 'pro'])
  @IsOptional()
  plan?: 'free' | 'pro' = 'free';

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
