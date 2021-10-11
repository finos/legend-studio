/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CORE_HASH_STRUCTURE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type { V1_Profile } from './domain/V1_Profile';
import type { V1_Class } from './domain/V1_Class';
import type { V1_Enumeration } from './domain/V1_Enumeration';
import type { V1_FlatData } from './store/flatData/model/V1_FlatData';
import type { V1_Database } from './store/relational/model/V1_Database';
import type { V1_Mapping } from './mapping/V1_Mapping';
import type { V1_Service } from './service/V1_Service';
import type { V1_ConcreteFunctionDefinition } from './function/V1_ConcreteFunctionDefinition';
import type { V1_Association } from './domain/V1_Association';
import type { V1_PackageableRuntime } from './runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from './connection/V1_PackageableConnection';
import type { V1_FileGenerationSpecification } from './fileGeneration/V1_FileGenerationSpecification';
import type { V1_GenerationSpecification } from './generationSpecification/V1_GenerationSpecification';
import type { V1_Measure } from './domain/V1_Measure';
import type { V1_SectionIndex } from './section/V1_SectionIndex';
import type { V1_ServiceStore } from './store/relational/V1_ServiceStore';

export interface V1_PackageableElementVisitor<T> {
  visit_PackageableElement(element: V1_PackageableElement): T;
  visit_SectionIndex(element: V1_SectionIndex): T;
  visit_Profile(element: V1_Profile): T;
  visit_Enumeration(element: V1_Enumeration): T;
  visit_Measure(element: V1_Measure): T;
  visit_Class(element: V1_Class): T;
  visit_Association(element: V1_Association): T;
  visit_ConcreteFunctionDefinition(element: V1_ConcreteFunctionDefinition): T;
  visit_PackageableConnection(element: V1_PackageableConnection): T;
  visit_Mapping(element: V1_Mapping): T;
  visit_PackageableRuntime(element: V1_PackageableRuntime): T;

  visit_FlatData(element: V1_FlatData): T;
  visit_Database(element: V1_Database): T;
  visit_ServiceStore(element: V1_ServiceStore): T;
  visit_Service(element: V1_Service): T;
  visit_GenerationSpecification(element: V1_GenerationSpecification): T;
  visit_FileGeneration(element: V1_FileGenerationSpecification): T;
}

export abstract class V1_PackageableElement implements Hashable {
  package!: string;
  name!: string;
  parentSection?: string | undefined;

  get path(): string {
    return `${this.package}${ELEMENT_PATH_DELIMITER}${this.name}`;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT, this.path]);
  }

  abstract accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T;
}

export enum V1_PackageableElementPointerType {
  STORE = 'STORE',
  MAPPING = 'MAPPING',
  RUNTIME = 'RUNTIME',
  FILE_GENERATION = 'FILE_GENERATION',
  SERVICE = 'SERVICE',
}

export class V1_PackageableElementPointer implements Hashable {
  type!: string;
  path!: string;

  constructor(type: string, path: string) {
    this.type = type;
    this.path = path;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER,
      this.type,
      this.path,
    ]);
  }
}
