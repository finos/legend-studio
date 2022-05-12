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
  IllegalStateError,
  uuid,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../MetaModelConst';
import type { Package } from './domain/Package';
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

export abstract class PackageableElement implements Hashable {
  readonly _UUID = uuid();
  protected _isDeleted = false;
  protected _isDisposed = false;

  name: string;
  package?: Package | undefined;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
  get isDeleted(): boolean {
    return this._isDeleted;
  }

  /**
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
  setIsDeleted(value: boolean): void {
    this._isDeleted = value;
  }

  /**
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
  get path(): string {
    if (!this.package) {
      return this.name;
    }
    const parentPackagePath = this.package.path;
    return !parentPackagePath
      ? this.name
      : `${parentPackagePath}${ELEMENT_PATH_DELIMITER}${this.name}`;
  }

  /**
   * Dispose the element and its references to avoid memory leaks.
   *
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
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
