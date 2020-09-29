/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isNonNullable, assertNonEmptyString, UnsupportedOperationError, IllegalStateError, assertNonNullable, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Stereotype as MM_Stereotype } from 'MM/model/packageableElements/domain/Stereotype';
import { Tag as MM_Tag } from 'MM/model/packageableElements/domain/Tag';
import { Enum as MM_Enum } from 'MM/model/packageableElements/domain/Enum';
import { TEXT_TYPE as MM_TEXT_TYPE } from 'MM/model/packageableElements/text/Text';
import { BasicModel as MM_BasicModel } from 'MM/BasicModel';
import { GraphBuilderContext } from './GraphBuilderContext';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { Text } from 'V1/model/packageableElements/text/Text';
import { processVariable, processUnit, processTaggedValue } from './DomainBuilderHelper';
import { processClassView, processPropertyView, processGeneralizationView } from './DiagramBuilderHelper';
import { processEnumerationMapping, processMappingInclude } from './MappingBuilderHelper';
import { processConfigurationProperty, processScopeElement } from './FileGenerationBuilderHelper';
import { processEngineRuntime } from './RuntimeBuilderHelper';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { ProtocolToMetaModelConnectionVisitor } from './ProtocolToMetaModelConnectionVisitor';
import { ConnectionPointer } from 'V1/model/packageableElements/connection/ConnectionPointer';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { processGenerationTreeNode, processFileGenerationPointer } from './GenerationSpecificationBuilderHelper';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';
import { processSection } from './SectionBuilderHelper';

export class ProtocolToMetaModelGraphSecondPassVisitor implements PackageableElementVisitor<MM_PackageableElement> {
  context: GraphBuilderContext;
  targetGraph?: MM_BasicModel;

  constructor(context: GraphBuilderContext, targetGraph?: MM_BasicModel) {
    this.context = context;
    this.targetGraph = targetGraph;
  }

  visit_Profile(element: Profile): MM_PackageableElement {
    const profile = this.context.graph.getProfile(this.context.graph.buildPackageString(element.package, element.name));
    profile.stereotypes = element.stereotypes.map(stereotype => new MM_Stereotype(profile, stereotype));
    profile.tags = element.tags.map(tag => new MM_Tag(profile, tag));
    return profile;
  }

  visit_Enumeration(element: Enumeration): MM_PackageableElement {
    const path = this.context.graph.buildPackageString(element.package, element.name);
    const enumeration = this.context.graph.getEnumeration(path);
    enumeration.stereotypes = element.stereotypes.map(stereotype => this.context.resolveStereotype(stereotype)).filter(isNonNullable);
    enumeration.taggedValues = element.taggedValues.map(taggedValue => processTaggedValue(taggedValue, this.context)).filter(isNonNullable);
    enumeration.values = element.values.map(enumValue => {
      assertNonEmptyString(enumValue.value, 'Enum value name is missing');
      const _enum = new MM_Enum(enumValue.value, enumeration);
      _enum.stereotypes = enumValue.stereotypes.map(stereotype => this.context.resolveStereotype(stereotype)).filter(isNonNullable);
      _enum.taggedValues = enumValue.taggedValues.map(taggedValue => processTaggedValue(taggedValue, this.context)).filter(isNonNullable);
      return _enum;
    });
    return enumeration;
  }

  visit_Measure(element: Measure): MM_PackageableElement {
    assertNonNullable(element.canonicalUnit, 'Measure canonical unit is missing');
    const measure = this.context.graph.getMeasure(this.context.graph.buildPackageString(element.package, element.name));
    measure.setCanonicalUnit(processUnit(element.canonicalUnit, this.context.graph, measure));
    measure.nonCanonicalUnits = element.nonCanonicalUnits.map(unit => processUnit(unit, this.targetGraph, measure));
    return measure;
  }

  visit_Class(element: Class): MM_PackageableElement {
    const _class = this.context.graph.getClass(this.context.graph.buildPackageString(element.package, element.name));
    _class.stereotypes = element.stereotypes.map(stereotype => this.context.resolveStereotype(stereotype)).filter(isNonNullable);
    _class.taggedValues = element.taggedValues.map(taggedValue => processTaggedValue(taggedValue, this.context)).filter(isNonNullable);
    return _class;
  }

