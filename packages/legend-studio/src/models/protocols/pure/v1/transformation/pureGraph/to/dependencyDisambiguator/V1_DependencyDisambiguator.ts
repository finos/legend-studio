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
import type { V1_ModelChainConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../../../model/packageableElements/V1_PackageableElement';
import type { V1_Profile } from '../../../../model/packageableElements/domain/V1_Profile';
import type { V1_Enumeration } from '../../../../model/packageableElements/domain/V1_Enumeration';
import type { V1_Class } from '../../../../model/packageableElements/domain/V1_Class';
import type { V1_ConcreteFunctionDefinition } from '../../../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import type { V1_Association } from '../../../../model/packageableElements/domain/V1_Association';
import type { V1_FlatData } from '../../../../model/packageableElements/store/flatData/model/V1_FlatData';
import type { V1_Database } from '../../../../model/packageableElements/store/relational/model/V1_Database';
import type { V1_Mapping } from '../../../../model/packageableElements/mapping/V1_Mapping';
import type { V1_Service } from '../../../../model/packageableElements/service/V1_Service';
import type { V1_Diagram } from '../../../../model/packageableElements/diagram/V1_Diagram';
import type { V1_ClassMappingVisitor } from '../../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_OperationClassMapping } from '../../../../model/packageableElements/mapping/V1_OperationClassMapping';
import type { V1_PureInstanceClassMapping } from '../../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping';
import type { V1_RelationalClassMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import type { V1_PropertyMappingVisitor } from '../../../../model/packageableElements/mapping/V1_PropertyMapping';
import type { V1_PurePropertyMapping } from '../../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping';
import type { V1_InlineEmbeddedPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping';
import type { V1_AggregationAwarePropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping';
import type { V1_RelationalPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping';
import type { V1_ConnectionVisitor } from '../../../../model/packageableElements/connection/V1_Connection';
import type { V1_JsonModelConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection';
import type { V1_DepdendencyProcessingContext } from './V1_DependencyDisambiguatorHelper';
import {
  V1_processDependencyPath,
  V1_processDependableStereotypePointer,
  V1_processDependableTaggedValue,
  V1_processDependableProperty,
  V1_processDependableObject,
  V1_processDependableLambda,
  V1_processDependableVariable,
  V1_processDependableEnumValueMapping,
  V1_processDependablePropertyPointer,
  V1_processDependableServiceTest,
  V1_processDependableServiceExecution,
  V1_processDependableMappingTest,
  V1_processDependableRuntime,
  V1_processDependableUnit,
} from './V1_DependencyDisambiguatorHelper';
import type { V1_FlatDataConnection } from '../../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection';
import type { V1_RootFlatDataClassMapping } from '../../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';
import type { V1_FlatDataPropertyMapping } from '../../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping';
import type { V1_EmbeddedFlatDataPropertyMapping } from '../../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping';
import type { V1_PackageableRuntime } from '../../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_ConnectionPointer } from '../../../../model/packageableElements/connection/V1_ConnectionPointer';
import type { V1_XmlModelConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection';
import type { V1_FileGenerationSpecification } from '../../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_GenerationSpecification } from '../../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_Measure } from '../../../../model/packageableElements/domain/V1_Measure';
import type { V1_RelationalDatabaseConnection } from '../../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import type { V1_RootRelationalClassMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping';
import type { V1_AggregationAwareClassMapping } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping';
import type { V1_XStorePropertyMapping } from '../../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping';
import type { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping';
import type { V1_SectionIndex } from '../../../../model/packageableElements/section/V1_SectionIndex';
import type { V1_ServiceStore } from '../../../../model/packageableElements/store/relational/V1_ServiceStore';
import type {
  PureProtocolProcessorPlugin,
  V1_ElementProtocolDependencyDisambiguator,
} from '../../../../../PureProtocolProcessorPlugin';

/**
 * Dependency disambiguator is used to monkey patch element paths used in element protocols
 * if these paths coming from project dependencies that we need to disinguish due to presence
 * of multiple versions.
 */
export class V1_DependencyDisambiguator
  implements
    V1_ClassMappingVisitor<void>,
    V1_PropertyMappingVisitor<void>,
    V1_PackageableElementVisitor<void>,
    V1_ConnectionVisitor<void> {
  dependencyProcessingContext: V1_DepdendencyProcessingContext;
  extraElementProtocolDependencyDisambiguators: V1_ElementProtocolDependencyDisambiguator[] = [];

  constructor(
    dependencyProcessingContext: V1_DepdendencyProcessingContext,
    plugins: PureProtocolProcessorPlugin[],
  ) {
    this.dependencyProcessingContext = dependencyProcessingContext;
    this.extraElementProtocolDependencyDisambiguators = plugins.flatMap(
      (plugin) =>
        plugin.V1_getExtraElementProtocolDependencyDisambiguators?.() ?? [],
    );
  }

  visit_PackageableElement(protocol: V1_PackageableElement): void {
    this.extraElementProtocolDependencyDisambiguators.forEach((disambiguator) =>
      disambiguator(protocol, this.dependencyProcessingContext),
    );
  }

  // ----------------------------------------------- DOMAIN ----------------------------------------

  visit_Profile(protocol: V1_Profile): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
  }

  visit_Enumeration(protocol: V1_Enumeration): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.taggedValues.forEach((taggedValue) =>
      V1_processDependableTaggedValue(
        taggedValue,
        this.dependencyProcessingContext,
      ),
    );
    protocol.stereotypes.forEach((stereotype) =>
      V1_processDependableStereotypePointer(
        stereotype,
        this.dependencyProcessingContext,
      ),
    );
    protocol.values.forEach((enumValue) => {
      enumValue.taggedValues.forEach((taggedValue) =>
        V1_processDependableTaggedValue(
          taggedValue,
          this.dependencyProcessingContext,
        ),
      );
      enumValue.stereotypes.forEach((stereotype) =>
        V1_processDependableStereotypePointer(
          stereotype,
          this.dependencyProcessingContext,
        ),
      );
    });
  }

  visit_Measure(protocol: V1_Measure): void {
    if (protocol.canonicalUnit) {
      V1_processDependableUnit(
        protocol.canonicalUnit,
        this.dependencyProcessingContext,
      );
    }
    protocol.nonCanonicalUnits.forEach((unit) =>
      V1_processDependableUnit(unit, this.dependencyProcessingContext),
    );
  }

  visit_Class(protocol: V1_Class): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.taggedValues.forEach((taggedValue) =>
      V1_processDependableTaggedValue(
        taggedValue,
        this.dependencyProcessingContext,
      ),
    );
    protocol.stereotypes.forEach((stereotype) =>
      V1_processDependableStereotypePointer(
        stereotype,
        this.dependencyProcessingContext,
      ),
    );
    protocol.superTypes = protocol.superTypes.map((superType) =>
      V1_processDependencyPath(superType, this.dependencyProcessingContext),
    );
    protocol.properties.forEach((property) =>
      V1_processDependableProperty(property, this.dependencyProcessingContext),
    );
    protocol.derivedProperties.forEach((derivedProperty) => {
      derivedProperty.returnType = V1_processDependencyPath(
        derivedProperty.returnType,
        this.dependencyProcessingContext,
      );
      derivedProperty.taggedValues.forEach((taggedValue) =>
        V1_processDependableTaggedValue(
          taggedValue,
          this.dependencyProcessingContext,
        ),
      );
      derivedProperty.stereotypes.forEach((stereotype) =>
        V1_processDependableStereotypePointer(
          stereotype,
          this.dependencyProcessingContext,
        ),
      );
      derivedProperty.body = derivedProperty.body
        ? V1_processDependableObject(
            derivedProperty.body as Record<PropertyKey, unknown>,
            this.dependencyProcessingContext,
          )
        : undefined;
      derivedProperty.parameters = derivedProperty.parameters
        ? V1_processDependableObject(
            derivedProperty.parameters as Record<PropertyKey, unknown>,
            this.dependencyProcessingContext,
          )
        : undefined;
    });
    protocol.constraints.forEach((constraint) =>
      V1_processDependableLambda(
        constraint.functionDefinition,
        this.dependencyProcessingContext,
      ),
    );
  }

  visit_Association(protocol: V1_Association): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.taggedValues.forEach((taggedValue) =>
      V1_processDependableTaggedValue(
        taggedValue,
        this.dependencyProcessingContext,
      ),
    );
    protocol.stereotypes.forEach((stereotype) =>
      V1_processDependableStereotypePointer(
        stereotype,
        this.dependencyProcessingContext,
      ),
    );
    protocol.properties.forEach((property) =>
      V1_processDependableProperty(property, this.dependencyProcessingContext),
    );
  }

  visit_ConcreteFunctionDefinition(
    protocol: V1_ConcreteFunctionDefinition,
  ): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.taggedValues.forEach((taggedValue) =>
      V1_processDependableTaggedValue(
        taggedValue,
        this.dependencyProcessingContext,
      ),
    );
    protocol.stereotypes.forEach((stereotype) =>
      V1_processDependableStereotypePointer(
        stereotype,
        this.dependencyProcessingContext,
      ),
    );
    protocol.body = protocol.body.map((body) =>
      V1_processDependableObject(
        body as Record<PropertyKey, unknown>,
        this.dependencyProcessingContext,
      ),
    );
    protocol.parameters.forEach((parameter) =>
      V1_processDependableVariable(parameter, this.dependencyProcessingContext),
    );
  }

  visit_FlatData(protocol: V1_FlatData): void {
    // TODO add logic (included stores?, filter? (if support))
    return;
  }

  visit_GenerationSpecification(protocol: V1_GenerationSpecification): void {
    // TODO
    return;
  }

  visit_SectionIndex(protocol: V1_SectionIndex): void {
    // TODO
    return;
  }

  visit_Database(protocol: V1_Database): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    throw new UnsupportedOperationError();
  }

  visit_ServiceStore(protocol: V1_ServiceStore): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
  }

  visit_Mapping(protocol: V1_Mapping): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.enumerationMappings.forEach((enumerationMapping) => {
      enumerationMapping.enumeration = V1_processDependencyPath(
        enumerationMapping.enumeration,
        this.dependencyProcessingContext,
      );
      enumerationMapping.enumValueMappings.forEach((enumValueMapping) =>
        V1_processDependableEnumValueMapping(
          enumValueMapping,
          this.dependencyProcessingContext,
        ),
      );
    });
    // element.classMappings.forEach(p => p.processDependentElementPath(versionPrefix, allDependencyKeys, reservedPaths, projectEntityPaths));
    protocol.tests.forEach((test) =>
      V1_processDependableMappingTest(test, this.dependencyProcessingContext),
    );
  }

  visit_Service(protocol: V1_Service): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    V1_processDependableServiceTest(
      protocol.test,
      this.dependencyProcessingContext,
    );
    V1_processDependableServiceExecution(
      protocol.execution,
      this.dependencyProcessingContext,
      this,
    );
  }

  visit_Diagram(protocol: V1_Diagram): void {
    protocol.package = V1_processDependencyPath(
      protocol.package,
      this.dependencyProcessingContext,
    );
    protocol.classViews.forEach((classView) => {
      classView.class = V1_processDependencyPath(
        classView.class,
        this.dependencyProcessingContext,
      );
    });
    protocol.propertyViews.forEach((propertyView) =>
      V1_processDependablePropertyPointer(
        propertyView.property,
        this.dependencyProcessingContext,
      ),
    );
  }

  visit_FileGeneration(protocol: V1_FileGenerationSpecification): void {
    protocol.scopeElements.forEach((scopeElement) =>
      V1_processDependencyPath(scopeElement, this.dependencyProcessingContext),
    );
  }

  visit_PackageableRuntime(protocol: V1_PackageableRuntime): void {
    V1_processDependableRuntime(
      protocol.runtimeValue,
      this.dependencyProcessingContext,
      this,
    );
  }

  visit_PackageableConnection(protocol: V1_PackageableConnection): void {
    protocol.connectionValue.accept_ConnectionVisitor(this);
  }

  // ----------------------------------------------- CLASS MAPPING ----------------------------------------

  visit_OperationClassMapping(classMapping: V1_OperationClassMapping): void {
    classMapping.class = V1_processDependencyPath(
      classMapping.class,
      this.dependencyProcessingContext,
    );
  }

  visit_PureInstanceClassMapping(
    classMapping: V1_PureInstanceClassMapping,
  ): void {
    classMapping.class = V1_processDependencyPath(
      classMapping.class,
      this.dependencyProcessingContext,
    );
    classMapping.srcClass = classMapping.srcClass
      ? V1_processDependencyPath(
          classMapping.srcClass,
          this.dependencyProcessingContext,
        )
      : undefined;
    classMapping.propertyMappings.forEach((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
    // TODO? filter
  }

  visit_RootFlatDataClassMapping(
    classMapping: V1_RootFlatDataClassMapping,
  ): void {
    classMapping.class = V1_processDependencyPath(
      classMapping.class,
      this.dependencyProcessingContext,
    );
    classMapping.flatData = V1_processDependencyPath(
      classMapping.flatData,
      this.dependencyProcessingContext,
    );
    classMapping.propertyMappings.forEach((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
    // TODO? filter
  }

  visit_RelationalClassMapping(classMapping: V1_RelationalClassMapping): void {
    classMapping.class = V1_processDependencyPath(
      classMapping.class,
      this.dependencyProcessingContext,
    );
    classMapping.propertyMappings.forEach((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
    // TODO? filter
  }

  visit_RootRelationalClassMapping(
    classMapping: V1_RootRelationalClassMapping,
  ): void {
    // TODO
    return;
  }

  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): void {
    classMapping.mainSetImplementation.class = V1_processDependencyPath(
      classMapping.mainSetImplementation.class,
      this.dependencyProcessingContext,
    );
    classMapping.mainSetImplementation.accept_ClassMappingVisitor(this);
    classMapping.aggregateSetImplementations.map((aggregate) => {
      aggregate.setImplementation.class = V1_processDependencyPath(
        aggregate.setImplementation.class,
        this.dependencyProcessingContext,
      );
      aggregate.setImplementation.accept_ClassMappingVisitor(this)
    });
    classMapping.propertyMappings.forEach((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
    return;
  }

  // ----------------------------------------------- PROPERTY MAPPING ----------------------------------------

  visit_PurePropertyMapping(propertyMapping: V1_PurePropertyMapping): void {
    V1_processDependablePropertyPointer(
      propertyMapping.property,
      this.dependencyProcessingContext,
    );
    V1_processDependableLambda(
      propertyMapping.transform,
      this.dependencyProcessingContext,
    );
  }

  visit_FlatDataPropertyMapping(
    propertyMapping: V1_FlatDataPropertyMapping,
  ): void {
    V1_processDependablePropertyPointer(
      propertyMapping.property,
      this.dependencyProcessingContext,
    );
    V1_processDependableLambda(
      propertyMapping.transform,
      this.dependencyProcessingContext,
    );
  }

  visit_EmbeddedFlatDataPropertyMapping(
    protocol: V1_EmbeddedFlatDataPropertyMapping,
  ): void {
    V1_processDependablePropertyPointer(
      protocol.property,
      this.dependencyProcessingContext,
    );
    protocol.class = V1_processDependencyPath(
      protocol.class,
      this.dependencyProcessingContext,
    );
    protocol.propertyMappings.forEach((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(this),
    );
  }

  visit_RelationalPropertyMapping(
    propertyMapping: V1_RelationalPropertyMapping,
  ): void {
    V1_processDependablePropertyPointer(
      propertyMapping.property,
      this.dependencyProcessingContext,
    );
    //TODO relational operation element
  }

  visit_InlineEmbeddedPropertyMapping(
    propertyMapping: V1_InlineEmbeddedPropertyMapping,
  ): void {
    // TODO
    return;
  }

  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: V1_EmbeddedRelationalPropertyMapping,
  ): void {
    V1_processDependablePropertyPointer(
      propertyMapping.property,
      this.dependencyProcessingContext,
    );
    propertyMapping.classMapping.accept_ClassMappingVisitor(this);
  }

  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: V1_OtherwiseEmbeddedRelationalPropertyMapping,
  ): void {
    // TODO
    return;
  }

  visit_XStorePropertyMapping(propertyMapping: V1_XStorePropertyMapping): void {
    V1_processDependablePropertyPointer(
      propertyMapping.property,
      this.dependencyProcessingContext,
    );
    V1_processDependableLambda(
      propertyMapping.crossExpression,
      this.dependencyProcessingContext,
    );
  }

  visit_AggregationAwarePropertyMapping(
    propertyMapping: V1_AggregationAwarePropertyMapping,
  ): void {
    // TODO
    return;
  }

  // ----------------------------------------------- CONNECTION ----------------------------------------

  visit_ConnectionPointer(connection: V1_ConnectionPointer): void {
    connection.connection = V1_processDependencyPath(
      connection.connection,
      this.dependencyProcessingContext,
    );
  }

  visit_ModelChainConnection(connection: V1_ModelChainConnection): void {
    connection.mappings = connection.mappings.map((superType) =>
      V1_processDependencyPath(superType, this.dependencyProcessingContext),
    );
  }

  visit_JsonModelConnection(connection: V1_JsonModelConnection): void {
    connection.class = V1_processDependencyPath(
      connection.class,
      this.dependencyProcessingContext,
    );
  }

  visit_XmlModelConnection(connection: V1_XmlModelConnection): void {
    connection.class = V1_processDependencyPath(
      connection.class,
      this.dependencyProcessingContext,
    );
  }

  visit_FlatDataConnection(connection: V1_FlatDataConnection): void {
    if (connection.store) {
      connection.store = V1_processDependencyPath(
        connection.store,
        this.dependencyProcessingContext,
      );
    }
  }

  visit_RelationalDatabaseConnection(
    connection: V1_RelationalDatabaseConnection,
  ): void {
    // TODO
    return;
  }
}
