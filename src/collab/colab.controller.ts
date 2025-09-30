import { Controller, Get, Param, Query, ParseIntPipe, Body, Post, Delete, Patch } from '@nestjs/common';
import { CollabService } from './collab.service';

class UpsertMemberDto { userId!: number; role!: 'OWNER'|'EDITOR'|'VIEWER'; }


@Controller('collab/diagrams')
export class CollabController {
  constructor(private collab: CollabService) {}

  @Get(':diagramId/changes')
  async changesSince(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Query('sinceSeq') sinceSeqRaw?: string,
  ) {
    const sinceSeq = Number(sinceSeqRaw ?? 0);
    const changes = await this.collab.getChangesSince(diagramId, Number.isFinite(sinceSeq) ? sinceSeq : 0);
    return { diagramId, sinceSeq, changes };
  }
  @Post(':diagramId/members')
async addOrUpdateMember(@Param('diagramId', ParseIntPipe) diagramId: number, @Body() dto: UpsertMemberDto) {
  const m = await this.collab.prisma.diagramMember.upsert({
    where: { diagramId_userId: { diagramId, userId: dto.userId } },
    create: { diagramId, userId: dto.userId, role: dto.role as any },
    update: { role: dto.role as any },
  });
  return { ok: true, member: m };
}

@Delete(':diagramId/members/:userId')
async removeMember(@Param('diagramId', ParseIntPipe) diagramId: number, @Param('userId', ParseIntPipe) userId: number) {
  await this.collab.prisma.diagramMember.delete({
    where: { diagramId_userId: { diagramId, userId } },
  });
  return { ok: true };
}

@Patch(':diagramId/members/:userId/role')
async updateRole(
  @Param('diagramId', ParseIntPipe) diagramId: number,
  @Param('userId', ParseIntPipe) userId: number,
  @Body() body: { role: 'OWNER'|'EDITOR'|'VIEWER' }
) {
  const m = await this.collab.prisma.diagramMember.update({
    where: { diagramId_userId: { diagramId, userId } },
    data: { role: body.role as any },
  });
  return { ok: true, member: m };
}
}