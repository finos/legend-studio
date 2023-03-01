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
  isNonNullable,
  assertNonEmptyString,
  UnsupportedOperationError,
  IllegalStateError,
  assertNonNullable,
  assertTrue,
  LogEvent,
  guaranteeType,
} from '@finos/legend-shared';
import { Stereotype } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Stereotype.js';
import { Tag } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Tag.js';
import { Enum } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enum.js';
import {
  V1_buildFullPath,
  type V1_GraphBuilderContext,
} from './V1_GraphBuilderContext.js';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
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
  V1_buildVariable,
  V1_buildUnit,
  V1_buildTaggedValue,
} from './helpers/V1_DomainBuilderHelper.js';
import {
  V1_buildServiceExecution,
  V1_buildLegacyServiceTest,
  V1_buildPostValidation,
} from './helpers/V1_ServiceBuilderHelper.js';
import {
  V1_buildEnumerationMapping,
  V1_buildMappingInclude,
} from './helpers/V1_MappingBuilderHelper.js';
import { V1_buildFlatDataSection } from './helpers/V1_FlatDataStoreBuilderHelper.js';
import { V1_buildSchema } from './helpers/V1_DatabaseBuilderHelper.js';
import {
  V1_buildConfigurationProperty,
  V1_buildScopeElement,
} from './helpers/V1_FileGenerationBuilderHelper.js';
import { V1_buildEngineRuntime } from './helpers/V1_RuntimeBuilderHelper.js';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import { V1_buildConnection } from './helpers/V1_ConnectionBuilderHelper.js';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer.js';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import {
  V1_buildGenerationTreeNode,
  V1_buildFileGenerationPointer,
} from './helpers/V1_GenerationSpecificationBuilderHelper.js';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure.js';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';
import { V1_buildSection } from './helpers/V1_SectionBuilderHelper.js';
import type { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import { V1_buildEmbeddedData } from './helpers/V1_DataElementBuilderHelper.js';
import { V1_buildTestSuite } from './helpers/V1_TestBuilderHelper.js';
import { ServiceTestSuite } from '../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceTestSuite.js';
import { V1_DataElementReference } from '../../../model/data/V1_EmbeddedData.js';
import { V1_buildFunctionSignature } from '../../../helpers/V1_DomainHelper.js';
import { getFunctionName } from '../../../../../../../graph/helpers/DomainHelper.js';
import { GraphBuilderError } from '../../../../../../GraphManagerUtils.js';
import { PostValidation } from '../../../../../../../graph/metamodel/pure/packageableElements/service/PostValidation.js';
import type { V1_SchemaGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_SchemaGenerationSpecification.js';
import { ModelUnit } from '../../../../../../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_ModelUnit.js';

export class V1_ElementSecondPassBuilder
  implements V1_PackageableElementVisitor<void>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_PackageableElement(element: V1_PackageableElement): void {
    this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runSecondPass(element, this.context);
  }

  visit_Profile(element: V1_Profile): void {
    const profile = this.context.currentSubGraph.getOwnProfile(
      V1_buildFullPath(element.package, element.name),
    );
    const uniqueStereotypes = new Set<string>();
    profile.p_stereotypes = element.stereotypes.map((stereotype) => {
      if (uniqueStereotypes.has(stereotype)) {
        const message = `Found duplicated stereotype '${stereotype}' in profile '${element.path}'`;
        /**
         * In strict-mode, graph builder will consider this as an error
         * See https://github.com/finos/legend-studio/issues/941
         *
         * @discrepancy graph-building
         */
        if (this.context.options?.strict) {
          throw new GraphBuilderError(message);
        }
        this.context.log.warn(LogEvent.create(message));
      }
      uniqueStereotypes.add(stereotype);
      return new Stereotype(profile, stereotype);
    });
    const uniqueTags = new Set<string>();
    profile.p_tags = element.tags.map((tag) => {
      if (uniqueTags.has(tag)) {
        const message = `Found duplicated tag '${tag}' in profile '${element.path}'`;
        /**
         * In strict-mode, graph builder will consider this as an error
         * See https://github.com/finos/legend-studio/issues/941
         *
         * @discrepancy graph-building
         */
        if (this.context.options?.strict) {
          throw new GraphBuilderError(message);
        }
        this.context.log.warn(LogEvent.create(message));
      }
      uniqueTags.add(tag);
      return new Tag(profile, tag);
    });
  }

  visit_Enumeration(element: V1_Enumeration): void {
    const enumeration = this.context.currentSubGraph.getOwnEnumeration(
      V1_buildFullPath(element.package, element.name),
    );
    enumeration.stereotypes = element.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    enumeration.taggedValues = element.taggedValues
      .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
    const uniqueEnumValues = new Set<string>();
    enumeration.values = element.values.map((enumValue) => {
      assertNonEmptyString(
        enumValue.value,
        `Enum value 'value' field is missing or empty`,
      );
      if (uniqueEnumValues.has(enumValue.value)) {
        const message = `Found duplicated value '${enumValue.value}' in enumeration '${enumeration.path}'`;
        /**
         * In strict-mode, graph builder will consider this as an error
         * See https://github.com/finos/legend-studio/issues/941
         *
         * @discrepancy graph-building
         */
        if (this.context.options?.strict) {
          throw new GraphBuilderError(message);
        }
        this.context.log.warn(LogEvent.create(message));
      }
      const _enum = new Enum(enumValue.value, enumeration);
      _enum.stereotypes = enumValue.stereotypes
        .map((stereotype) => this.context.resolveStereotype(stereotype))
        .filter(isNonNullable);
      _enum.taggedValues = enumValue.taggedValues
        .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
        .filter(isNonNullable);
      uniqueEnumValues.add(enumValue.value);
      return _enum;
    });
  }

  visit_Measure(element: V1_Measure): void {
    assertNonNullable(
      element.canonicalUnit,
      `Measure 'canonicalUnit' field is missing`,
    );
    const measure = this.context.currentSubGraph.getOwnMeasure(
      V1_buildFullPath(element.package, element.name),
    );
    measure.canonicalUnit = V1_buildUnit(
      element.canonicalUnit,
      measure,
      this.context.graph,
      this.context,
    );
    measure.nonCanonicalUnits = element.nonCanonicalUnits.map((unit) =>
      V1_buildUnit(unit, measure, this.context.currentSubGraph, this.context),
    );
  }

  visit_Class(element: V1_Class): void {
    const _class = this.context.currentSubGraph.getOwnClass(
      V1_buildFullPath(element.package, element.name),
    );
    _class.stereotypes = element.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    _class.taggedValues = element.taggedValues
      .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
  }

  visit_Association(element: V1_Association): void {
    throw new UnsupportedOperationError();
  }

  // NOTE: Alloy Execution server has 2 passes for processing as it needs to build the lambda and compiles
  // but we currently do not build the lambda and so this needs only one pass
  visit_ConcreteFunctionDefinition(
    protocol: V1_ConcreteFunctionDefinition,
  ): void {
    assertNonEmptyString(
      protocol.returnType,
      `Function 'returnType' field is missing or empty`,
    );
    assertNonNullable(
      protocol.returnMultiplicity,
      `Function 'returnMultiplicity' field is missing`,
    );
    const func = this.context.currentSubGraph.getOwnFunction(
      V1_buildFullPath(protocol.package, V1_buildFunctionSignature(protocol)),
    );
    func.returnType = this.context.resolveType(protocol.returnType);
    func.returnMultiplicity = this.context.graph.getMultiplicity(
      protocol.returnMultiplicity.lowerBound,
      protocol.returnMultiplicity.upperBound,
    );
    func.stereotypes = protocol.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    func.taggedValues = protocol.taggedValues
      .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
    func.parameters = protocol.parameters.map((param) =>
      V1_buildVariable(param, this.context),
    );
    func.expressionSequence = protocol.body;
    func.functionName = getFunctionName(func, func.name);
  }

  visit_FlatData(element: V1_FlatData): void {
    const flatData = this.context.currentSubGraph.getOwnFlatDataStore(
      V1_buildFullPath(element.package, element.name),
    );
    flatData.sections = element.sections.map((section) =>
      V1_buildFlatDataSection(section, flatData, this.context),
    );
  }

  visit_Database(element: V1_Database): void {
    const database = this.context.currentSubGraph.getOwnDatabase(
      V1_buildFullPath(element.package, element.name),
    );
    database.includes = element.includedStores.map((includedStore) =>
      this.context.resolveDatabase(includedStore),
    );
    database.schemas = element.schemas.map((schema) =>
      V1_buildSchema(schema, database, this.context),
    );
  }

  visit_Mapping(element: V1_Mapping): void {
    const mapping = this.context.currentSubGraph.getOwnMapping(
      V1_buildFullPath(element.package, element.name),
    );
    const mappingIncludesSet = new Set<string>();
    mapping.includes = element.includedMappings.map((mappingInclude) => {
      const includedMappingPath = mappingInclude.includedMapping;
      assertNonEmptyString(
        includedMappingPath,
        `Mapping include path is missing or empty`,
      );
      assertTrue(
        !mappingIncludesSet.has(includedMappingPath),
        `Duplicated mapping include '${includedMappingPath}' in mapping '${mapping.path}'`,
      );
      mappingIncludesSet.add(includedMappingPath);
      return V1_buildMappingInclude(mappingInclude, this.context, mapping);
    });
    mapping.enumerationMappings = element.enumerationMappings.map(
      (enumerationMapping) =>
        V1_buildEnumerationMapping(enumerationMapping, this.context, mapping),
    );
  }

  visit_Service(element: V1_Service): void {
    assertNonEmptyString(
      element.pattern,
      `Service 'pattern' field is missing or empty`,
    );
    const service = this.context.currentSubGraph.getOwnService(
      V1_buildFullPath(element.package, element.name),
    );
    service.stereotypes = element.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    service.taggedValues = element.taggedValues
      .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
    service.pattern = element.pattern;
    service.owners = element.owners.slice();
    service.documentation = element.documentation;
    service.autoActivateUpdates = element.autoActivateUpdates;
    // NOTE: process execution before the test, so we can do some check between test and execution (such matching type, keys, etc.)
    service.execution = V1_buildServiceExecution(
      element.execution,
      this.context,
      service,
    );
    if (element.test) {
      service.test = V1_buildLegacyServiceTest(
        element.test,
        this.context,
        service,
      );
    }
    service.tests = element.testSuites
      .map((testSuite) => V1_buildTestSuite(service, testSuite, this.context))
      .map((e) => guaranteeType(e, ServiceTestSuite));

    service.postValidations = element.postValidations
      .map((postValidation) =>
        V1_buildPostValidation(postValidation, this.context),
      )
      .map((e) => guaranteeType(e, PostValidation));
  }

  visit_SectionIndex(element: V1_SectionIndex): void {
    const sectionIndex = this.context.currentSubGraph.getOwnSectionIndex(
      element.path,
    );
    sectionIndex.sections = element.sections.map((section) =>
      V1_buildSection(section, this.context, sectionIndex),
    );
  }

  visit_FileGeneration(element: V1_FileGenerationSpecification): void {
    assertNonEmptyString(
      element.type,
      `File generation 'type' field is missing or empty`,
    );
    const fileGeneration = this.context.currentSubGraph.getOwnFileGeneration(
      V1_buildFullPath(element.package, element.name),
    );
    fileGeneration.type = element.type;
    fileGeneration.configurationProperties =
      element.configurationProperties.map(V1_buildConfigurationProperty);
    fileGeneration.generationOutputPath = element.generationOutputPath;
    fileGeneration.scopeElements = element.scopeElements.map((scopeElement) =>
      V1_buildScopeElement(scopeElement, this.context),
    );
  }

  visit_SchemaGeneration(element: V1_SchemaGenerationSpecification): void {
    assertNonEmptyString(
      element.format,
      `Schema generation 'type' field is missing or empty`,
    );
    const schemaGeneration =
      this.context.currentSubGraph.getOwnSchemaGeneration(
        V1_buildFullPath(element.package, element.name),
      );
    schemaGeneration.format = element.format;
    schemaGeneration.config = element.config;
    const modelUnit = new ModelUnit();
    modelUnit.packageableElementIncludes =
      element.modelUnit.packageableElementIncludes.map((e) =>
        this.context.resolveElement(e, true),
      );
    modelUnit.packageableElementExcludes =
      element.modelUnit.packageableElementExcludes.map((e) =>
        this.context.resolveElement(e, true),
      );
    schemaGeneration.modelUnit = modelUnit;
    schemaGeneration.config = element.config?.map(
      V1_buildConfigurationProperty,
    );
  }

  visit_GenerationSpecification(element: V1_GenerationSpecification): void {
    const generationSpec =
      this.context.currentSubGraph.getOwnGenerationSpecification(
        V1_buildFullPath(element.package, element.name),
      );
    generationSpec.generationNodes = element.generationNodes.map((node) =>
      V1_buildGenerationTreeNode(node, this.context),
    );
    generationSpec.fileGenerations = element.fileGenerations.map((node) =>
      V1_buildFileGenerationPointer(node, this.context),
    );
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): void {
    const runtime = this.context.currentSubGraph.getOwnRuntime(
      V1_buildFullPath(element.package, element.name),
    );
    runtime.runtimeValue = V1_buildEngineRuntime(
      element.runtimeValue,
      this.context,
    );
  }

  visit_PackageableConnection(element: V1_PackageableConnection): void {
    const connection = this.context.currentSubGraph.getOwnConnection(
      V1_buildFullPath(element.package, element.name),
    );
    if (element.connectionValue instanceof V1_ConnectionPointer) {
      throw new IllegalStateError(
        'Packageable connection value cannot be a connection pointer',
      );
    }
    connection.connectionValue = V1_buildConnection(
      element.connectionValue,
      this.context,
    );
  }

  visit_DataElement(element: V1_DataElement): void {
    const dataElement = this.context.currentSubGraph.getOwnDataElement(
      V1_buildFullPath(element.package, element.name),
    );
    dataElement.stereotypes = element.stereotypes
      .map((stereotype) => this.context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    dataElement.taggedValues = element.taggedValues
      .map((taggedValue) => V1_buildTaggedValue(taggedValue, this.context))
      .filter(isNonNullable);
    if (element.data instanceof V1_DataElementReference) {
      throw new IllegalStateError(
        'Cannot use Data element reference in a Data element',
      );
    }
    dataElement.data = V1_buildEmbeddedData(element.data, this.context);
  }
}
