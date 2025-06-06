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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  V1_buildFullPath,
  type V1_GraphBuilderContext,
} from './V1_GraphBuilderContext.js';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile.js';
import type { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import type { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import type { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import type { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import type { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData.js';
import type { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database.js';
import type { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import type { V1_Service } from '../../../model/packageableElements/service/V1_Service.js';
import {
  V1_buildConstraint,
  V1_buildDerivedProperty,
} from './helpers/V1_DomainBuilderHelper.js';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure.js';
import { V1_buildDatabaseSchemaViewsSecondPass } from './helpers/V1_DatabaseBuilderHelper.js';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';
import type { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import type { V1_ExecutionEnvironmentInstance } from '../../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import type { V1_INTERNAL__UnknownPackageableElement } from '../../../model/packageableElements/V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_INTERNAL__UnknownFunctionActivator } from '../../../model/packageableElements/function/V1_INTERNAL__UnknownFunctionActivator.js';
import type { V1_INTERNAL__UnknownStore } from '../../../model/packageableElements/store/V1_INTERNAL__UnknownStore.js';
import type { V1_SnowflakeApp } from '../../../model/packageableElements/function/V1_SnowflakeApp.js';
import type { V1_INTERNAL__UnknownElement } from '../../../model/packageableElements/V1_INTERNAL__UnknownElement.js';
import type { V1_HostedService } from '../../../model/packageableElements/function/V1_HostedService.js';
import type { V1_DataProduct } from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import type { V1_IngestDefinition } from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import type { V1_MemSQLFunction } from '../../../model/packageableElements/function/V1_MemSQLFunction.js';

export class V1_ElementFifthPassBuilder
  implements V1_PackageableElementVisitor<void>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_PackageableElement(element: V1_PackageableElement): void {
    this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runFifthPass(element, this.context);
  }

  visit_INTERNAL__UnknownElement(element: V1_INTERNAL__UnknownElement): void {
    throw new UnsupportedOperationError();
  }

  visit_INTERNAL__UnknownPackageableElement(
    element: V1_INTERNAL__UnknownPackageableElement,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_INTERNAL__UnknownFunctionActivator(
    element: V1_INTERNAL__UnknownFunctionActivator,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_INTERNAL__UnknownStore(element: V1_INTERNAL__UnknownStore): void {
    return;
  }

  visit_Profile(element: V1_Profile): void {
    throw new UnsupportedOperationError();
  }

  visit_Enumeration(element: V1_Enumeration): void {
    throw new UnsupportedOperationError();
  }

  visit_Measure(element: V1_Measure): void {
    throw new UnsupportedOperationError();
  }

  visit_IngestDefinition(element: V1_IngestDefinition): void {
    throw new UnsupportedOperationError();
  }

  visit_Class(element: V1_Class): void {
    const _class = this.context.currentSubGraph.getOwnClass(
      V1_buildFullPath(element.package, element.name),
    );
    _class.derivedProperties = element.derivedProperties.map(
      (derivedProperty) =>
        V1_buildDerivedProperty(derivedProperty, this.context, _class),
    );
    _class.constraints = element.constraints.map((constraint) =>
      V1_buildConstraint(constraint, _class, this.context),
    );
  }

  visit_Association(element: V1_Association): void {
    throw new UnsupportedOperationError();
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_FlatData(element: V1_FlatData): void {
    return;
  }

  visit_Database(element: V1_Database): void {
    const database = this.context.currentSubGraph.getOwnDatabase(
      V1_buildFullPath(element.package, element.name),
    );
    element.schemas.forEach((schema) =>
      V1_buildDatabaseSchemaViewsSecondPass(schema, this.context, database),
    );
  }

  visit_Mapping(element: V1_Mapping): void {
    throw new UnsupportedOperationError();
  }

  visit_Service(element: V1_Service): void {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: V1_SectionIndex): void {
    throw new UnsupportedOperationError();
  }

  visit_FileGeneration(element: V1_FileGenerationSpecification): void {
    throw new UnsupportedOperationError();
  }

  visit_GenerationSpecification(element: V1_GenerationSpecification): void {
    throw new UnsupportedOperationError();
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): void {
    throw new UnsupportedOperationError();
  }

  visit_PackageableConnection(element: V1_PackageableConnection): void {
    throw new UnsupportedOperationError();
  }

  visit_DataElement(element: V1_DataElement): void {
    throw new UnsupportedOperationError();
  }

  visit_ExecutionEnvironmentInstance(
    element: V1_ExecutionEnvironmentInstance,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_SnowflakeApp(element: V1_SnowflakeApp): void {
    throw new UnsupportedOperationError();
  }

  visit_HostedService(element: V1_HostedService): void {
    throw new UnsupportedOperationError();
  }

  visit_MemSQLFunction(element: V1_MemSQLFunction): void {
    throw new UnsupportedOperationError();
  }

  visit_DataProduct(element: V1_DataProduct): void {
    throw new UnsupportedOperationError();
  }
}
