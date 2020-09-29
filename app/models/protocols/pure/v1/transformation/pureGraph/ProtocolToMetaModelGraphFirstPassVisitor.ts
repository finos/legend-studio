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

import { assertNonEmptyString, assertTrue } from 'Utilities/GeneralUtil';
import { PRIMITIVE_TYPE } from 'MetaModelConst';
import { config } from 'ApplicationConfig';
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { BasicModel as MM_BasicPureModel } from 'MM/BasicModel';
import { Profile as MM_Profile } from 'MM/model/packageableElements/domain/Profile';
import { Enumeration as MM_Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Measure as MM_Measure } from 'MM/model/packageableElements/domain/Measure';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { Association as MM_Association } from 'MM/model/packageableElements/domain/Association';
import { Multiplicity as MM_Multiplicity } from 'MM/model/packageableElements/domain/Multiplicity';
import { ConcreteFunctionDefinition as MM_ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Diagram as MM_Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text as MM_Text } from 'MM/model/packageableElements/text/Text';
import { FileGeneration as MM_FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { PackageableRuntime as MM_PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection as MM_PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { GenerationSpecification as MM_GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { SectionIndex as MM_SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';
import { PackageableElementExplicitReference as MM_PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { Text } from 'V1/model/packageableElements/text/Text';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';

export class ProtocolToMetaModelGraphFirstPassVisitor implements PackageableElementVisitor<MM_PackageableElement> {
  context: GraphBuilderContext;
  processingModel: MM_BasicPureModel;

  constructor(context: GraphBuilderContext, processingModel: MM_BasicPureModel) {
    this.context = context;
    this.processingModel = processingModel;
  }

  visit_SectionIndex(element: SectionIndex): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Section index package is missing');
    assertNonEmptyString(element.name, 'Section index is missing');
    const sectionIndex = new MM_SectionIndex(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    if (config.features.BETA__grammarImport) {
      this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(sectionIndex);
    }
    this.processingModel.setSectionIndex(path, sectionIndex);
    return sectionIndex;
  }

  visit_Profile(element: Profile): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Profile package is missing');
    assertNonEmptyString(element.name, 'Profile name is missing');
    const profile = new MM_Profile(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(profile);
    this.processingModel.setProfile(path, profile);
    return profile;
  }

  visit_Enumeration(element: Enumeration): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Enumeration package is missing');
    assertNonEmptyString(element.name, 'Enumeration name is missing');
    const pureEnumeration = new MM_Enumeration(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(pureEnumeration);
    this.processingModel.setType(path, pureEnumeration);
    return pureEnumeration;
  }

  visit_Measure(element: Measure): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Measure package is missing');
    assertNonEmptyString(element.name, 'Measure name is missing');
    const pureMeasure = new MM_Measure(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(pureMeasure);
    this.processingModel.setType(path, pureMeasure);
    return pureMeasure;
  }

  visit_Class(element: Class): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Class package is missing');
    assertNonEmptyString(element.name, 'Class name is missing');
    const _class = new MM_Class(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(_class);
    this.processingModel.setType(path, _class);
    return _class;
  }

  visit_Association(element: Association): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Association package is missing');
    assertNonEmptyString(element.name, 'Association name is missing');
    const association = new MM_Association(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(association);
    this.processingModel.setAssociation(path, association);
    return association;
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Function package is missing');
    assertNonEmptyString(element.name, 'Function name is missing');
    const func = new MM_ConcreteFunctionDefinition(element.name, MM_PackageableElementExplicitReference.create(this.context.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING)), new MM_Multiplicity(0, undefined));
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(func);
    this.processingModel.setFunction(path, func);
    return func;
  }

  visit_Mapping(element: Mapping): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Mapping package is missing');
    assertNonEmptyString(element.name, 'Mapping name is missing');
    const pureMapping = new MM_Mapping(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(pureMapping);
    this.processingModel.setMapping(path, pureMapping);
    return pureMapping;
  }

  visit_Diagram(element: Diagram): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Diagram package is missing');
    assertNonEmptyString(element.name, 'Diagram name is missing');
    const diagram = new MM_Diagram(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(diagram);
    this.processingModel.setDiagram(path, diagram);
    return diagram;
  }

  visit_Text(element: Text): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Text element package is missing');
    assertNonEmptyString(element.name, 'Text element name is missing');
    const textElement = new MM_Text(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(textElement);
    this.processingModel.setText(path, textElement);
    return textElement;
  }

  visit_FileGeneration(element: FileGeneration): MM_PackageableElement {
    assertNonEmptyString(element.package, 'File generation element package is missing');
    assertNonEmptyString(element.name, 'File generation element name is missing');
    const fileGeneration = new MM_FileGeneration(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(fileGeneration);
    this.processingModel.setFileGeneration(path, fileGeneration);
    return fileGeneration;
  }

  // WIP: Add support for generation specification
  visit_GenerationSpecification(element: GenerationSpecification): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Generation tree element package is missing');
    assertNonEmptyString(element.name, 'Generation tree element name is missing');
    const generationSpec = new MM_GenerationSpecification(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(generationSpec);
    this.processingModel.setGenerationSpecification(path, generationSpec);
    return generationSpec;
  }

  visit_PackageableRuntime(element: PackageableRuntime): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Runtime package is missing');
    assertNonEmptyString(element.name, 'Runtime name is missing');
    const runtime = new MM_PackageableRuntime(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(runtime);
    this.processingModel.setRuntime(path, runtime);
    return runtime;
  }

  visit_PackageableConnection(element: PackageableConnection): MM_PackageableElement {
    assertNonEmptyString(element.package, 'Connection package is missing');
    assertNonEmptyString(element.name, 'Connection name is missing');
    const connection = new MM_PackageableConnection(element.name);
    const path = this.processingModel.buildPackageString(element.package, element.name);
    assertTrue(!this.context.graph.getNullableElement(path), `Element '${path}' already exists`);
    this.processingModel.getOrCreatePackageWithPackageName(element.package).addElement(connection);
    this.processingModel.setConnection(path, connection);
    return connection;
  }
}
