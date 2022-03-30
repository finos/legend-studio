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
  guaranteeNonNullable,
  assertTrue,
  LogEvent,
} from '@finos/legend-shared';
import { Stereotype } from '../../../../../../metamodels/pure/packageableElements/domain/Stereotype';
import { Tag } from '../../../../../../metamodels/pure/packageableElements/domain/Tag';
import { Enum } from '../../../../../../metamodels/pure/packageableElements/domain/Enum';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
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
import {
  V1_buildVariable,
  V1_buildUnit,
  V1_buildTaggedValue,
} from '../../../transformation/pureGraph/to/helpers/V1_DomainBuilderHelper';
import {
  V1_buildServiceTest,
  V1_buildServiceExecution,
} from '../../../transformation/pureGraph/to/helpers/V1_ServiceBuilderHelper';
import {
  V1_buildEnumerationMapping,
  V1_buildMappingInclude,
} from '../../../transformation/pureGraph/to/helpers/V1_MappingBuilderHelper';
import { V1_buildFlatDataSection } from '../../../transformation/pureGraph/to/helpers/V1_FlatDataStoreBuilderHelper';
import { V1_buildSchema } from '../../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper';
import {
  V1_buildConfigurationProperty,
  V1_buildScopeElement,
} from '../../../transformation/pureGraph/to/helpers/V1_FileGenerationBuilderHelper';
import { V1_buildEngineRuntime } from '../../../transformation/pureGraph/to/helpers/V1_RuntimeBuilderHelper';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import { V1_ProtocolToMetaModelConnectionBuilder } from './V1_ProtocolToMetaModelConnectionBuilder';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import {
  V1_buildGenerationTreeNode,
  V1_buildFileGenerationPointer,
} from '../../../transformation/pureGraph/to/helpers/V1_GenerationSpecificationBuilderHelper';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex';
import { V1_buildSection } from '../../../transformation/pureGraph/to/helpers/V1_SectionBuilderHelper';
import { setMeasureCanonicalUnit } from '../../../../../../DomainModifierHelper';

