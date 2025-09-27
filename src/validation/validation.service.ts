import { Injectable } from '@nestjs/common';
import { CreateValidationDto } from './dto/create-validation.dto';
import { UpdateValidationDto } from './dto/update-validation.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ValidationService {
  constructor(private prisma: PrismaService) {}

  async validateDiagram(diagramId: number) {
    const [classes, relations] = await Promise.all([
      this.prisma.umlClass.findMany({ where: { diagramId } }),
      this.prisma.umlRelation.findMany({ where: { diagramId } }),
    ]);
    const issues: string[] = [];

    // nombres únicos
    const byName = new Map<string, number>();
    for (const c of classes) {
      byName.set(c.name, (byName.get(c.name) ?? 0) + 1);
    }
    for (const [name, count] of byName.entries()) {
      if (count > 1) issues.push(`Nombre de clase duplicado: ${name}`);
    }

    const multRegex = /^(?:\*|0\.\.\*|1\.\.\*|0\.\.1|1|[0-9]+(?:\.\.[0-9]+)?)$/;
    for (const r of relations) {
      if (!multRegex.test(r.sourceMult)) issues.push(`Multiplicidad inválida (source): ${r.sourceMult}`);
      if (!multRegex.test(r.targetMult)) issues.push(`Multiplicidad inválida (target): ${r.targetMult}`);
    }

    return { ok: issues.length === 0, issues };
  }
}
