import { IsOptional, IsString, Max, MaxLength, MinLength } from "class-validator";
export class UpdateProjectDto {
    @IsOptional() @IsString() @MinLength(3) @MaxLength(80)
    name?: string;

    @IsOptional() @IsString() @MaxLength(300)
    description?: string;
}