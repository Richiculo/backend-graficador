import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class WithIdem {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsInt() @Min(1) localSeq!: number;
}

export class NodeCreateDto extends WithIdem {
  @IsString() @IsNotEmpty() id!: string;
  @IsInt() x!: number;
  @IsInt() y!: number;
  @IsInt() width!: number;
  @IsInt() height!: number;
  // data puede ser libre, si quieres también podrías validarlo
  data!: any;
}
export class NodeUpdateDto extends WithIdem { id!: string; patch!: Record<string, any>; }
export class NodeMoveDto   extends WithIdem { id!: string; x!: number; y!: number; }
export class NodeDeleteDto extends WithIdem { id!: string; }

export class EdgeCreateDto extends WithIdem {
  id!: string; sourceId!: string; targetId!: string; kind!: string; labels?: any; mult?: any;
}
export class EdgeUpdateDto extends WithIdem { id!: string; patch!: Record<string, any>; }
export class EdgeDeleteDto extends WithIdem { id!: string; }
