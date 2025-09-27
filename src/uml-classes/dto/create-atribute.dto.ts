import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AccessModifier } from '@prisma/client';
export class CreateAttributeDto {
  @IsString() name!: string;
  @IsString() type!: string;
  @IsInt() order!: number;
  @IsOptional() @IsString() defaultValue?: string;
  @IsEnum(AccessModifier) visibility!: AccessModifier;
  @IsOptional() isStatic?: boolean;
  @IsOptional() isReadOnly?: boolean;
}
