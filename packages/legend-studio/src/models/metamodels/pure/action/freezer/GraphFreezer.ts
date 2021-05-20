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
import type {
  PackageableElement,
  PackageableElementVisitor,
} from '../../model/packageableElements/PackageableElement';
import type { SetImplementationVisitor } from '../../model/packageableElements/mapping/SetImplementation';
import type {
  ConnectionVisitor,
  ConnectionPointer,
} from '../../model/packageableElements/connection/Connection';
import type { Profile } from '../../model/packageableElements/domain/Profile';
import type { Enumeration } from '../../model/packageableElements/domain/Enumeration';
import type { Class } from '../../model/packageableElements/domain/Class';
import type { Association } from '../../model/packageableElements/domain/Association';
import type { ConcreteFunctionDefinition } from '../../model/packageableElements/domain/ConcreteFunctionDefinition';
import type { FlatData } from '../../model/packageableElements/store/flatData/model/FlatData';
import type { Mapping } from '../../model/packageableElements/mapping/Mapping';
import type { Service } from '../../model/packageableElements/service/Service';
import type { Diagram } from '../../model/packageableElements/diagram/Diagram';
import type { OperationSetImplementation } from '../../model/packageableElements/mapping/OperationSetImplementation';
import type { PureInstanceSetImplementation } from '../../model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import type { FlatDataInstanceSetImplementation } from '../../model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { PropertyMappingVisitor } from '../../model/packageableElements/mapping/PropertyMapping';
import type { PurePropertyMapping } from '../../model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import type { FlatDataPropertyMapping } from '../../model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { EmbeddedFlatDataPropertyMapping } from '../../model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { JsonModelConnection } from '../../model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import type { PrimitiveType } from '../../model/packageableElements/domain/PrimitiveType';
import type { Package } from '../../model/packageableElements/domain/Package';
import {
  freeze,
  freezeArray,
  freezeProperty,
  freezeDerivedProperty,
  freezeFlatDataSection,
  freezeRelationshipView,
  freezeServiceTest,
  freezeServiceExecution,
  freezeEnumerationMapping,
  freezeMappingTest,
  freezeRuntime,
  freezeUnit,
  freezeSchema,
  freezeJoin,
  freezeAuthenticationStrategy,
  freezeDatasourceSpecification,
} from './GraphFreezerHelper';
import type { Database } from '../../model/packageableElements/store/relational/model/Database';
import type { FlatDataConnection } from '../../model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { PackageableRuntime } from '../../model/packageableElements/runtime/PackageableRuntime';
import type { PackageableConnection } from '../../model/packageableElements/connection/PackageableConnection';
import type { XmlModelConnection } from '../../model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import type { FileGenerationSpecification } from '../../model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from '../../model/packageableElements/generationSpecification/GenerationSpecification';
import type { Measure } from '../../model/packageableElements/domain/Measure';
import type { RelationalInstanceSetImplementation } from '../../model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from '../../model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { RelationalPropertyMapping } from '../../model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../model/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../model/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import type { RelationalDatabaseConnection } from '../../model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import type { SectionIndex } from '../../model/packageableElements/section/SectionIndex';
import type { ServiceStore } from '../../model/packageableElements/store/relational/model/ServiceStore';
import type { AggregationAwareSetImplementation } from '../../model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import type { AggregationAwarePropertyMapping } from '../../model/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping';
import type { XStorePropertyMapping } from '../../model/packageableElements/mapping/xStore/XStorePropertyMapping';
import type { ModelChainConnection } from '../../model/packageableElements/store/modelToModel/connection/ModelChainConnection';
import type {
  ElementFreezer,
  PureGraphManagerPlugin,
} from '../../graph/PureGraphManagerPlugin';

