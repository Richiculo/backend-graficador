// src/collab/dto/create-invite.dto.ts
import { IsEmail, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateInviteDto {
  @IsEmail()
  inviteeEmail!: string;                   // ← nombre definitivo

  @IsOptional()
  @IsIn(["EDITOR", "VIEWER"])
  role?: "EDITOR" | "VIEWER";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;                  // default en el service
}
