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

import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile';
import type { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration';
import type { V1_Class } from '../../../model/packageableElements/domain/V1_Class';
import type { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import type { V1_Association } from '../../../model/packageableElements/domain/V1_Association';
import type { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData';
import type { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database';
import type { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping';
import type { V1_Service } from '../../../model/packageableElements/service/V1_Service';
import type { V1_Diagram } from '../../../model/packageableElements/diagram/V1_Diagram';
import { V1_ProtocolToMetaModelClassMappingSecondPassBuilder } from './V1_ProtocolToMetaModelClassMappingSecondPassBuilder';
import {
  V1_buildMappingTest,
  V1_resolveClassMappingRoot,
} from './helpers/V1_MappingBuilderHelper';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure';
import {
  V1_buildDatabaseJoin,
  V1_buildDatabaseFilter,
} from './helpers/V1_DatabaseBuilderHelper';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex';
import type { V1_ServiceStore } from '../../../model/packageableElements/store/relational/V1_ServiceStore';
import { V1_buildAssociationMapping } from './helpers/V1_AssociationMappingHelper';

export class V1_ProtocolToMetaModelGraphFourthPassBuilder
  implements V1_PackageableElementVisitor<void>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_PackageableElement(element: V1_PackageableElement): void {
    this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runFourthPass(element, this.context);
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

  visit_Class(element: V1_Class): void {
    // TODO?: milestoning (process properties and class)
    throw new UnsupportedOperationError();
  }

  visit_Association(element: V1_Association): void {
    // TODO?: milestoning (process properties)
    throw new UnsupportedOperationError();
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_FlatData(element: V1_FlatData): void {
    this.context.graph.getFlatDataStore(
      this.context.graph.buildPackageString(element.package, element.name),
    );
  }

  visit_Database(element: V1_Database): void {
    const database = this.context.graph.getDatabase(
      this.context.graph.buildPackageString(element.package, element.name),
    );
    database.joins = element.joins.map((join) =>
      V1_buildDatabaseJoin(join, this.context, database),
    );
    database.filters = element.filters.map((filter) =>
      V1_buildDatabaseFilter(filter, this.context, database),
    );
  }

  visit_ServiceStore(element: V1_ServiceStore): void {
    this.context.graph.getServiceStore(
      this.context.graph.buildPackageString(element.package, element.name),
    );
  }

  visit_Mapping(element: V1_Mapping): void {
    const path = this.context.graph.buildPackageString(
      element.package,
      element.name,
    );
    const mapping = this.context.graph.getMapping(path);
    mapping.associationMappings = element.associationMappings.map(
      (_associationMapping) =>
        V1_buildAssociationMapping(_associationMapping, mapping, this.context),
    );
    element.classMappings.forEach((classMapping) =>
      classMapping.accept_ClassMappingVisitor(
        new V1_ProtocolToMetaModelClassMappingSecondPassBuilder(
          this.context,
          mapping,
        ),
      ),
    );
    mapping.tests = element.tests.map((test) =>
      V1_buildMappingTest(test, this.context),
    );
    // resolve class mappings root
    V1_resolveClassMappingRoot(mapping);
  }

  visit_Service(element: V1_Service): void {
    throw new UnsupportedOperationError();
  }

  visit_Diagram(element: V1_Diagram): void {
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
}
