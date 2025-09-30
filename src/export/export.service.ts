import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import JSZip from 'jszip';

type GenAttr = { name: string; type: string; visibility?: string; isStatic?: boolean; isReadOnly?: boolean };
type GenMethod = { name: string; returnType: string; visibility?: string; isStatic?: boolean; isAbstract?: boolean };

type GenClass = {
  id: number;
  name: string;
  stereotype?: string | null;
  isAbstract?: boolean | null;
  attributes: GenAttr[];
  methods: GenMethod[];
};

type GenEndpointClassRef = { id: number; name: string } | null;

type GenRelation = {
  kind?: string | null;
  source: GenEndpointClassRef;
  target: GenEndpointClassRef;
  sourceMult?: string | null;
  targetMult?: string | null;
  sourceRole?: string | null;
  targetRole?: string | null;
  navigableAToB?: boolean | null;
  navigableBToA?: boolean | null;
};

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // ----------- FETCH & MAPPING ----------
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
    } as {
      id: number;
      name: string;
      classes: GenClass[];
      relations: GenRelation[];
    };
  }

  // ----------- UTILS ----------
  private mapUmlToSqlType(t: string): string {
    const tt = (t || '').toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'VARCHAR(255)';
    if (['int', 'integer', 'number', 'num'].includes(tt)) return 'INT';
    if (['bigint'].includes(tt)) return 'BIGINT';
    if (['float', 'double', 'decimal'].includes(tt)) return 'DECIMAL(12,2)';
    if (['bool', 'boolean'].includes(tt)) return 'BOOLEAN';
    if (['date', 'datetime', 'timestamp'].includes(tt)) return 'TIMESTAMP';
    return 'VARCHAR(255)';
  }

  private many(mult?: string | null): boolean {
    const m = (mult || '').toLowerCase();
    return m.includes('*') || m.includes('..*');
  }

  private safeName(n: string) {
    return (n || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  private lowerFirst(s: string) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  private plural(s: string) { return s?.endsWith('s') ? s : s + 's'; }
  private safeJavaId(n: string) { return (n || '').replace(/[^a-zA-Z0-9_]/g, '_'); }

  private javaType(t: string): string {
    const tt = (t || '').toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'String';
    if (['int', 'integer', 'number', 'num'].includes(tt)) return 'Integer';
    if (['bigint'].includes(tt)) return 'Long';
    if (['float', 'double', 'decimal'].includes(tt)) return 'Double';
    if (['bool', 'boolean'].includes(tt)) return 'Boolean';
    if (['date', 'datetime', 'timestamp'].includes(tt)) return 'java.time.LocalDateTime';
    return 'String';
  }

  private exampleFor(t: string) {
    const tt = (t || '').toLowerCase();
    if (['string', 'varchar', 'text'].includes(tt)) return 'example';
    if (['int', 'integer', 'number', 'bigint', 'num'].includes(tt)) return 0;
    if (['float', 'double', 'decimal'].includes(tt)) return 0.0;
    if (['bool', 'boolean'].includes(tt)) return true;
    if (['date', 'datetime', 'timestamp'].includes(tt)) return '2025-01-01T00:00:00Z';
    return 'example';
  }

  // ----------- DDL ----------
  async exportDDL(id: number) {
    const diagram = await this.fetchDiagram(id);
    const m = this.toIntermediate(diagram);

    const lines: string[] = [];
    lines.push('-- DDL generado desde diagrama: ' + m.name);

    // Crear tablas base con PK y columnas simples
    for (const c of m.classes) {
      lines.push(`\nCREATE TABLE "${c.name}" (`);
      lines.push(`  id SERIAL PRIMARY KEY,`);
      for (const a of c.attributes) {
        lines.push(`  "${a.name}" ${this.mapUmlToSqlType(a.type)},`);
      }
      if (lines[lines.length - 1].endsWith(',')) {
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
      }
      lines.push(');');
    }

    // Detectar clases existentes para reconocer join-entity por nombre A_B o B_A
    const classNames = new Set(m.classes.map((c) => c.name.toLowerCase()));
    const joinClassExists = (a: string, b: string) => {
      const ab = `${a.toLowerCase()}_${b.toLowerCase()}`;
      const ba = `${b.toLowerCase()}_${a.toLowerCase()}`;
      return classNames.has(ab) ? ab : (classNames.has(ba) ? ba : null);
    };

    // Relaciones -> FKs / tablas intermedias
    for (const r of m.relations) {
      if (!r.source || !r.target) continue;

      const a = r.source.name;
      const b = r.target.name;
      const isComposition = (r.kind || '').toLowerCase().includes('compos');

      const oneToManyFromSource = !this.many(r.sourceMult) && this.many(r.targetMult);
      const oneToManyFromTarget = this.many(r.sourceMult) && !this.many(r.targetMult);

      if (oneToManyFromSource) {
        // b (many) -> FK a a (one)
        lines.push(
          `ALTER TABLE "${b}" ADD COLUMN "${a}Id" INT, ` +
          `ADD CONSTRAINT "fk_${b}_${a}" FOREIGN KEY ("${a}Id") REFERENCES "${a}"(id)` +
          (isComposition ? ' ON DELETE CASCADE' : '') + ';'
        );
      } else if (oneToManyFromTarget) {
        // a (many) -> FK a b (one)
        lines.push(
          `ALTER TABLE "${a}" ADD COLUMN "${b}Id" INT, ` +
          `ADD CONSTRAINT "fk_${a}_${b}" FOREIGN KEY ("${b}Id") REFERENCES "${b}"(id)` +
          (isComposition ? ' ON DELETE CASCADE' : '') + ';'
        );
      } else if (this.many(r.sourceMult) && this.many(r.targetMult)) {
        // MANY-TO-MANY
        const joinByClass = joinClassExists(a, b);
        if (joinByClass) {
          const tbl = m.classes.find((c) => c.name.toLowerCase() === joinByClass)!.name;
          lines.push(
            `ALTER TABLE "${tbl}" ADD COLUMN "${a}Id" INT, ADD COLUMN "${b}Id" INT;`
          );
          lines.push(
            `ALTER TABLE "${tbl}" ` +
            `ADD CONSTRAINT "fk_${tbl}_${a}" FOREIGN KEY ("${a}Id") REFERENCES "${a}"(id), ` +
            `ADD CONSTRAINT "fk_${tbl}_${b}" FOREIGN KEY ("${b}Id") REFERENCES "${b}"(id);`
          );
        } else {
          const join = `${a}_${b}`;
          lines.push(
            `CREATE TABLE "${join}" (` +
            ` "${a}Id" INT NOT NULL,` +
            ` "${b}Id" INT NOT NULL,` +
            ` PRIMARY KEY ("${a}Id","${b}Id"),` +
            ` FOREIGN KEY ("${a}Id") REFERENCES "${a}"(id),` +
            ` FOREIGN KEY ("${b}Id") REFERENCES "${b}"(id)` +
            `);`
          );
        }
      }
    }

    const sql = lines.join('\n');
    return {
      filename: `${m.name}_schema.sql`,
      buffer: Buffer.from(sql, 'utf-8'),
    };
  }

  // ----------- POSTMAN ----------
  async exportPostman(id: number) {
    const diagram = await this.fetchDiagram(id);
    const m = this.toIntermediate(diagram);

    const base = '{{baseUrl}}';
    const items: any[] = [];

    // helper para detectar join-entity por nombre
    const looksLikeJoinName = (a: string, b: string, cand: string) => {
      const n = cand.toLowerCase();
      return n === `${a.toLowerCase()}_${b.toLowerCase()}` || n === `${b.toLowerCase()}_${a.toLowerCase()}`;
    };

    const rels = m.relations.filter((r) => r.source && r.target);

    const classNames = new Set(m.classes.map((x: any) => x.name.toLowerCase()));
    const splitJoinName = (n: string): [string, string] | null => {
      const parts = (n || '').toLowerCase().split('_');
      if (parts.length !== 2) return null;
      const [a, b] = parts;
      if (classNames.has(a) && classNames.has(b)) return [a, b];
      return null;
    };

    const joinEntityNames = new Set<string>();
    for (const r of rels) {
      const a = r.source!.name, b = r.target!.name;
      for (const c of m.classes) if (looksLikeJoinName(a, b, c.name)) joinEntityNames.add(c.name);
    }

    const basicTest = {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          "pm.test('status is 2xx', () => pm.response.code >= 200 && pm.response.code < 300);",
          "pm.test('is JSON', () => pm.response.headers.get('Content-Type')?.includes('application/json'));",
        ],
      },
    };

    for (const c of m.classes) {
      const entity = c.name.toLowerCase();

      // Body de ejemplo por atributos
      let createBody: any = Object.fromEntries(
        c.attributes.map((a: any) => [a.name, this.exampleFor(a.type)])
      );

      const byName = splitJoinName(c.name);
      if (byName) {
        const [left, right] = byName;
        createBody = { [`${left}Id`]: 0, [`${right}Id`]: 0 };
      } else if (joinEntityNames.has(c.name)) {
        const ends = new Set<string>();
        for (const r of rels) {
          if (r.source?.name === c.name && r.target) ends.add(r.target.name.toLowerCase());
          if (r.target?.name === c.name && r.source) ends.add(r.source.name.toLowerCase());
        }
        const [left, right] = Array.from(ends).slice(0, 2);
        if (left && right) createBody = { [`${left}Id`]: 0, [`${right}Id`]: 0 };
      }

      items.push({
        name: `${c.name} - List`,
        event: [basicTest],
        request: { method: 'GET', url: `${base}/api/${entity}` },
      });
      items.push({
        name: `${c.name} - Create`,
        event: [basicTest],
        request: {
          method: 'POST',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: `${base}/api/${entity}`,
          body: { mode: 'raw', raw: JSON.stringify(createBody, null, 2) },
        },
      });
      items.push({
        name: `${c.name} - Get by id`,
        event: [basicTest],
        request: { method: 'GET', url: `${base}/api/${entity}/:id` },
      });
      items.push({
        name: `${c.name} - Update`,
        event: [basicTest],
        request: {
          method: 'PUT',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: `${base}/api/${entity}/:id`,
          body: { mode: 'raw', raw: '{\n  \n}' },
        },
      });
      items.push({
        name: `${c.name} - Delete`,
        event: [basicTest],
        request: { method: 'DELETE', url: `${base}/api/${entity}/:id` },
      });
    }

    const collection = {
      info: {
        name: `${m.name} - Generated API`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{authToken}}', type: 'string' }],
      },
      item: items,
      variable: [
        { key: 'baseUrl', value: 'http://localhost:8080' },
        { key: 'authToken', value: '' },
      ],
    };

    const json = JSON.stringify(collection, null, 2);
    return { filename: `${m.name}_postman.json`, buffer: Buffer.from(json, 'utf-8') };
  }

