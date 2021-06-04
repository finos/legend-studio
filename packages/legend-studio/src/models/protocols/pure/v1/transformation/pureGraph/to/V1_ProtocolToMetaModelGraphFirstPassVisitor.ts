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

import { assertNonEmptyString, assertTrue } from '@finos/legend-studio-shared';
import { PRIMITIVE_TYPE } from '../../../../../../MetaModelConst';
import type { PackageableElement } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElement';
import { Profile } from '../../../../../../metamodels/pure/model/packageableElements/domain/Profile';
import { Enumeration } from '../../../../../../metamodels/pure/model/packageableElements/domain/Enumeration';
import { Measure } from '../../../../../../metamodels/pure/model/packageableElements/domain/Measure';
import { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import { Association } from '../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import { Multiplicity } from '../../../../../../metamodels/pure/model/packageableElements/domain/Multiplicity';
import { ConcreteFunctionDefinition } from '../../../../../../metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { FlatData } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { Database } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Database';
import { ServiceStore } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import { Mapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import { Service } from '../../../../../../metamodels/pure/model/packageableElements/service/Service';
import { Diagram } from '../../../../../../metamodels/pure/model/packageableElements/diagram/Diagram';
import { FileGenerationSpecification } from '../../../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { PackageableRuntime } from '../../../../../../metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../../../../../../metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { GenerationSpecification } from '../../../../../../metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import { SectionIndex } from '../../../../../../metamodels/pure/model/packageableElements/section/SectionIndex';
import { PackageableElementExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile';
import type { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration';
import type { V1_Class } from '../../../model/packageableElements/domain/V1_Class';
import type { V1_Association } from '../../../model/packageableElements/domain/V1_Association';
import type { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import type { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData';
import type { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database';
import type { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping';
import type { V1_Service } from '../../../model/packageableElements/service/V1_Service';
import type { V1_Diagram } from '../../../model/packageableElements/diagram/V1_Diagram';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex';
import type { V1_ServiceStore } from '../../../model/packageableElements/store/relational/V1_ServiceStore';

export class V1_ProtocolToMetaModelGraphFirstPassVisitor
  implements V1_PackageableElementVisitor<PackageableElement>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_PackageableElement(element: V1_PackageableElement): PackageableElement {
    return this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runFirstPass(element, this.context);
  }

  visit_SectionIndex(element: V1_SectionIndex): PackageableElement {
    assertNonEmptyString(element.package, 'Section index package is missing');
    assertNonEmptyString(element.name, 'Section index is missing');
    const sectionIndex = new SectionIndex(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph.setSectionIndex(path, sectionIndex);
    return sectionIndex;
  }

  visit_Profile(element: V1_Profile): PackageableElement {
    assertNonEmptyString(element.package, 'Profile package is missing');
    assertNonEmptyString(element.name, 'Profile name is missing');
    const profile = new Profile(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(profile);
    this.context.currentSubGraph.setProfile(path, profile);
    return profile;
  }

  visit_Enumeration(element: V1_Enumeration): PackageableElement {
    assertNonEmptyString(element.package, 'Enumeration package is missing');
    assertNonEmptyString(element.name, 'Enumeration name is missing');
    const pureEnumeration = new Enumeration(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(pureEnumeration);
    this.context.currentSubGraph.setType(path, pureEnumeration);
    return pureEnumeration;
  }

  visit_Measure(element: V1_Measure): PackageableElement {
    assertNonEmptyString(element.package, 'Measure package is missing');
    assertNonEmptyString(element.name, 'Measure name is missing');
    const pureMeasure = new Measure(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(pureMeasure);
    this.context.currentSubGraph.setType(path, pureMeasure);
    return pureMeasure;
  }

  visit_Class(element: V1_Class): PackageableElement {
    assertNonEmptyString(element.package, 'Class package is missing');
    assertNonEmptyString(element.name, 'Class name is missing');
    const _class = new Class(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(_class);
    this.context.currentSubGraph.setType(path, _class);
    return _class;
  }

  visit_Association(element: V1_Association): PackageableElement {
    assertNonEmptyString(element.package, 'Association package is missing');
    assertNonEmptyString(element.name, 'Association name is missing');
    const association = new Association(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(association);
    this.context.currentSubGraph.setAssociation(path, association);
    return association;
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): PackageableElement {
    assertNonEmptyString(element.package, 'Function package is missing');
    assertNonEmptyString(element.name, 'Function name is missing');
    const func = new ConcreteFunctionDefinition(
      element.name,
      PackageableElementExplicitReference.create(
        this.context.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING),
      ),
      new Multiplicity(0, undefined),
    );
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(func);
    this.context.currentSubGraph.setFunction(path, func);
    return func;
  }

  visit_FlatData(element: V1_FlatData): PackageableElement {
    assertNonEmptyString(element.package, 'Flat-data store package is missing');
    assertNonEmptyString(element.name, 'Flat data store name is missing');
    const flatData = new FlatData(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(flatData);
    this.context.currentSubGraph.setStore(path, flatData);
    return flatData;
  }

  visit_Database(element: V1_Database): PackageableElement {
    assertNonEmptyString(element.package, 'Database store package is missing');
    assertNonEmptyString(element.name, 'Database store name is missing');
    const database = new Database(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(database);
    this.context.currentSubGraph.setStore(path, database);
    return database;
  }

  visit_ServiceStore(element: V1_ServiceStore): PackageableElement {
    assertNonEmptyString(element.package, 'Service store package is missing');
    assertNonEmptyString(element.name, 'Service store name is missing');
    const serviceStore = new ServiceStore(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(serviceStore);
    this.context.currentSubGraph.setStore(path, serviceStore);
    return serviceStore;
  }

  visit_Mapping(element: V1_Mapping): PackageableElement {
    assertNonEmptyString(element.package, 'Mapping package is missing');
    assertNonEmptyString(element.name, 'Mapping name is missing');
    const pureMapping = new Mapping(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(pureMapping);
    this.context.currentSubGraph.setMapping(path, pureMapping);
    return pureMapping;
  }

  visit_Service(element: V1_Service): PackageableElement {
    assertNonEmptyString(element.package, 'Service package is missing');
    assertNonEmptyString(element.name, 'Service name is missing');
    const service = new Service(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(service);
    this.context.currentSubGraph.setService(path, service);
    return service;
  }

  visit_Diagram(element: V1_Diagram): PackageableElement {
    assertNonEmptyString(element.package, 'Diagram package is missing');
    assertNonEmptyString(element.name, 'Diagram name is missing');
    const diagram = new Diagram(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(diagram);
    this.context.currentSubGraph.setDiagram(path, diagram);
    return diagram;
  }

  visit_FileGeneration(
    element: V1_FileGenerationSpecification,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      'File generation element package is missing',
    );
    assertNonEmptyString(
      element.name,
      'File generation element name is missing',
    );
    const fileGeneration = new FileGenerationSpecification(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(fileGeneration);
    this.context.currentSubGraph.setFileGeneration(path, fileGeneration);
    return fileGeneration;
  }

  // TODO: Add support for generation specification
  visit_GenerationSpecification(
    element: V1_GenerationSpecification,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      'Generation tree element package is missing',
    );
    assertNonEmptyString(
      element.name,
      'Generation tree element name is missing',
    );
    const generationSpec = new GenerationSpecification(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(generationSpec);
    this.context.currentSubGraph.setGenerationSpecification(
      path,
      generationSpec,
    );
    return generationSpec;
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): PackageableElement {
    assertNonEmptyString(element.package, 'Runtime package is missing');
    assertNonEmptyString(element.name, 'Runtime name is missing');
    const runtime = new PackageableRuntime(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(runtime);
    this.context.currentSubGraph.setRuntime(path, runtime);
    return runtime;
  }

  visit_PackageableConnection(
    element: V1_PackageableConnection,
  ): PackageableElement {
    assertNonEmptyString(element.package, 'Connection package is missing');
    assertNonEmptyString(element.name, 'Connection name is missing');
    const connection = new PackageableConnection(element.name);
    const path = this.context.currentSubGraph.buildPackageString(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackageWithPackageName(element.package)
      .addElement(connection);
    this.context.currentSubGraph.setConnection(path, connection);
    return connection;
  }
}
