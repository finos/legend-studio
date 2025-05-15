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

import { assertNonEmptyString } from '@finos/legend-shared';
import type { PackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import { Enumeration } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import { Measure } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { Association } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import { FlatData } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import { Database } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import { Service } from '../../../../../../../graph/metamodel/pure/packageableElements/service/Service.js';
import { FileGenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import { PackageableRuntime } from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import { PackageableConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import { GenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import { SectionIndex } from '../../../../../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import { PackageableElementImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import {
  V1_buildFullPath,
  type V1_GraphBuilderContext,
} from './V1_GraphBuilderContext.js';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile.js';
import type { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import type { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import type { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import type { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import type { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData.js';
import type { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database.js';
import type { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import type { V1_Service } from '../../../model/packageableElements/service/V1_Service.js';
import type { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import type { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import type { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import type { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import type { V1_Measure } from '../../../model/packageableElements/domain/V1_Measure.js';
import type { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';
import {
  addElementToPackage,
  getOrCreateGraphPackage,
} from '../../../../../../../graph/helpers/DomainHelper.js';
import { V1_checkDuplicatedElement } from './V1_ElementBuilder.js';
import type { Package } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement.js';
import { DataElement } from '../../../../../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import { V1_buildFunctionSignature } from '../../../helpers/V1_DomainHelper.js';
import { Multiplicity } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import { PrimitiveType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import type { V1_ExecutionEnvironmentInstance } from '../../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import { ExecutionEnvironmentInstance } from '../../../../../../../graph/metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import type { V1_INTERNAL__UnknownPackageableElement } from '../../../model/packageableElements/V1_INTERNAL__UnknownPackageableElement.js';
import { INTERNAL__UnknownPackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/INTERNAL__UnknownPackageableElement.js';
import { INTERNAL__UnknownFunctionActivator } from '../../../../../../../graph/metamodel/pure/packageableElements/function/INTERNAL__UnknownFunctionActivator.js';
import type { V1_INTERNAL__UnknownFunctionActivator } from '../../../model/packageableElements/function/V1_INTERNAL__UnknownFunctionActivator.js';
import type { V1_INTERNAL__UnknownStore } from '../../../model/packageableElements/store/V1_INTERNAL__UnknownStore.js';
import { INTERNAL__UnknownStore } from '../../../../../../../graph/metamodel/pure/packageableElements/store/INTERNAL__UnknownStore.js';
import type { V1_SnowflakeApp } from '../../../model/packageableElements/function/V1_SnowflakeApp.js';
import { SnowflakeApp } from '../../../../../../../graph/metamodel/pure/packageableElements/function/SnowflakeApp.js';
import type { V1_INTERNAL__UnknownElement } from '../../../model/packageableElements/V1_INTERNAL__UnknownElement.js';
import { INTERNAL__UnknownElement } from '../../../../../../../graph/metamodel/pure/packageableElements/INTERNAL__UnknownElement.js';
import type { V1_HostedService } from '../../../model/packageableElements/function/V1_HostedService.js';
import { HostedService } from '../../../../../../../graph/metamodel/pure/packageableElements/function/HostedService.js';
import { V1_buildFunctionActivatorActions } from './helpers/V1_LegendLambdaHelper.js';
import { GenericTypeImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { GenericType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import type { V1_DataProduct } from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { DataProduct } from '../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';

export class V1_ElementFirstPassBuilder
  implements V1_PackageableElementVisitor<PackageableElement>
{
  context: V1_GraphBuilderContext;
  packageCache: Map<string, Package> | undefined;
  elementPathCache: Set<string> | undefined;

  constructor(
    context: V1_GraphBuilderContext,
    packageCache: Map<string, Package> | undefined,
    elementPathCache: Set<string> | undefined,
  ) {
    this.context = context;
    this.packageCache = packageCache;
    this.elementPathCache = elementPathCache;
  }

  visit_PackageableElement(element: V1_PackageableElement): PackageableElement {
    return this.context.extensions
      .getExtraBuilderOrThrow(element)
      .runFirstPass(
        element,
        this.context,
        this.packageCache,
        this.elementPathCache,
      );
  }

  visit_INTERNAL__UnknownElement(
    element: V1_INTERNAL__UnknownElement,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Element 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Element 'name' field is missing or empty`,
    );
    const metamodel = new INTERNAL__UnknownElement(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.INTERNAL__setOwnUnknown(path, metamodel);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.content = element.content;
    metamodel.classifierPath = element.classifierPath;
    return metamodel;
  }

  visit_INTERNAL__UnknownPackageableElement(
    element: V1_INTERNAL__UnknownPackageableElement,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Element 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Element 'name' field is missing or empty`,
    );
    const metamodel = new INTERNAL__UnknownPackageableElement(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.INTERNAL__setOwnUnknownElement(
      path,
      metamodel,
    );
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.content = element.content;
    return metamodel;
  }

  visit_SnowflakeApp(element: V1_SnowflakeApp): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Function activator 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Function activator 'name' field is missing or empty`,
    );
    const metamodel = new SnowflakeApp(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.setOwnFunctionActivator(path, metamodel);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.applicationName = element.applicationName;
    metamodel.description = element.description;
    if (element.usageRole) {
      metamodel.usageRole = element.usageRole;
    }
    if (element.deploymentSchema) {
      metamodel.deploymentSchema = element.deploymentSchema;
    }
    if (element.permissionScheme) {
      metamodel.permissionScheme = element.permissionScheme;
    }

    metamodel.description = element.description;
    V1_buildFunctionActivatorActions(element, metamodel, this.context);
    return metamodel;
  }

  visit_HostedService(element: V1_HostedService): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Rest Service 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Rest Service 'name' field is missing or empty`,
    );
    const metamodel = new HostedService(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.setOwnFunctionActivator(path, metamodel);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.documentation = element.documentation;
    metamodel.pattern = element.pattern;
    metamodel.autoActivateUpdates = element.autoActivateUpdates;
    metamodel.storeModel = element.storeModel;
    metamodel.generateLineage = element.generateLineage;
    metamodel.actions = element.actions;
    V1_buildFunctionActivatorActions(element, metamodel, this.context);
    return metamodel;
  }

  visit_INTERNAL__UnknownFunctionActivator(
    element: V1_INTERNAL__UnknownFunctionActivator,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Function activator 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Function activator 'name' field is missing or empty`,
    );
    const metamodel = new INTERNAL__UnknownFunctionActivator(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.setOwnFunctionActivator(path, metamodel);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.content = element.content;
    return metamodel;
  }

  visit_INTERNAL__UnknownStore(
    element: V1_INTERNAL__UnknownStore,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Store 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Store 'name' field is missing or empty`,
    );
    const metamodel = new INTERNAL__UnknownStore(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    this.context.currentSubGraph.setOwnStore(path, metamodel);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      metamodel,
    );
    metamodel.content = element.content;
    return metamodel;
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      profile,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      pureEnumeration,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      pureMeasure,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      _class,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      association,
    );
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
    const name = V1_buildFunctionSignature(element);
    const func = new ConcreteFunctionDefinition(
      name,
      // This is just a stub to fill in when we first create the function
      GenericTypeImplicitReference.create(
        PackageableElementImplicitReference.create(PrimitiveType.STRING, ''),
        new GenericType(PrimitiveType.STRING),
      ),
      Multiplicity.ZERO_MANY,
    );
    const path = V1_buildFullPath(element.package, name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      func,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      flatData,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      database,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      pureMapping,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      service,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      fileGeneration,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      generationSpec,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      runtime,
    );
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
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      connection,
    );
    this.context.currentSubGraph.setOwnConnection(path, connection);
    return connection;
  }

  visit_DataElement(element: V1_DataElement): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Data element 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Data element 'name' field is missing or empty`,
    );
    const dataElement = new DataElement(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      dataElement,
    );
    this.context.currentSubGraph.setOwnDataElement(path, dataElement);
    return dataElement;
  }

  visit_ExecutionEnvironmentInstance(
    element: V1_ExecutionEnvironmentInstance,
  ): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Execution Environment 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Execution Environment 'name' field is missing or empty`,
    );
    const exEnvir = new ExecutionEnvironmentInstance(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      exEnvir,
    );
    this.context.currentSubGraph.setOwnExecutionEnvironment(path, exEnvir);
    return exEnvir;
  }

  visit_DataProduct(element: V1_DataProduct): PackageableElement {
    assertNonEmptyString(
      element.package,
      `Data Product 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      element.name,
      `Data Product 'name' field is missing or empty`,
    );
    const product = new DataProduct(element.name);
    const path = V1_buildFullPath(element.package, element.name);
    V1_checkDuplicatedElement(path, this.context, this.elementPathCache);
    addElementToPackage(
      getOrCreateGraphPackage(
        this.context.currentSubGraph,
        element.package,
        this.packageCache,
      ),
      product,
    );
    this.context.currentSubGraph.setOwnDataProduct(path, product);
    return product;
  }
}