// ----------- SPRING BOOT (4 capas + relaciones + herencia) ----------
async exportSpring(id: number) {
  const diagram = await this.fetchDiagram(id);
  const m = this.toIntermediate(diagram);

  // 1) artifactId (para nombre de artefacto) puede ir en kebab-case
  const groupId = 'com.example';
  const artifactIdRaw = this.safeName(m.name); // p.ej. "diagrama-principal"

  // 2) pkg (para 'package ...') NO puede tener guiones ni empezar por dígito
  const safePkgToken = (s: string) => {
    const t = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); // solo a-z0-9
    return /^[a-z]/.test(t) ? t : `app${t}`; // debe empezar con letra
  };
  const artifactIdForPkg = safePkgToken(m.name); // p.ej. "diagramaprincipal"

  const pkg = `${groupId}.${artifactIdForPkg}`;
  const pkgPath = pkg.replace(/\./g, '/');

  const byId = new Map<number, GenClass>(m.classes.map((c) => [c.id, c]));
  const rels = m.relations.filter((r) => r.source && r.target) as GenRelation[];

  // GENERALIZATION: child -> parent
  const inheritEdges = m.relations.filter(
    (r) => (r.kind || '').toUpperCase() === 'GENERALIZATION' && r.source && r.target
  ) as GenRelation[];
  const superOf = new Map<number, number>(); // childId -> parentId
  for (const g of inheritEdges) {
    if (g.source && g.target) superOf.set(g.source.id, g.target.id);
  }
  const parentIds = new Set<number>(Array.from(superOf.values())); // IDs de clases padre

  // join-entities por convención A_B o B_A
  const looksLikeJoinName = (a: string, b: string, cand: string) => {
    const n = cand.toLowerCase();
    return n === `${a.toLowerCase()}_${b.toLowerCase()}` || n === `${b.toLowerCase()}_${a.toLowerCase()}`;
  };
  const joinEntityNames = new Set<string>();
  for (const r of rels) {
    const a = r.source!.name;
    const b = r.target!.name;
    for (const c of m.classes) if (looksLikeJoinName(a, b, c.name)) joinEntityNames.add(c.name);
  }

  const zip = new JSZip();

  // pom.xml + application.properties (H2)
  zip.file('pom.xml', this.pomXml(groupId, artifactIdRaw));
  zip.file('src/main/resources/application.properties', this.applicationPropsH2());

  // Application
  zip.file(`src/main/java/${pkgPath}/Application.java`, this.applicationJava(pkg));

  // MODELOS
  for (const c of m.classes as GenClass[]) {
    const parentId = superOf.get(c.id);
    const superName = parentId ? byId.get(parentId)?.name ?? null : null;

    const opts = {
      superClass: superName,
      relationsOfClass: rels.filter((r) => r.source!.id === c.id || r.target!.id === c.id),
      isJoinEntity: joinEntityNames.has(c.name),
      isInheritanceRoot: parentIds.has(c.id), // Padre => lleva @Inheritance
    };

    zip.file(`src/main/java/${pkgPath}/model/${c.name}.java`, this.entityJava(pkg, c, opts));
  }

  // REPOSITORIES
  for (const c of m.classes as GenClass[]) {
    zip.file(`src/main/java/${pkgPath}/repository/${c.name}Repository.java`, this.repositoryJava(pkg, c.name));
  }

  // SERVICES
  for (const c of m.classes as GenClass[]) {
    zip.file(`src/main/java/${pkgPath}/service/${c.name}Service.java`, this.serviceJava(pkg, c));
  }

  // CONTROLLERS
  for (const c of m.classes as GenClass[]) {
    zip.file(`src/main/java/${pkgPath}/controller/${c.name}Controller.java`, this.controllerJava(pkg, c.name));
  }

  // README
  zip.file(
    'README.md',
    `# ${m.name}
Proyecto Spring Boot generado desde el diagrama.

• 4 capas (model/repository/service/controller)
• JPA + H2
• Relaciones por multiplicidades y composición
• Herencia con JOINED (anotada en la clase padre)
• Anti-recursión JSON (Jackson Managed/BackReference)

Comando:
mvn spring-boot:run
`
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { filename: `${m.name}_spring.zip`, buffer };
}

