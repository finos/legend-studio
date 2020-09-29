/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable } from 'serializr';
import { HASH_STRUCTURE, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { Profile } from './domain/Profile';
import { Class } from './domain/Class';
import { Diagram } from './diagram/Diagram';
import { Enumeration } from './domain/Enumeration';
import { Mapping } from './mapping/Mapping';
import { Text } from './text/Text';
import { ConcreteFunctionDefinition } from './function/ConcreteFunctionDefinition';
import { Association } from './domain/Association';
import { PackageableRuntime } from './runtime/PackageableRuntime';
import { PackageableConnection } from './connection/PackageableConnection';
import { FileGeneration } from './fileGeneration/FileGeneration';
import { GenerationSpecification } from './generationSpecification/GenerationSpecification';
import { Measure } from './domain/Measure';
import { SectionIndex } from './section/SectionIndex';

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export enum PackageableElementType {
  PROFILE = 'profile',
  ENUMERATION = 'Enumeration',
  MEASURE = 'measure',
  UNIT = 'unit',
  CLASS = 'class',
  ASSOCIATION = 'association',
  FUNCTION = 'function',
  MAPPING = 'mapping',
  DIAGRAM = 'diagram',
  TEXT = 'text',
  CONNECTION = 'connection',
  RUNTIME = 'runtime',
  FILE_GENERATION = 'fileGeneration',
  GENERATION_SPECIFICATION = 'generationSpecification',
  SECTION_INDEX = 'sectionIndex',
}

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export interface PackageableElementVisitor<T> {
  visit_Profile(element: Profile): T;
  visit_Enumeration(element: Enumeration): T;
  visit_Measure(element: Measure): T;
  visit_Class(element: Class): T;
  visit_Association(element: Association): T;
  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): T;
  visit_Mapping(element: Mapping): T;
  visit_Diagram(element: Diagram): T;
  visit_Text(element: Text): T;
  visit_PackageableRuntime(element: PackageableRuntime): T;
  visit_PackageableConnection(element: PackageableConnection): T;
  visit_FileGeneration(element: FileGeneration): T;
  visit_GenerationSpecification(element: GenerationSpecification): T;
  visit_SectionIndex(element: SectionIndex): T;
}

export abstract class PackageableElement implements Hashable {
  @serializable _type!: PackageableElementType;
  @serializable package!: string;
  @serializable name!: string;
  @serializable parentSection?: string;

  get path(): string { return `${this.package}${ENTITY_PATH_DELIMITER}${this.name}` }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PACKAGEABLE_ELEMENT,
      this.path,
    ]);
  }

  abstract accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T
}

export enum PackageableElementPointerType {
  STORE = 'STORE',
  MAPPING = 'MAPPING',
  FILE_GENERATION = 'FILE_GENERATION'
}

export class PackageableElementPointer implements Hashable {
  @serializable type!: PackageableElementPointerType;
  @serializable path!: string;

  constructor(type: PackageableElementPointerType, path: string) {
    this.type = type;
    this.path = path;
  }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER,
      this.type,
      this.path,
    ]);
  }
}
