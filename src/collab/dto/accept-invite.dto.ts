import { IsUUID } from "class-validator"

export class AcceptInviteDto {
  @IsUUID()
  token!: string
}