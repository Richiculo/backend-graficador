import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import JSZip from 'jszip';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}
  private async fetchDiagram(id: number) {
    const d = await this.prisma.diagram.findUnique({
      where: { id },
      include: {
        classes: { include: { attributes: true, methods: true } },
        relations: {
          include: {
            sourceClass: true,
            targetClass: true,
          },
        },
        project: { include: { user: true } },
      },
    });
    if (!d) throw new NotFoundException('Diagram not found');
    return d;
  }

  private mapUmlToSqlType(t: string): string {
    const tt = t.toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'VARCHAR(255)';
    if (['int', 'integer', 'number'].includes(tt)) return 'INT';
    if (['bigint'].includes(tt)) return 'BIGINT';
    if (['float', 'double', 'decimal'].includes(tt)) return 'DECIMAL(12,2)';
    if (['bool', 'boolean'].includes(tt)) return 'BOOLEAN';
    if (['date', 'datetime', 'timestamp'].includes(tt)) return 'TIMESTAMP';
    return 'VARCHAR(255)'; // default
  }

  private many(mult: string): boolean {
    return mult.includes('*') || mult.includes('..*');
  }

  private toIntermediate(diagram: any) {
    return {
      id: diagram.id,
      name: diagram.name,
      classes: diagram.classes.map((c) => ({
        id: c.id,
        name: c.name,
        stereotype: c.stereotype,
        isAbstract: c.isAbstract,
        attributes: c.attributes
          .sort((a, b) => a.order - b.order)
          .map((a) => ({
            name: a.name,
            type: a.type,
            visibility: a.visibility,
            isStatic: a.isStatic,
            isReadOnly: a.isReadOnly,
          })),
        methods: c.methods
          .sort((a, b) => a.order - b.order)
          .map((m) => ({
            name: m.name,
            returnType: m.returnType,
            visibility: m.visibility,
            isStatic: m.isStatic,
            isAbstract: m.isAbstract,
          })),
      })),
      relations: diagram.relations.map((r) => ({
        kind: r.kind,
        source: r.sourceClass ? { id: r.sourceClass.id, name: r.sourceClass.name } : null,
        target: r.targetClass ? { id: r.targetClass.id, name: r.targetClass.name } : null,
        sourceMult: r.sourceMult,
        targetMult: r.targetMult,
        sourceRole: r.sourceRole,
        targetRole: r.targetRole,
        navigableAToB: r.navigableAToB,
        navigableBToA: r.navigableBToA,
      })),
    };
  }

  // ---------- DDL SQL ----------
  async exportDDL(id: number) {
    const diagram = await this.fetchDiagram(id);
    const m = this.toIntermediate(diagram);

    const lines: string[] = [];
    lines.push('-- DDL generado desde diagrama: ' + m.name);
    for (const c of m.classes) {
      lines.push(`\nCREATE TABLE "${c.name}" (`);
      lines.push(`  id SERIAL PRIMARY KEY,`);
      for (const a of c.attributes) {
        lines.push(`  "${a.name}" ${this.mapUmlToSqlType(a.type)},`);
      }
      // quitar coma final
      if (lines[lines.length - 1].endsWith(',')) {
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
      }
      lines.push(');');
    }

    // FKs básicas: si la relación parece 1..* o *..1 usamos FK hacia el lado "1"
    for (const r of m.relations) {
      if (!r.source || !r.target) continue;
      const oneToManyFromSource =
        !this.many(r.sourceMult) && this.many(r.targetMult);
      const oneToManyFromTarget =
        this.many(r.sourceMult) && !this.many(r.targetMult);

      if (oneToManyFromSource) {
        // target (many) tiene FK a source (one)
        lines.push(
          `ALTER TABLE "${r.target.name}" ADD COLUMN "${r.source.name}Id" INT, ` +
            `ADD CONSTRAINT "fk_${r.target.name}_${r.source.name}" FOREIGN KEY ("${r.source.name}Id") REFERENCES "${r.source.name}"(id);`
        );
      } else if (oneToManyFromTarget) {
        // source (many) tiene FK a target (one)
        lines.push(
          `ALTER TABLE "${r.source.name}" ADD COLUMN "${r.target.name}Id" INT, ` +
            `ADD CONSTRAINT "fk_${r.source.name}_${r.target.name}" FOREIGN KEY ("${r.target.name}Id") REFERENCES "${r.target.name}"(id);`
        );
      }
      // Muchos a muchos -> tabla intermedia (cuando ambos son many)
      else if (this.many(r.sourceMult) && this.many(r.targetMult)) {
        const join = `${r.source.name}_${r.target.name}`;
        lines.push(
          `CREATE TABLE "${join}" (` +
            ` "${r.source.name}Id" INT NOT NULL,` +
            ` "${r.target.name}Id" INT NOT NULL,` +
            ` PRIMARY KEY ("${r.source.name}Id","${r.target.name}Id"),` +
            ` FOREIGN KEY ("${r.source.name}Id") REFERENCES "${r.source.name}"(id),` +
            ` FOREIGN KEY ("${r.target.name}Id") REFERENCES "${r.target.name}"(id)` +
            `);`
        );
      }
    }

    const sql = lines.join('\n');
    return { filename: `${m.name}_schema.sql`, buffer: Buffer.from(sql, 'utf-8') };
  }

  // ---------- Postman Collection (v2.1) ----------
  async exportPostman(id: number) {
    const diagram = await this.fetchDiagram(id);
    const m = this.toIntermediate(diagram);

    const base = '{{baseUrl}}'; // usa variable de entorno en Postman
    const items: any[] = [];

    // Colección CRUD básica pensando en un backend generado /api/<entity>
    for (const c of m.classes) {
      const entity = c.name.toLowerCase();
      items.push({
        name: `${c.name} - List`,
        request: { method: 'GET', url: `${base}/api/${entity}` },
      });
      items.push({
        name: `${c.name} - Create`,
        request: {
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: `${base}/api/${entity}`,
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              Object.fromEntries(c.attributes.map((a) => [a.name, this.exampleFor(a.type)])),
              null,
              2
            ),
          },
        },
      });
      items.push({
        name: `${c.name} - Get by id`,
        request: { method: 'GET', url: `${base}/api/${entity}/:id` },
      });
      items.push({
        name: `${c.name} - Update`,
        request: {
          method: 'PUT',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: `${base}/api/${entity}/:id`,
          body: { mode: 'raw', raw: '{\n  \n}' },
        },
      });
      items.push({
        name: `${c.name} - Delete`,
        request: { method: 'DELETE', url: `${base}/api/${entity}/:id` },
      });
    }

    const collection = {
      info: {
        name: `${m.name} - Generated API`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: items,
      variable: [{ key: 'baseUrl', value: 'http://localhost:8080' }],
    };

    const json = JSON.stringify(collection, null, 2);
    return { filename: `${m.name}_postman.json`, buffer: Buffer.from(json, 'utf-8') };
  }

  private exampleFor(t: string) {
    const tt = t.toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'example';
    if (['int', 'integer', 'number', 'bigint'].includes(tt)) return 0;
    if (['float', 'double', 'decimal'].includes(tt)) return 0.0;
    if (['bool', 'boolean'].includes(tt)) return true;
    if (['date', 'datetime', 'timestamp'].includes(tt)) return '2025-01-01T00:00:00Z';
    return 'example';
    }

  // ---------- Spring Boot ZIP (Maven + POJOs) ----------
  async exportSpring(id: number) {
    const diagram = await this.fetchDiagram(id);
    const m = this.toIntermediate(diagram);
    const groupId = 'com.example';
    const artifactId = this.safeName(m.name);
    const pkg = `${groupId}.${artifactId}`;

    const zip = new JSZip();
    // pom.xml básico
    zip.file('pom.xml', this.pomXml(groupId, artifactId));

    // Application
    zip.file(
      `src/main/java/${pkg.replace(/\./g, '/')}/Application.java`,
      this.applicationJava(pkg)
    );

    // Modelos por cada clase
    for (const c of m.classes) {
      zip.file(
        `src/main/java/${pkg.replace(/\./g, '/')}/model/${c.name}.java`,
        this.entityJava(pkg, c)
      );
    }

    // README
    zip.file(
      'README.md',
      `# ${m.name}\n\nProyecto Spring Boot generado desde el diagrama.\n\n` +
        `Ejecuta:\n\nmvn spring-boot:run\n`
    );

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return { filename: `${m.name}_spring.zip`, buffer };
  }

  private safeName(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private javaType(t: string): string {
    const tt = t.toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'String';
    if (['int', 'integer', 'number'].includes(tt)) return 'Integer';
    if (['bigint'].includes(tt)) return 'Long';
    if (['float', 'double', 'decimal'].includes(tt)) return 'Double';
    if (['bool', 'boolean'].includes(tt)) return 'Boolean';
    if (['date', 'datetime', 'timestamp'].includes(tt)) return 'java.time.LocalDateTime';
    return 'String';
  }

  private pomXml(groupId: string, artifactId: string) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>${artifactId}</name>
  <description>Generated from UML</description>
  <properties>
    <java.version>17</java.version>
    <spring.boot.version>3.3.4</spring.boot.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>`;
  }

  private applicationJava(pkg: string) {
    return `package ${pkg};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}
`;
  }

  private entityJava(pkg: string, c: any) {
    const fields = c.attributes
      .map((a) => `  private ${this.javaType(a.type)} ${a.name};`)
      .join('\n');
    const gettersSetters = c.attributes
      .map((a) => {
        const jt = this.javaType(a.type);
        const up = a.name.charAt(0).toUpperCase() + a.name.slice(1);
        return `
  public ${jt} get${up}() { return ${a.name}; }
  public void set${up}(${jt} ${a.name}) { this.${a.name} = ${a.name}; }`;
      })
      .join('\n');

    return `package ${pkg}.model;

public class ${c.name} {
  private Long id;
${fields.length ? '\n' + fields + '\n' : ''}

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
${gettersSetters}
}
`;
  }
}
