import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString() @MinLength(3) @MaxLength(80)
  name!: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

}