export class GraphFreezer
  implements
    PackageableElementVisitor<void>,
    SetImplementationVisitor<void>,
    PropertyMappingVisitor<void>,
    ConnectionVisitor<void>
{
  extraElementFreezerPlugins: ElementFreezer[] = [];

  constructor(plugins: PureGraphManagerPlugin[]) {
    this.extraElementFreezerPlugins = plugins.flatMap(
      (plugin) => plugin.getExtraElementFreezers?.() ?? [],
    );
  }

  visit_PackageableElement(metamodel: PackageableElement): void {
    this.extraElementFreezerPlugins.forEach((freezer) => freezer(metamodel));
  }

  // ----------------------------------------------- DOMAIN ----------------------------------------

  visit_PrimitiveType(metamodel: PrimitiveType): void {
    throw new UnsupportedOperationError();
  }

  visit_Package(metamodel: Package): void {
    throw new UnsupportedOperationError();
  }

  visit_Profile(metamodel: Profile): void {
    freeze(metamodel);
    freezeArray(metamodel.tags, freeze);
    freezeArray(metamodel.stereotypes, freeze);
  }

  visit_Measure(element: Measure): void {
    freeze(element);
    if (element.canonicalUnit) {
      freezeUnit(element.canonicalUnit);
    }
    freezeArray(element.nonCanonicalUnits, freezeUnit);
  }

  visit_Enumeration(element: Enumeration): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, (tagValue) => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.values, (enumValue) => {
      freeze(enumValue);
      freezeArray(enumValue.stereotypes, freeze);
      freezeArray(enumValue.taggedValues, (tagValue) => {
        freeze(tagValue);
        freeze(tagValue.tag);
      });
    });
  }

  visit_Class(element: Class): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, (tagValue) => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.properties, freezeProperty);
    freezeArray(element.propertiesFromAssociations, freezeProperty);
    freezeArray(element.derivedProperties, freezeDerivedProperty);
    freezeArray(element.generalizations, freeze);
    freezeArray(element.constraints, (constraint) => {
      freeze(constraint);
      freeze(constraint.functionDefinition);
    });
  }

  visit_Association(element: Association): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, (tagValue) => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.properties, freezeProperty);
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): void {
    freeze(element);
    freeze(element.returnMultiplicity);
    freezeArray(element.body);
    freezeArray(element.parameters);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, (tagValue) => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
  }

  visit_GenerationSpecification(element: GenerationSpecification): void {
    freeze(element);
    freezeArray(element.generationNodes);
    freezeArray(element.fileGenerations);
  }

  visit_FlatData(element: FlatData): void {
    freeze(element);
    freezeArray(element.sections, freezeFlatDataSection);
  }

  visit_Database(element: Database): void {
    freeze(element);
    freezeArray(element.schemas, freezeSchema);
    freezeArray(element.joins, freezeJoin);
    freezeArray(element.filters);
  }

  visit_ServiceStore(element: ServiceStore): void {
    freeze(element);
  }

  visit_Mapping(element: Mapping): void {
    freeze(element);
    // freezeArray(element.includes);
    freezeArray(element.classMappings, (classMapping) =>
      classMapping.accept_SetImplementationVisitor(this),
    );
    freezeArray(element.enumerationMappings, freezeEnumerationMapping);
    freezeArray(element.associationMappings, freeze);
    freezeArray(element.tests, freezeMappingTest);
  }

  visit_PackageableRuntime(element: PackageableRuntime): void {
    freeze(element);
    freezeRuntime(element.runtimeValue, this);
  }

  visit_PackageableConnection(element: PackageableConnection): void {
    freeze(element);
    element.connectionValue.accept_ConnectionVisitor(this);
  }

  visit_Service(element: Service): void {
    freeze(element);
    freezeServiceExecution(element.execution, this);
    freezeServiceTest(element.test);
  }

  visit_Diagram(element: Diagram): void {
    freeze(element);
    freezeArray(element.classViews, (classView) => {
      freeze(classView);
      freeze(classView.position);
      freeze(classView.rectangle);
    });
    freezeArray(element.associationViews, freezeRelationshipView);
    freezeArray(element.generalizationViews, freezeRelationshipView);
    freezeArray(element.propertyViews, freezeRelationshipView);
  }

  visit_FileGenerationSpecification(
    element: FileGenerationSpecification,
  ): void {
    freeze(element);
    freezeArray(element.scopeElements);
    freezeArray(element.configurationProperties, (configProperty) => {
      freeze(configProperty);
      freezeArray(configProperty.value as unknown[]);
    });
  }

  visit_SectionIndex(element: SectionIndex): void {
    freeze(element);
    freezeArray(element.sections);
  }

  // ----------------------------------------------- CLASS MAPPING ----------------------------------------

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.parameters, freeze);
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation: FlatDataInstanceSetImplementation,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.primaryKey, freeze);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): void {
    freeze(setImplementation);
    freezeArray(setImplementation.primaryKey, freeze);
    freezeArray(setImplementation.columnMappings);
    freeze(setImplementation.filter);
    freeze(setImplementation.groupBy);
    freeze(setImplementation.mainTableAlias);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freeze(setImplementation.mainSetImplementation);
    freezeArray(setImplementation.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
    freezeArray(
      setImplementation.aggregateSetImplementations,
      (aggregateSetImpl) => {
        freeze(aggregateSetImpl);
        freeze(aggregateSetImpl.aggregateSpecification);
        freezeArray(
          aggregateSetImpl.aggregateSpecification.groupByFunctions,
          (func) => {
            freeze(func);
          },
        );
        freezeArray(
          aggregateSetImpl.aggregateSpecification.aggregateValues,
          (func) => {
            freeze(func);
          },
        );
      },
    );
  }

  // ----------------------------------------------- PROPERTY MAPPING ----------------------------------------

  visit_PurePropertyMapping(metamodel: PurePropertyMapping): void {
    freeze(metamodel);
    freeze(metamodel.transform);
  }

  visit_FlatDataPropertyMapping(metamodel: FlatDataPropertyMapping): void {
    freeze(metamodel);
    freeze(metamodel.transform);
  }

  visit_EmbeddedFlatDataPropertyMapping(
    metamodel: EmbeddedFlatDataPropertyMapping,
  ): void {
    freeze(metamodel);
    freeze(metamodel.id);
    this.visit_EmbeddedFlatDataSetImplementation(metamodel);
  }

  visit_RelationalPropertyMapping(metamodel: RelationalPropertyMapping): void {
    freeze(metamodel);
    freeze(metamodel.relationalOperation);
  }

  visit_EmbeddedRelationalPropertyMapping(
    metamodel: EmbeddedRelationalInstanceSetImplementation,
  ): void {
    freeze(metamodel);
    freeze(metamodel.id);
    freeze(metamodel.class);
    freezeArray(metamodel.primaryKey, freeze);
    freezeArray(metamodel.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_InlineEmbeddedRelationalPropertyMapping(
    metamodel: InlineEmbeddedRelationalInstanceSetImplementation,
  ): void {
    freeze(metamodel);
    freeze(metamodel.id);
    freeze(metamodel.class);
    freezeArray(metamodel.primaryKey, freeze);
    freeze(metamodel.inlineSetImplementation);
    freezeArray(metamodel.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    metamodel: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  ): void {
    freeze(metamodel);
    freeze(metamodel.id);
    freeze(metamodel.class);
    freezeArray(metamodel.primaryKey, freeze);
    metamodel.otherwisePropertyMapping.accept_PropertyMappingVisitor(this);
    freezeArray(metamodel.propertyMappings, (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_XStorePropertyMapping(metamodel: XStorePropertyMapping): void {
    freeze(metamodel);
    freeze(metamodel.crossExpression);
  }

  visit_AggregationAwarePropertyMapping(
    metamodel: AggregationAwarePropertyMapping,
  ): void {
    freeze(metamodel);
  }

  // ----------------------------------------------- CONNECTION ----------------------------------------

  visit_ConnectionPointer(connection: ConnectionPointer): void {
    freeze(connection);
  }

  visit_ModelChainConnection(connection: ModelChainConnection): void {
    freeze(connection);
    freezeArray(connection.mappings);
  }

  visit_JsonModelConnection(connection: JsonModelConnection): void {
    freeze(connection);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): void {
    freeze(connection);
  }

  visit_FlatDataConnection(connection: FlatDataConnection): void {
    freeze(connection);
  }

  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): void {
    freeze(connection);
    freezeAuthenticationStrategy(connection.authenticationStrategy);
    freezeDatasourceSpecification(connection.datasourceSpecification);
  }
}
