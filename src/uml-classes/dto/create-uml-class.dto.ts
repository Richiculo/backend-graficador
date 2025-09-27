import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
export class CreateClassDto {
  @IsString() name!: string;
  @IsOptional() @IsString() stereotype?: string;
  @IsOptional() @IsBoolean() isAbstract?: boolean;
  @IsInt() x!: number;
  @IsInt() y!: number;
}
