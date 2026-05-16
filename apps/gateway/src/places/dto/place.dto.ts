import { IsString, MinLength, MaxLength } from 'class-validator';

export class AddNoteDto {
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  note: string;
}

export class UpdatePrivateNoteDto {
  @IsString()
  @MaxLength(1000)
  note: string;
}
