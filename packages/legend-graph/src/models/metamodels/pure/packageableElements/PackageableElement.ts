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
  type Hashable,
  hashArray,
  hashString,
  IllegalStateError,
  uuid,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../MetaModelConst';
import type { Package } from './domain/Package';
import type { Stubable } from '../../../../helpers/Stubable';
import type { Profile } from './domain/Profile';
import type { Enumeration } from './domain/Enumeration';
import type { Class } from './domain/Class';
import type { Association } from './domain/Association';
import type { ConcreteFunctionDefinition } from './domain/ConcreteFunctionDefinition';
import type { FlatData } from './store/flatData/model/FlatData';
import type { Mapping } from './mapping/Mapping';
import type { Service } from './service/Service';
import type { PrimitiveType } from './domain/PrimitiveType';
import type { Database } from './store/relational/model/Database';
import type { PackageableConnection } from './connection/PackageableConnection';
import type { PackageableRuntime } from './runtime/PackageableRuntime';
import type { FileGenerationSpecification } from './fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from './generationSpecification/GenerationSpecification';
import type { Measure } from './domain/Measure';
import type { SectionIndex } from './section/SectionIndex';
import type { DataElement } from './data/DataElement';

export interface PackageableElementVisitor<T> {
  visit_PackageableElement(element: PackageableElement): T;
  visit_SectionIndex(element: SectionIndex): T;
  visit_Package(element: Package): T;
  visit_PrimitiveType(element: PrimitiveType): T;
  visit_Profile(element: Profile): T;
  visit_Enumeration(element: Enumeration): T;
  visit_Measure(element: Measure): T;
  visit_Class(element: Class): T;
  visit_Association(element: Association): T;
  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): T;
  visit_PackageableConnection(element: PackageableConnection): T;
  visit_Mapping(element: Mapping): T;
  visit_PackageableRuntime(element: PackageableRuntime): T;

  visit_FlatData(element: FlatData): T;
  visit_Database(element: Database): T;
  visit_Service(element: Service): T;
  visit_FileGenerationSpecification(element: FileGenerationSpecification): T;
  visit_GenerationSpecification(element: GenerationSpecification): T;
  visit_DataElement(element: DataElement): T;
}

export abstract class PackageableElement implements Hashable, Stubable {
  readonly uuid = uuid();

  protected _isDeleted = false;
  protected _isDisposed = false;
  name: string;
  package?: Package | undefined;

  constructor(name: string) {
    this.name = name;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  setIsDeleted(value: boolean): void {
    this._isDeleted = value;
  }

  get path(): string {
    if (!this.package) {
      return this.name;
    }
    const parentPackageName = this.package.fullPath;
    return !parentPackageName
      ? this.name
      : `${parentPackageName}${ELEMENT_PATH_DELIMITER}${this.name}`;
  }

  get isStub(): boolean {
    return !this.name && !this.package;
  }

  /**
   * Dispose the element and its references to avoid memory leaks
   */
  dispose(): void {
    this._isDisposed = true;
    /**
     * Trigger recomputation on `hashCode` so if the element is observed, hash code computation will now
     * remove itself from all observables it previously observed
     *
     * NOTE: for example, we used to do this since we decorate `hashCode` with
     * `computed({ keepAlive: true })` which poses a memory-leak threat.
     * However, since we're calling `keepAlive` actively now and dispose it right away to return `hashCode` to
     * a normal computed value, we might not need this step anymore. But we're being extremely defensive here
     * to avoid memory leak.
     * See https://mobx.js.org/computeds.html#keepalive
     */
    try {
      this.hashCode;
    } catch {
      /* do nothing */
    }
  }

  protected get _elementHashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT, this.path]);
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    return this._elementHashCode;
  }

  abstract accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T;
}

// TODO: to be moved out of metamodel
export enum PACKAGEABLE_ELEMENT_TYPE {
  PRIMITIVE = 'PRIMITIVE',
  PACKAGE = 'PACKAGE',
  PROFILE = 'PROFILE',
  ENUMERATION = 'ENUMERATION',
  CLASS = 'CLASS',
  ASSOCIATION = 'ASSOCIATION',
  FUNCTION = 'FUNCTION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  FLAT_DATA_STORE = 'FLAT_DATA_STORE',
  DATABASE = 'DATABASE',
  SERVICE_STORE = 'SERVICE_STORE',
  MAPPING = 'MAPPING',
  SERVICE = 'SERVICE',
  CONNECTION = 'CONNECTION',
  RUNTIME = 'RUNTIME',
  FILE_GENERATION = 'FILE_GENERATION',
  GENERATION_SPECIFICATION = 'GENERATION_SPECIFICATION',
  SECTION_INDEX = 'SECTION_INDEX',
  DATA = 'Data',
}

// TODO: to be moved out of metamodel
export enum PACKAGEABLE_ELEMENT_POINTER_TYPE {
  STORE = 'STORE',
  MAPPING = 'MAPPING',
  FILE_GENERATION = 'FILE_GENERATION',
  SERVICE = 'SERVICE',
}

export const getElementPointerHashCode = (
  pointerType: string,
  path: string,
): string =>
  [CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER, pointerType, path]
    .map(hashString)
    .join(',');
