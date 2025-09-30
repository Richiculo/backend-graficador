import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards,  } from '@nestjs/common';
import { InvitationsService } from './invitation.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from "../auth/current-user.decorator";
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@UseGuards(JwtGuard) // Asegura que hay user en req.user
@Controller()
export class InvitationsController {
  constructor(private invites: InvitationsService) {}

  @Post("diagrams/:diagramId/invitations")
  async create(
    @Param("diagramId", ParseIntPipe) diagramId: number,
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: { id: number },
  ) {
    const invite = await this.invites.createInvite({
      diagramId,
      inviterId: user.id,
      inviteeEmail: dto.inviteeEmail,       // ← ahora compila
      role: dto.role ?? "VIEWER",
      expiresInDays: dto.expiresInDays,
    });
    return { ok: true, invite };
  }

  @Get('diagrams/:diagramId/invitations')
  async list(@Param('diagramId', ParseIntPipe) diagramId: number, @Req() req: any) {
    const data = await this.invites.listInvites(diagramId, req.user.id);
    return { ok: true, invitations: data };
  }

  @Post("invitations/accept")
  async accept(
    @Body() dto: AcceptInviteDto,
    @CurrentUser() user: { id: number; email: string },
  ) {
    const res = await this.invites.acceptInviteByToken({
      token: dto.token,                 // <- AQUI
      userId: user.id,
      userEmail: user.email,
    });
    return res;
  }

  @Post('invitations/:inviteId/revoke')
  async revoke(@Param('inviteId', ParseIntPipe) inviteId: number, @Req() req: any) {
    const res = await this.invites.revokeInvite(inviteId, req.user.id);
    return res;
  }
}
