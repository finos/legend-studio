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
  UnsupportedOperationError,
  assertTrue,
  isNonNullable,
  assertErrorThrown,
} from '@finos/legend-studio-shared';
import { CORE_ELEMENT_PATH } from '../../../../../../MetaModelConst';
import { GraphError } from '../../../../../../MetaModelUtility';
import { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
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
import { V1_ProtocolToMetaModelClassMappingFirstPassVisitor } from './V1_ProtocolToMetaModelClassMappingFirstPassVisitor';
import {
  V1_processAssociationProperty,
  V1_processDerivedProperty,
  V1_processProperty,
  V1_processTaggedValue,
} from '../../../transformation/pureGraph/to/helpers/V1_DomainBuilderHelper';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure';
import { V1_processDatabaseSchemaViewsFirstPass } from '../../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex';
import type { V1_ServiceStore } from '../../../model/packageableElements/store/relational/V1_ServiceStore';

export class V1_ProtocolToMetaModelGraphThirdPassVisitor
  implements V1_PackageableElementVisitor<void>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_PackageableElement(element: V1_PackageableElement): void {
    this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runThirdPass(element, this.context);
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
    const _class = this.context.graph.getClass(
      this.context.graph.buildPackageString(element.package, element.name),
    );
    element.superTypes.forEach((type) => {
      // supertype `Any` will not be processed
      if (type !== CORE_ELEMENT_PATH.ANY) {
        try {
          const genricTypeReference = this.context.resolveGenericType(type);
          _class.addSuperType(genricTypeReference);
          if (genricTypeReference.ownerReference.value instanceof Class) {
            genricTypeReference.ownerReference.value.addSubClass(_class);
          }
        } catch (error: unknown) {
          assertErrorThrown(error);
          // NOTE: reconsider this as we might need to get elements from `system` and `platform` as well
          throw new GraphError(
            `Can't find supertype '${type}' of class '${this.context.graph.buildPackageString(
              element.package,
              element.name,
            )}': ${error.message}`,
          );
        }
      }
    });
    element.properties.forEach((property) =>
      _class.properties.push(
        V1_processProperty(property, this.context, _class),
      ),
    );
  }

  visit_Association(element: V1_Association): void {
    assertTrue(
      element.properties.length === 2,
      'Association must have exactly 2 properties',
    );
    const association = this.context.graph.getAssociation(
      this.context.graph.buildPackageString(element.package, element.name),
    );
    const first = element.properties[0];
    const second = element.properties[1];
    association.setProperties([
      V1_processAssociationProperty(first, second, this.context, association),
      V1_processAssociationProperty(second, first, this.context, association),
    ]);
    association.stereotypes = element.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    association.taggedValues = element.taggedValues
      .map((taggedValue) => V1_processTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
    association.derivedProperties = element.derivedProperties.map(
      (derivedProperty) =>
        V1_processDerivedProperty(derivedProperty, this.context, association),
    );
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
    element.schemas.forEach((schema) =>
      V1_processDatabaseSchemaViewsFirstPass(schema, database, this.context),
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
    mapping.classMappings = element.classMappings.map((classMapping) =>
      classMapping.accept_ClassMappingVisitor(
        new V1_ProtocolToMetaModelClassMappingFirstPassVisitor(
          this.context,
          mapping,
        ),
      ),
    );
  }

  visit_Service(element: V1_Service): void {
    throw new UnsupportedOperationError();
  }

  visit_Diagram(element: V1_Diagram): void {
    throw new UnsupportedOperationError();
  }

  visit_FileGeneration(element: V1_FileGenerationSpecification): void {
    throw new UnsupportedOperationError();
  }

  visit_GenerationSpecification(element: V1_GenerationSpecification): void {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: V1_SectionIndex): void {
    throw new UnsupportedOperationError();
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): void {
    throw new UnsupportedOperationError();
  }

  visit_PackageableConnection(element: V1_PackageableConnection): void {
    throw new UnsupportedOperationError();
  }
}