  visit_Association(element: Association): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  // NOTE: Legend Engine server has 2 passes for processing as it needs to build the lambda and compiles
  // but we currently do not build the lambda and so this needs only one pass
  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): MM_PackageableElement {
    assertNonEmptyString(element.returnType, 'Function return type is missing');
    assertNonNullable(element.returnMultiplicity, 'Function return type multiplicity is missing');
    const func = this.context.graph.getFunction(this.context.graph.buildPackageString(element.package, element.name));
    func.returnType = this.context.resolveType(element.returnType);
    func.returnMultiplicity = this.context.graph.getMultiplicity(element.returnMultiplicity.lowerBound, element.returnMultiplicity.upperBound);
    func.stereotypes = element.stereotypes.map(stereotype => this.context.resolveStereotype(stereotype)).filter(isNonNullable);
    func.taggedValues = element.taggedValues.map(taggedValue => processTaggedValue(taggedValue, this.context)).filter(isNonNullable);
    func.parameters = element.parameters.map(param => processVariable(param, this.context));
    func.body = element.body;
    return func;
  }

  visit_Mapping(element: Mapping): MM_PackageableElement {
    const mapping = this.context.graph.getMapping(this.context.graph.buildPackageString(element.package, element.name));
    const mappingIncludesSet = new Set<string>();
    mapping.includes = element.includedMappings.map(i => {
      assertNonEmptyString(i.includedMappingPath, 'Included mapping path is missing');
      if (mappingIncludesSet.has(i.includedMappingPath)) {
        throw new Error(`Duplicated mapping include '${i.includedMappingPath}' in mapping '${mapping.path}'`);
      }
      mappingIncludesSet.add(i.includedMappingPath);
      return processMappingInclude(i, this.context, mapping);
    });
    mapping.enumerationMappings = element.enumerationMappings.map(enumerationMapping => processEnumerationMapping(enumerationMapping, this.context, mapping));
    return mapping;
  }

  visit_Diagram(element: Diagram): MM_PackageableElement {
    const diagram = this.context.graph.getDiagram(this.context.graph.buildPackageString(element.package, element.name));
    diagram.classViews = element.classViews.map(classView => processClassView(classView, this.context, diagram));
    diagram.propertyViews = element.propertyViews.map(propertyView => processPropertyView(propertyView, this.context, diagram));
    diagram.generalizationViews = element.generalizationViews.map(generalizationView => processGeneralizationView(generalizationView, diagram));
    return diagram;
  }

  visit_Text(element: Text): MM_PackageableElement {
    const text = this.context.graph.getText(this.context.graph.buildPackageString(element.package, element.name));
    text.type = Object.values(MM_TEXT_TYPE).find(type => type === element.type) ?? MM_TEXT_TYPE.PLAIN_TEXT;
    text.content = element.content;
    return text;
  }

  visit_SectionIndex(element: SectionIndex): MM_PackageableElement {
    const sectionIndex = guaranteeNonNullable(this.context.graph.getOwnSectionIndex(element.path));
    sectionIndex.sections = element.sections.map(section => processSection(section, this.context, sectionIndex));
    return sectionIndex;
  }

  visit_FileGeneration(element: FileGeneration): MM_PackageableElement {
    assertNonEmptyString(element.type, 'File generation type is missing');
    const fileGeneration = this.context.graph.getFileGeneration(this.context.graph.buildPackageString(element.package, element.name));
    fileGeneration.setType(element.type);
    fileGeneration.configurationProperties = element.configurationProperties.map(processConfigurationProperty);
    fileGeneration.scopeElements = element.scopeElements.map(scopeElement => processScopeElement(scopeElement, this.context));
    return fileGeneration;
  }

  visit_GenerationSpecification(element: GenerationSpecification): MM_PackageableElement {
    const generationSpec = this.context.graph.getGenerationSpecification(this.context.graph.buildPackageString(element.package, element.name));
    generationSpec.generationNodes = element.generationNodes.map(node => processGenerationTreeNode(node, this.context));
    generationSpec.fileGenerations = element.fileGenerations.map(node => processFileGenerationPointer(node, this.context));
    return generationSpec;
  }

  visit_PackageableRuntime(element: PackageableRuntime): MM_PackageableElement {
    const runtime = this.context.graph.getRuntime(this.context.graph.buildPackageString(element.package, element.name));
    runtime.setRuntimeValue(processEngineRuntime(element.runtimeValue, this.context));
    return runtime;
  }

  visit_PackageableConnection(element: PackageableConnection): MM_PackageableElement {
    const connection = this.context.graph.getConnection(this.context.graph.buildPackageString(element.package, element.name));
    if (element.connectionValue instanceof ConnectionPointer) {
      throw new IllegalStateError('Packageable connection value cannot be a connection pointer');
    }
    connection.setConnectionValue(element.connectionValue.accept_ConnectionVisitor(new ProtocolToMetaModelConnectionVisitor(this.context)));
    return connection;
  }
}
