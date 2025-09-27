import { PartialType } from '@nestjs/mapped-types';
import { CreateUmlRelationDto } from './create-uml-relation.dto';

export class UpdateUmlRelationDto extends PartialType(CreateUmlRelationDto) {}
