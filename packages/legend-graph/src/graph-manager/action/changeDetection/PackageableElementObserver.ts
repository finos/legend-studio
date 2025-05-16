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

import type {
  PackageableElement,
  PackageableElementVisitor,
} from '../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { Profile } from '../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Enumeration } from '../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Measure } from '../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { Class } from '../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { ConcreteFunctionDefinition } from '../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { FlatData } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import type { Database } from '../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Service } from '../../../graph/metamodel/pure/packageableElements/service/Service.js';
import type { PackageableRuntime } from '../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { PackageableConnection } from '../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { FileGenerationSpecification } from '../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from '../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type { Package } from '../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { PrimitiveType } from '../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import type { SectionIndex } from '../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import {
  observe_Association,
  observe_Class,
  observe_ConcreteFunctionDefinition,
  observe_Enumeration,
  observe_INTERNAL__UnknownFunctionActivator,
  observe_Measure,
  observe_Package,
  observe_Profile,
  observe_HostedService,
  observe_SectionIndex,
  observe_SnowflakeApp,
} from './DomainObserverHelper.js';
import {
  type ObserverContext,
  skipObservedWithContext,
  observe_INTERNAL__UnknownPackageableElement,
  observe_INTERNAL__UnknownElement,
} from './CoreObserverHelper.js';
import {
  observe_FileGenerationSpecification,
  observe_GenerationSpecification,
} from './DSL_Generation_ObserverHelper.js';
import {
  observe_INTERNAL__UnknownStore,
  observe_Mapping,
  observe_PackageableConnection,
  observe_PackageableRuntime,
} from './DSL_Mapping_ObserverHelper.js';
import { observe_Service } from './DSL_Service_ObserverHelper.js';
import { observe_FlatData } from './STO_FlatData_ObserverHelper.js';
import { observe_Database } from './STO_Relational_ObserverHelper.js';
import type { DataElement } from '../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import { observe_DataElement } from './DSL_Data_ObserverHelper.js';
import type { ExecutionEnvironmentInstance } from '../../../graph/metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import { observe_ExecutionEnvironmentInstance } from './DSL_ExecutionEnvironment_ObseverHelper.js';
import type { INTERNAL__UnknownPackageableElement } from '../../../graph/metamodel/pure/packageableElements/INTERNAL__UnknownPackageableElement.js';
import type { INTERNAL__UnknownFunctionActivator } from '../../../graph/metamodel/pure/packageableElements/function/INTERNAL__UnknownFunctionActivator.js';
import type { INTERNAL__UnknownStore } from '../../../graph/metamodel/pure/packageableElements/store/INTERNAL__UnknownStore.js';
import type { SnowflakeApp } from '../../../graph/metamodel/pure/packageableElements/function/SnowflakeApp.js';
import type { INTERNAL__UnknownElement } from '../../../graph/metamodel/pure/packageableElements/INTERNAL__UnknownElement.js';
import type { HostedService } from '../../../graph/metamodel/pure/packageableElements/function/HostedService.js';
import type { DataProduct } from '../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import { observe_DataProduct } from './DataProductObserveHelper.js';
import type { IngestDefinition } from '../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';

class PackageableElementObserver implements PackageableElementVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_PackageableElement(element: PackageableElement): void {
    const extraElementObservers = this.observerContext.plugins.flatMap(
      (plugin) => plugin.getExtraElementObservers?.() ?? [],
    );
    for (const observer of extraElementObservers) {
      const observedElement = observer(element, this.observerContext);
      if (observedElement) {
        return;
      }
    }
  }

  visit_INTERNAL__UnknownElement(element: INTERNAL__UnknownElement): void {
    observe_INTERNAL__UnknownElement(element);
  }

  visit_INTERNAL__UnknownPackageableElement(
    element: INTERNAL__UnknownPackageableElement,
  ): void {
    observe_INTERNAL__UnknownPackageableElement(element);
  }

  visit_INTERNAL__UnknownFunctionActivator(
    element: INTERNAL__UnknownFunctionActivator,
  ): void {
    observe_INTERNAL__UnknownFunctionActivator(element);
  }

  visit_SnowflakeApp(element: SnowflakeApp): void {
    observe_SnowflakeApp(element);
  }

  visit_HostedService(element: HostedService): void {
    observe_HostedService(element, this.observerContext);
  }

  visit_INTERNAL__UnknownStore(element: INTERNAL__UnknownStore): void {
    observe_INTERNAL__UnknownStore(element);
  }

  visit_Package(element: Package): void {
    observe_Package(element, this.observerContext);
  }

  visit_SectionIndex(element: SectionIndex): void {
    observe_SectionIndex(element);
  }

  visit_PrimitiveType(element: PrimitiveType): void {
    return;
  }

  visit_Profile(element: Profile): void {
    observe_Profile(element);
  }

  visit_Enumeration(element: Enumeration): void {
    observe_Enumeration(element);
  }

  visit_Measure(element: Measure): void {
    observe_Measure(element);
  }

  visit_Class(element: Class): void {
    observe_Class(element);
  }

  visit_Association(element: Association): void {
    observe_Association(element);
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): void {
    observe_ConcreteFunctionDefinition(element, this.observerContext);
  }

  visit_FlatData(element: FlatData): void {
    observe_FlatData(element);
  }

  visit_Database(element: Database): void {
    observe_Database(element, this.observerContext);
  }

  visit_DataProduct(element: DataProduct): void {
    observe_DataProduct(element);
  }

  visit_Mapping(element: Mapping): void {
    observe_Mapping(element, this.observerContext);
  }

  visit_Service(element: Service): void {
    observe_Service(element, this.observerContext);
  }

  visit_ExecutionEnvironmentInstance(
    element: ExecutionEnvironmentInstance,
  ): void {
    observe_ExecutionEnvironmentInstance(element, this.observerContext);
  }

  visit_PackageableRuntime(element: PackageableRuntime): void {
    observe_PackageableRuntime(element, this.observerContext);
  }

  visit_PackageableConnection(element: PackageableConnection): void {
    observe_PackageableConnection(element, this.observerContext);
  }

  visit_FileGenerationSpecification(
    element: FileGenerationSpecification,
  ): void {
    observe_FileGenerationSpecification(element);
  }

  visit_GenerationSpecification(element: GenerationSpecification): void {
    observe_GenerationSpecification(element);
  }

  visit_DataElement(element: DataElement): void {
    observe_DataElement(element, this.observerContext);
  }

  visit_IngestDefinition(element: IngestDefinition): void {
    return this.visit_INTERNAL__UnknownPackageableElement(element);
  }
}

export const observe_PackageableElement = skipObservedWithContext(
  (
    packageableElement: PackageableElement,
    context: ObserverContext,
  ): PackageableElement => {
    packageableElement.accept_PackageableElementVisitor(
      new PackageableElementObserver(context),
    );
    return packageableElement;
  },
);