// ----------- SPRING: helpers de archivo ----------
// POM 100% autosuficiente (versiones explícitas) y Java 21
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
  <packaging>jar</packaging>

  <properties>
    <java.version>21</java.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.3.4</version>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
      <version>3.3.4</version>
    </dependency>
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
      <version>2.2.224</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <version>1.18.32</version>
      <optional>true</optional>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.2</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.11.0</version>
        <configuration>
          <release>\${java.version}</release>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <version>3.3.4</version>
      </plugin>
    </plugins>
  </build>
</project>`;
}

private applicationPropsH2() {
  return `spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
`;
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

// ----------- ENTITY GEN (JPA + relaciones + herencia + Jackson) -----------
private entityJava(
  pkg: string,
  c: GenClass,
  opts: {
    superClass: string | null;
    relationsOfClass: GenRelation[];
    isJoinEntity: boolean;
    isInheritanceRoot: boolean;
  },
) {
  const fields = c.attributes
    .map((a) => `  private ${this.javaType(a.type)} ${this.safeJavaId(a.name)};`)
    .join('\n');

  const extendsClause = opts.superClass ? ` extends ${opts.superClass}` : '';

  type RelField = { decl: string; name: string; type: string };
  const relFields: RelField[] = [];

  let relCode = '';
  if (opts.isJoinEntity) {
    const ends = new Set<string>();
    for (const r of opts.relationsOfClass) {
      if (r.source?.name !== c.name && r.source) ends.add(r.source.name);
      if (r.target?.name !== c.name && r.target) ends.add(r.target.name);
    }
    const names = Array.from(ends).slice(0, 2);
    relCode += names.map((n) => {
      const field = this.lowerFirst(n);
      relFields.push({
        name: field,
        type: n,
        decl: `  @com.fasterxml.jackson.annotation.JsonBackReference
  @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
  @JoinColumn(name = "${n.toLowerCase()}_id")
  private ${n} ${field};`,
      });
      return `\n${relFields[relFields.length - 1].decl}`;
    }).join('\n');
  } else {
    for (const r of opts.relationsOfClass) {
      const isSource = r.source?.name === c.name;
      const other = (isSource ? r.target : r.source)!;
      const myMult = isSource ? r.sourceMult : r.targetMult;
      const otherMult = isSource ? r.targetMult : r.sourceMult;

      const iAmMany = this.many(myMult);
      const otherIsMany = this.many(otherMult);
      const compo = (r.kind || '').toLowerCase().includes('compos');

      if (iAmMany && !otherIsMany) {
        const field = this.lowerFirst(other.name);
        const decl = `  @com.fasterxml.jackson.annotation.JsonBackReference
  @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
  @JoinColumn(name = "${field}_id")
  private ${other.name} ${field};`;
        relFields.push({ name: field, type: other.name, decl });
      } else if (!iAmMany && otherIsMany) {
        const field = this.plural(this.lowerFirst(other.name));
        const decl = `  @com.fasterxml.jackson.annotation.JsonManagedReference
  @OneToMany(mappedBy = "${this.lowerFirst(c.name)}"${compo ? ', cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true' : ''})
  private java.util.List<${other.name}> ${field} = new java.util.ArrayList<>();`;
        relFields.push({ name: field, type: `java.util.List<${other.name}>`, decl });
      } else if (iAmMany && otherIsMany) {
        const field = this.plural(this.lowerFirst(other.name));
        const decl = `  @ManyToMany
  @JoinTable(
    name = "${c.name.toLowerCase()}_${other.name.toLowerCase()}",
    joinColumns = @JoinColumn(name = "${this.lowerFirst(c.name)}_id"),
    inverseJoinColumns = @JoinColumn(name = "${this.lowerFirst(other.name)}_id")
  )
  private java.util.Set<${other.name}> ${field} = new java.util.HashSet<>();`;
        relFields.push({ name: field, type: `java.util.Set<${other.name}>`, decl });
      }
    }
    if (relFields.length) relCode = '\n' + relFields.map(rf => rf.decl).join('\n\n') + '\n';
  }

  const attrGetSet = c.attributes.map((a) => {
    const jt = this.javaType(a.type);
    const name = this.safeJavaId(a.name);
    const Up = name.charAt(0).toUpperCase() + name.slice(1);
    return `
  public ${jt} get${Up}() { return ${name}; }
  public void set${Up}(${jt} ${name}) { this.${name} = ${name}; }`;
  }).join('\n');

  const relGetSet = relFields.map((rf) => {
    const Up = rf.name.charAt(0).toUpperCase() + rf.name.slice(1);
    return `
  public ${rf.type} get${Up}() { return ${rf.name}; }
  public void set${Up}(${rf.type} ${rf.name}) { this.${rf.name} = ${rf.name}; }`;
  }).join('\n');

  return `package ${pkg}.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.*;

