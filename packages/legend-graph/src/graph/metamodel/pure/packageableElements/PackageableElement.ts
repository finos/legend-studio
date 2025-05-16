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
import { ELEMENT_PATH_DELIMITER } from '../../../MetaModelConst.js';
import { CORE_HASH_STRUCTURE } from '../../../../graph/Core_HashUtils.js';
import type { Package } from './domain/Package.js';
import type { Profile } from './domain/Profile.js';
import type { Enumeration } from './domain/Enumeration.js';
import type { Class } from './domain/Class.js';
import type { Association } from './domain/Association.js';
import type { ConcreteFunctionDefinition } from './function/ConcreteFunctionDefinition.js';
import type { FlatData } from './store/flatData/model/FlatData.js';
import type { Mapping } from './mapping/Mapping.js';
import type { Service } from './service/Service.js';
import type { PrimitiveType } from './domain/PrimitiveType.js';
import type { Database } from './store/relational/model/Database.js';
import type { PackageableConnection } from './connection/PackageableConnection.js';
import type { PackageableRuntime } from './runtime/PackageableRuntime.js';
import type { FileGenerationSpecification } from './fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from './generationSpecification/GenerationSpecification.js';
import type { Measure } from './domain/Measure.js';
import type { SectionIndex } from './section/SectionIndex.js';
import type { DataElement } from './data/DataElement.js';
import { AnnotatedElement } from './domain/AnnotatedElement.js';
import type { ExecutionEnvironmentInstance } from './service/ExecutionEnvironmentInstance.js';
import type { INTERNAL__UnknownPackageableElement } from './INTERNAL__UnknownPackageableElement.js';
import type { INTERNAL__UnknownFunctionActivator } from './function/INTERNAL__UnknownFunctionActivator.js';
import type { INTERNAL__UnknownStore } from './store/INTERNAL__UnknownStore.js';
import type { SnowflakeApp } from './function/SnowflakeApp.js';
import type { INTERNAL__UnknownElement } from './INTERNAL__UnknownElement.js';
import type { HostedService } from './function/HostedService.js';
import type { DataProduct } from '../dataProduct/DataProduct.js';
import type { IngestDefinition } from './ingest/IngestDefinition.js';

export interface PackageableElementVisitor<T> {
  visit_PackageableElement(element: PackageableElement): T;
  visit_INTERNAL__UnknownElement(element: INTERNAL__UnknownElement): T;
  visit_INTERNAL__UnknownPackageableElement(
    element: INTERNAL__UnknownPackageableElement,
  ): T;
  visit_INTERNAL__UnknownFunctionActivator(
    element: INTERNAL__UnknownFunctionActivator,
  ): T;
  visit_INTERNAL__UnknownStore(element: INTERNAL__UnknownStore): T;

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
  visit_ExecutionEnvironmentInstance(element: ExecutionEnvironmentInstance): T;
  visit_SnowflakeApp(element: SnowflakeApp): T;
  visit_HostedService(element: HostedService): T;
  visit_DataProduct(element: DataProduct): T;
  visit_IngestDefinition(element: IngestDefinition): T;
}

class ModelElement extends AnnotatedElement {
  name!: string;
}

export abstract class PackageableElement
  extends ModelElement
  implements Hashable
{
  readonly _UUID = uuid();
  protected _isDeleted = false;
  protected _isDisposed = false;

  package?: Package | undefined;

  constructor(name: string) {
    super();
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
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
