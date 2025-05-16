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

import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { V1_Profile } from './domain/V1_Profile.js';
import type { V1_Class } from './domain/V1_Class.js';
import type { V1_Enumeration } from './domain/V1_Enumeration.js';
import type { V1_FlatData } from './store/flatData/model/V1_FlatData.js';
import type { V1_Database } from './store/relational/model/V1_Database.js';
import type { V1_Mapping } from './mapping/V1_Mapping.js';
import type { V1_Service } from './service/V1_Service.js';
import type { V1_ConcreteFunctionDefinition } from './function/V1_ConcreteFunctionDefinition.js';
import type { V1_Association } from './domain/V1_Association.js';
import type { V1_PackageableRuntime } from './runtime/V1_PackageableRuntime.js';
import type { V1_PackageableConnection } from './connection/V1_PackageableConnection.js';
import type { V1_FileGenerationSpecification } from './fileGeneration/V1_FileGenerationSpecification.js';
import type { V1_GenerationSpecification } from './generationSpecification/V1_GenerationSpecification.js';
import type { V1_Measure } from './domain/V1_Measure.js';
import type { V1_SectionIndex } from './section/V1_SectionIndex.js';
import type { V1_DataElement } from './data/V1_DataElement.js';
import { ELEMENT_PATH_DELIMITER } from '../../../../../../graph/MetaModelConst.js';
import type { V1_ExecutionEnvironmentInstance } from './service/V1_ExecutionEnvironmentInstance.js';
import type { V1_INTERNAL__UnknownPackageableElement } from './V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_INTERNAL__UnknownFunctionActivator } from './function/V1_INTERNAL__UnknownFunctionActivator.js';
import type { V1_INTERNAL__UnknownStore } from './store/V1_INTERNAL__UnknownStore.js';
import type { V1_SnowflakeApp } from './function/V1_SnowflakeApp.js';
import type { V1_INTERNAL__UnknownElement } from './V1_INTERNAL__UnknownElement.js';
import type { V1_HostedService } from './function/V1_HostedService.js';
import type { V1_DataProduct } from './dataProduct/V1_DataProduct.js';
import type { V1_IngestDefinition } from './ingest/V1_IngestDefinition.js';

export interface V1_PackageableElementVisitor<T> {
  visit_PackageableElement(element: V1_PackageableElement): T;
  visit_INTERNAL__UnknownElement(element: V1_INTERNAL__UnknownElement): T;
  visit_INTERNAL__UnknownPackageableElement(
    element: V1_INTERNAL__UnknownPackageableElement,
  ): T;

  visit_INTERNAL__UnknownFunctionActivator(
    element: V1_INTERNAL__UnknownFunctionActivator,
  ): T;
  visit_INTERNAL__UnknownStore(element: V1_INTERNAL__UnknownStore): T;

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
  visit_Service(element: V1_Service): T;
  visit_GenerationSpecification(element: V1_GenerationSpecification): T;
  visit_FileGeneration(element: V1_FileGenerationSpecification): T;
  visit_DataElement(element: V1_DataElement): T;
  visit_ExecutionEnvironmentInstance(
    element: V1_ExecutionEnvironmentInstance,
  ): T;
  visit_SnowflakeApp(element: V1_SnowflakeApp): T;
  visit_HostedService(element: V1_HostedService): T;

  visit_DataProduct(element: V1_DataProduct): T;
  visit_IngestDefinition(element: V1_IngestDefinition): T;
}

export abstract class V1_PackageableElement implements Hashable {
  package!: string;
  name!: string;

  /**
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
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

export class V1_PackageableElementPointer implements Hashable {
  type?: string | undefined;
  path!: string;

  constructor(type: string | undefined, path: string) {
    this.type = type;
    this.path = path;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER,
      this.type ?? '',
      this.path,
    ]);
  }
}