@Entity
${opts.isInheritanceRoot ? '@Inheritance(strategy = InheritanceType.JOINED)' : ''}
@Table(name = "${c.name}")
@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
public class ${c.name}${extendsClause} {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
${fields ? '\n' + fields : ''}${relCode ? '\n' + relCode : ''}

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }${attrGetSet}${relGetSet}
}
`;
}

private repositoryJava(pkg: string, className: string) {
  return `package ${pkg}.repository;

import ${pkg}.model.${className};
import org.springframework.data.jpa.repository.JpaRepository;

public interface ${className}Repository extends JpaRepository<${className}, Long> {}
`;
}

private serviceJava(pkg: string, c: GenClass) {
  const className = c.name;
  const copyLines = c.attributes.map((a) => {
    const name = this.safeJavaId(a.name);
    const Up = name.charAt(0).toUpperCase() + name.slice(1);
    return `      x.set${Up}(data.get${Up}());`;
  }).join('\n');

  return `package ${pkg}.service;

import ${pkg}.model.${className};
import ${pkg}.repository.${className}Repository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ${className}Service {
  private final ${className}Repository repo;
  public ${className}Service(${className}Repository repo){ this.repo = repo; }

  public List<${className}> findAll(){ return repo.findAll(); }
  public Optional<${className}> findById(Long id){ return repo.findById(id); }
  public ${className} create(${className} e){ return repo.save(e); }
  public ${className} update(Long id, ${className} data){
    return repo.findById(id).map(x -> {
${copyLines || '      // no simple fields to update'}
      return repo.save(x);
    }).orElseThrow(() -> new NoSuchElementException("${className} "+id+" not found"));
  }
  public void delete(Long id){ repo.deleteById(id); }
}
`;
}

private controllerJava(pkg: string, className: string) {
  return `package ${pkg}.controller;

import ${pkg}.model.${className};
import ${pkg}.service.${className}Service;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/${className.toLowerCase()}")
public class ${className}Controller {
  private final ${className}Service service;
  public ${className}Controller(${className}Service service){ this.service = service; }

  @GetMapping
  public List<${className}> all(){ return service.findAll(); }

  @GetMapping("/{id}")
  public ${className} one(@PathVariable Long id){ return service.findById(id).orElseThrow(); }

  @PostMapping
  public ${className} create(@RequestBody ${className} body){ return service.create(body); }

  @PutMapping("/{id}")
  public ${className} update(@PathVariable Long id, @RequestBody ${className} body){ return service.update(id, body); }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id){ service.delete(id); }
}
`;
}

}
