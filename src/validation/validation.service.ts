import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ValidationService {
  constructor(private prisma: PrismaService) {}

  // ——————————————————— Helpers de multiplicidad ———————————————————

  /** Estos tipos NO requieren multiplicidad (se ignoran aunque vengan vacías) */
  private shouldCheckMultiplicity(kind: string) {
    return kind !== 'INHERITANCE' && kind !== 'IMPLEMENTATION';
  }

  /** Sintaxis UML aceptada: "*", "0", "1", "n", "m..n", "0..*", "1..*", "n..*", etc. */
  private isMultiplicitySyntaxOk(mult?: string | null): boolean {
    if (mult == null || mult === '') return false;
    // * | 0 | [1-9]\d* | (0|[1-9]\d*)..(*|0|[1-9]\d*)
    const re = /^(?:\*|0|[1-9]\d*|(?:0|[1-9]\d*)\.\.(?:\*|0|[1-9]\d*))$/;
    return re.test(mult);
  }

  private isOne(mult?: string | null) {
    return mult === '1';
  }

  /** COMPOSITION: target=1 (todo), source=1..* o m..n (m≥1) */
  private checkCompositionRules(sourceMult?: string | null, targetMult?: string | null): string[] {
    const issues: string[] = [];

    // target debe ser exactamente "1"
    if (!this.isOne(targetMult)) {
      issues.push(
        `Composición: multiplicidad del lado del todo (target) debe ser "1" (actual: "${targetMult ?? ''}")`,
      );
    }

    // source debe ser "1..*" o "m..n" con m≥1
    const okSource =
      sourceMult === '1..*' ||
      (/^[1-9]\d*\.\.(?:\*|[1-9]\d*)$/.test(sourceMult ?? ''));

    if (!okSource) {
      issues.push(
        `Composición: multiplicidad de partes (source) debe ser "1..*" o "m..n" con m≥1 (actual: "${sourceMult ?? ''}")`,
      );
    }

    return issues;
  }

  // ——————————————————— Validación principal ———————————————————

  async validateDiagram(diagramId: number) {
    const [classes, relations] = await Promise.all([
      this.prisma.umlClass.findMany({ where: { diagramId } }),
      this.prisma.umlRelation.findMany({
        where: { diagramId },
        select: { id: true, kind: true, sourceMult: true, targetMult: true },
      }),
    ]);

    const issues: string[] = [];

    // 1) Nombres de clase únicos
    const byName = new Map<string, number>();
    for (const c of classes) {
      byName.set(c.name, (byName.get(c.name) ?? 0) + 1);
    }
    for (const [name, count] of byName.entries()) {
      if (count > 1) issues.push(`Nombre de clase duplicado: ${name}`);
    }

    // 2) Multiplicidades por relación
    for (const r of relations) {
      // INHERITANCE / IMPLEMENTATION → no validar multiplicidad
      if (!this.shouldCheckMultiplicity(r.kind)) continue;

      // 2.1) Sintaxis base
      if (!this.isMultiplicitySyntaxOk(r.sourceMult)) {
        issues.push(`Multiplicidad inválida (source): ${r.sourceMult ?? ''}`);
      }
      if (!this.isMultiplicitySyntaxOk(r.targetMult)) {
        issues.push(`Multiplicidad inválida (target): ${r.targetMult ?? ''}`);
      }

      // 2.2) Reglas específicas por tipo
      if (r.kind === 'COMPOSITION') {
        issues.push(...this.checkCompositionRules(r.sourceMult, r.targetMult));
      }
      // ASSOCIATION / AGGREGATION: solo sintaxis, sin reglas extra
    }

    return { ok: issues.length === 0, issues };
  }
}
