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

import { assertNonEmptyString, assertTrue } from '@finos/legend-shared';
import {
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../../../../../../../MetaModelConst';
import type { PackageableElement } from '../../../../../../metamodels/pure/packageableElements/PackageableElement';
import { Profile } from '../../../../../../metamodels/pure/packageableElements/domain/Profile';
import { Enumeration } from '../../../../../../metamodels/pure/packageableElements/domain/Enumeration';
import { Measure } from '../../../../../../metamodels/pure/packageableElements/domain/Measure';
import { Class } from '../../../../../../metamodels/pure/packageableElements/domain/Class';
import { Association } from '../../../../../../metamodels/pure/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from '../../../../../../metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import { FlatData } from '../../../../../../metamodels/pure/packageableElements/store/flatData/model/FlatData';
import { Database } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/Database';
import { Mapping } from '../../../../../../metamodels/pure/packageableElements/mapping/Mapping';
import { Service } from '../../../../../../metamodels/pure/packageableElements/service/Service';
import { FileGenerationSpecification } from '../../../../../../metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification';
import { PackageableRuntime } from '../../../../../../metamodels/pure/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../../../../../../metamodels/pure/packageableElements/connection/PackageableConnection';
import { GenerationSpecification } from '../../../../../../metamodels/pure/packageableElements/generationSpecification/GenerationSpecification';
import { SectionIndex } from '../../../../../../metamodels/pure/packageableElements/section/SectionIndex';
import { PackageableElementImplicitReference } from '../../../../../../metamodels/pure/packageableElements/PackageableElementReference';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext';
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
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex';

export class V1_ProtocolToMetaModelGraphFirstPassBuilder
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
    assertNonEmptyString(
      element.package,
      `Section index 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Section index 'name' field is missing or empty`,
    );
    const sectionIndex = new SectionIndex(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph.setOwnSectionIndex(path, sectionIndex);
    return sectionIndex;
  }

  visit_Profile(element: V1_Profile): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Profile 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Profile 'name' field is missing or empty`,
    );
    const profile = new Profile(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(profile);
    this.context.currentSubGraph.setOwnProfile(path, profile);
    return profile;
  }

  visit_Enumeration(element: V1_Enumeration): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Enumeration 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Enumeration 'name' field is missing or empty`,
    );
    const pureEnumeration = new Enumeration(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(pureEnumeration);
    this.context.currentSubGraph.setOwnType(path, pureEnumeration);
    return pureEnumeration;
  }

  visit_Measure(element: V1_Measure): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Measure 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Measure 'name' field is missing or empty`,
    );
    const pureMeasure = new Measure(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(pureMeasure);
    this.context.currentSubGraph.setOwnType(path, pureMeasure);
    return pureMeasure;
  }

  visit_Class(element: V1_Class): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Class 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Class 'name' field is missing or empty`,
    );
    const _class = new Class(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(_class);
    this.context.currentSubGraph.setOwnType(path, _class);
    return _class;
  }

  visit_Association(element: V1_Association): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Association 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Association 'name' field is missing or empty`,
    );
    const association = new Association(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(association);
    this.context.currentSubGraph.setOwnAssociation(path, association);
    return association;
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Function 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Function 'name' field is missing or empty`,
    );
    const func = new ConcreteFunctionDefinition(
      element.name,
      // This is just a stub to fill in when we first create the function
      PackageableElementImplicitReference.create(
        this.context.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING),
        '',
      ),
      this.context.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ZEROMANY,
      ),
    );
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(func);
    this.context.currentSubGraph.setOwnFunction(path, func);
    return func;
  }

  visit_FlatData(element: V1_FlatData): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Flat-data store 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Flat data store 'name' field is missing or empty`,
    );
    const flatData = new FlatData(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(flatData);
    this.context.currentSubGraph.setOwnStore(path, flatData);
    return flatData;
  }

  visit_Database(element: V1_Database): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Database store 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Database store 'name' field is missing or empty`,
    );
    const database = new Database(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(database);
    this.context.currentSubGraph.setOwnStore(path, database);
    return database;
  }

  visit_Mapping(element: V1_Mapping): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Mapping 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Mapping 'name' field is missing or empty`,
    );
    const pureMapping = new Mapping(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(pureMapping);
    this.context.currentSubGraph.setOwnMapping(path, pureMapping);
    return pureMapping;
  }

  visit_Service(element: V1_Service): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Service 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Service 'name' field is missing or empty`,
    );
    const service = new Service(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(service);
    this.context.currentSubGraph.setOwnService(path, service);
    return service;
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
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(fileGeneration);
    this.context.currentSubGraph.setOwnFileGeneration(path, fileGeneration);
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
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(generationSpec);
    this.context.currentSubGraph.setOwnGenerationSpecification(
      path,
      generationSpec,
    );
    return generationSpec;
  }

  visit_PackageableRuntime(element: V1_PackageableRuntime): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Runtime 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Runtime 'name' field is missing or empty`,
    );
    const runtime = new PackageableRuntime(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(runtime);
    this.context.currentSubGraph.setOwnRuntime(path, runtime);
    return runtime;
  }

  visit_PackageableConnection(
    element: V1_PackageableConnection,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Connection 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Connection 'name' field is missing or empty`,
    );
    const connection = new PackageableConnection(element.name);
    const path = this.context.currentSubGraph.buildPath(
      element.package,
      element.name,
    );
    assertTrue(
      !this.context.graph.getNullableElement(path),
      `Element '${path}' already exists`,
    );
    this.context.currentSubGraph
      .getOrCreatePackage(element.package)
      .addElement(connection);
    this.context.currentSubGraph.setOwnConnection(path, connection);
    return connection;
  }
}
