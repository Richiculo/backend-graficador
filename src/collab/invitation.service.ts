import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { addDays, isBefore } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CollabService } from './collab.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private collab: CollabService,
  ) {}

  async createInvite(params: {
    diagramId: number;
    inviterId: number;
    inviteeEmail: string;
    role: "EDITOR" | "VIEWER";
    expiresInDays?: number;
  }) {
    const { diagramId, inviterId, inviteeEmail, role, expiresInDays = 7 } = params;

    const can = await this.collab.canManageMembers(diagramId, inviterId);
    if (!can) throw new ForbiddenException("Only OWNER can invite");

    const token = randomUUID();
    const expiresAt = addDays(new Date(), Math.max(1, expiresInDays));

    await this.prisma.diagramInvite.updateMany({
      where: { inviteeEmail, inviterId, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "REVOKED" },
    });

    const invite = await this.prisma.diagramInvite.create({
      data: { diagramId, inviterId, inviteeEmail, role, token, expiresAt },
      select: { id: true, token: true, expiresAt: true, role: true, inviteeEmail: true },
    });

    return invite;
  }

  async revokeInvite(inviteId: number, requesterId: number) {
    const inv = await this.prisma.diagramInvite.findUnique({
      where: { id: inviteId },
      select: { diagramId: true, status: true },
    });
    if (!inv) throw new NotFoundException('Invite not found');

    const can = await this.collab.canManageMembers(inv.diagramId, requesterId);
    if (!can) throw new ForbiddenException('Only OWNER can revoke');

    if (inv.status !== 'PENDING') return { ok: true, already: true };

    await this.prisma.diagramInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
    return { ok: true };
  }

  async acceptInviteByToken(params: {
    token: string
    userId: number
    userEmail: string
  }) {
    const { token, userId, userEmail } = params

    if (!token) throw new BadRequestException("Token is required")

    // Usa findUnique SÓLO si token es @unique en Prisma (ver paso 4).
    const invite = await this.prisma.diagramInvite.findUnique({
      where: { token },
      select: {
        id: true,
        diagramId: true,
        inviteeEmail: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    })

    if (!invite) throw new NotFoundException("Invite not found")
    if (invite.status !== "PENDING") throw new BadRequestException("Invite is not pending")
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new BadRequestException("Invite expired")

    const sameEmail =
      invite.inviteeEmail?.toLowerCase?.() === userEmail?.toLowerCase?.()
    if (!sameEmail) throw new ForbiddenException("Invite does not belong to this email")

    const result = await this.prisma.$transaction(async (tx) => {
      const member = await tx.diagramMember.upsert({
        where: { diagramId_userId: { diagramId: invite.diagramId, userId } },
        create: { diagramId: invite.diagramId, userId, role: invite.role as any },
        update: { role: invite.role as any },
        select: { diagramId: true, role: true },
      })

      await tx.diagramInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      })

      return member
    })

    return { diagramId: result.diagramId, role: result.role }
  }

  async listInvites(diagramId: number, requesterId: number) {
    const can = await this.collab.canManageMembers(diagramId, requesterId);
    if (!can) throw new ForbiddenException('Only OWNER can list invites');

    return this.prisma.diagramInvite.findMany({
      where: { diagramId, status: { in: ['PENDING', 'ACCEPTED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, inviteeEmail: true, role: true, status: true, createdAt: true, expiresAt: true, acceptedAt: true, token: true },
    });
  }
}
