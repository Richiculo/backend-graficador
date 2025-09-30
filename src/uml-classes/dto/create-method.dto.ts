import { AccessModifier } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMethodDto {
  @IsString() name!: string;
  @IsString() returnType!: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsEnum(AccessModifier)
  visibility?: AccessModifier;

  @IsOptional()
  @IsBoolean()
  isStatic?: boolean;

  @IsOptional()
  @IsBoolean()
  isAbstract?: boolean;
}