export class V1_ProtocolToMetaModelGraphSecondPassBuilder
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
    const profile = this.context.graph.getProfile(
      this.context.graph.buildPath(element.package, element.name),
    );
    const uniqueStereotypes = new Set<string>();
    profile.stereotypes = element.stereotypes.map((stereotype) => {
      if (uniqueStereotypes.has(stereotype)) {
        /* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
        this.context.log.warn(
          LogEvent.create(
            `Found duplicated stereotype '${stereotype}' in profile '${element.path}'`,
          ),
        );
      }
      uniqueStereotypes.add(stereotype);
      return new Stereotype(profile, stereotype);
    });
    const uniqueTags = new Set<string>();
    profile.tags = element.tags.map((tag) => {
      if (uniqueTags.has(tag)) {
        /* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
        this.context.log.warn(
          LogEvent.create(
            `Found duplicated tag '${tag}' in profile '${element.path}'`,
          ),
        );
      }
      uniqueTags.add(tag);
      return new Tag(profile, tag);
    });
  }

  visit_Enumeration(element: V1_Enumeration): void {
    const path = this.context.graph.buildPath(element.package, element.name);
    const enumeration = this.context.graph.getEnumeration(path);
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
        /* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/660 */
        this.context.log.warn(
          LogEvent.create(
            `Found duplicated value '${enumValue.value}' in enumeration '${enumeration.path}'`,
          ),
        );
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
    const measure = this.context.graph.getMeasure(
      this.context.graph.buildPath(element.package, element.name),
    );
    setMeasureCanonicalUnit(
      measure,
      V1_buildUnit(
        element.canonicalUnit,
        measure,
        this.context.graph,
        this.context,
      ),
    );
    measure.nonCanonicalUnits = element.nonCanonicalUnits.map((unit) =>
      V1_buildUnit(unit, measure, this.context.currentSubGraph, this.context),
    );
  }

  visit_Class(element: V1_Class): void {
    const _class = this.context.graph.getClass(
      this.context.graph.buildPath(element.package, element.name),
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
    const func = this.context.graph.getFunction(
      this.context.graph.buildPath(protocol.package, protocol.name),
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
    func.body = protocol.body;
  }

  visit_FlatData(element: V1_FlatData): void {
    const flatData = this.context.graph.getFlatDataStore(
      this.context.graph.buildPath(element.package, element.name),
    );
    flatData.sections = element.sections.map((section) =>
      V1_buildFlatDataSection(section, flatData, this.context),
    );
  }

  visit_Database(element: V1_Database): void {
    const database = this.context.graph.getDatabase(
      this.context.graph.buildPath(element.package, element.name),
    );
    database.includes = element.includedStores.map((includedStore) =>
      this.context.resolveDatabase(includedStore),
    );
    database.schemas = element.schemas.map((schema) =>
      V1_buildSchema(schema, database, this.context),
    );
  }

  visit_Mapping(element: V1_Mapping): void {
    const mapping = this.context.graph.getMapping(
      this.context.graph.buildPath(element.package, element.name),
    );
    const mappingIncludesSet = new Set<string>();
    mapping.includes = element.includedMappings.map((i) => {
      assertNonEmptyString(
        i.includedMappingPath,
        `Mapping include 'includedMappingPath' field is missing or empty`,
      );
      assertTrue(
        !mappingIncludesSet.has(i.includedMappingPath),
        `Duplicated mapping include '${i.includedMappingPath}' in mapping '${mapping.path}'`,
      );
      mappingIncludesSet.add(i.includedMappingPath);
      return V1_buildMappingInclude(i, this.context, mapping);
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
    const service = this.context.graph.getService(
      this.context.graph.buildPath(element.package, element.name),
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
    service.setExecution(
      V1_buildServiceExecution(element.execution, this.context, service),
    );
    service.test = V1_buildServiceTest(element.test, this.context, service);
  }

  visit_SectionIndex(element: V1_SectionIndex): void {
    const sectionIndex = guaranteeNonNullable(
      this.context.graph.getOwnSectionIndex(element.path),
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
    const fileGeneration = this.context.graph.getFileGeneration(
      this.context.graph.buildPath(element.package, element.name),
    );
    fileGeneration.setType(element.type);
    fileGeneration.configurationProperties =
      element.configurationProperties.map(V1_buildConfigurationProperty);
    fileGeneration.setGenerationOutputPath(element.generationOutputPath);
    fileGeneration.scopeElements = element.scopeElements.map((scopeElement) =>
      V1_buildScopeElement(scopeElement, this.context),
    );
  }

  visit_GenerationSpecification(element: V1_GenerationSpecification): void {
    const generationSpec = this.context.graph.getGenerationSpecification(
      this.context.graph.buildPath(element.package, element.name),
    );
    generationSpec.generationNodes = element.generationNodes.map((node) =>
      V1_buildGenerationTreeNode(node, this.context),
    );
    generationSpec.fileGenerations = element.fileGenerations.map((node) =>
      V1_buildFileGenerationPointer(node, this.context),
    );
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): void {
    const runtime = this.context.graph.getRuntime(
      this.context.graph.buildPath(element.package, element.name),
    );
    runtime.setRuntimeValue(
      V1_buildEngineRuntime(element.runtimeValue, this.context),
    );
  }

  visit_PackageableConnection(element: V1_PackageableConnection): void {
    const connection = this.context.graph.getConnection(
      this.context.graph.buildPath(element.package, element.name),
    );
    if (element.connectionValue instanceof V1_ConnectionPointer) {
      throw new IllegalStateError(
        'Packageable connection value cannot be a connection pointer',
      );
    }
    connection.setConnectionValue(
      element.connectionValue.accept_ConnectionVisitor(
        new V1_ProtocolToMetaModelConnectionBuilder(this.context),
      ),
    );
  }
}
