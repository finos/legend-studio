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
  type PRIMITIVE_TYPE,
  ROOT_PACKAGE_NAME,
  AUTO_IMPORTS,
  PRECISE_PRIMITIVE_TYPE,
} from '../graph/MetaModelConst.js';
import {
  type Clazz,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  IllegalStateError,
  isNonNullable,
} from '@finos/legend-shared';
import {
  PrecisePrimitiveType,
  PrimitiveType,
} from '../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { Enumeration } from '../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import { Multiplicity } from '../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import type { Association } from '../graph/metamodel/pure/packageableElements/domain/Association.js';
import { Package } from '../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { Type } from '../graph/metamodel/pure/packageableElements/domain/Type.js';
import { Class } from '../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Mapping } from '../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Profile } from '../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Store } from '../graph/metamodel/pure/packageableElements/store/Store.js';
import { DependencyManager } from '../graph/DependencyManager.js';
import { ConcreteFunctionDefinition } from './metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Service } from '../graph/metamodel/pure/packageableElements/service/Service.js';
import { BasicModel } from './BasicModel.js';
import { FlatData } from '../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import { Database } from '../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { PackageableConnection } from '../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { PackageableRuntime } from '../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { FileGenerationSpecification } from '../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import { ModelStore } from '../graph/metamodel/pure/packageableElements/store/modelToModel/model/ModelStore.js';
import type { GenerationSpecification } from '../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import {
  Measure,
  Unit,
} from '../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { PureGraphPlugin } from './PureGraphPlugin.js';
import {
  createPath,
  extractElementNameFromPath,
} from '../graph/MetaModelUtils.js';
import type { DataElement } from '../graph/metamodel/pure/packageableElements/data/DataElement.js';
import type { Testable } from '../graph/metamodel/pure/test/Testable.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { SectionIndex } from '../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import type { PropertyOwner } from './metamodel/pure/packageableElements/domain/AbstractProperty.js';
import type { ExecutionEnvironmentInstance } from './metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import { FunctionActivator } from './metamodel/pure/packageableElements/function/FunctionActivator.js';
import type { IngestDefinition } from './metamodel/pure/packageableElements/ingest/IngestDefinition.js';

export interface GraphTextInputOption {
  graphGrammar: string | undefined;
}

/**
 * CoreModel holds meta models which are constant and basic building block of the graph. Since throughout the lifetime
 * of the application, we rebuild PureModel many times, we cannot have these basic building blocks as part of PureModel
 * as that will throw off referential equality.
 *
 * Also, since project dependency uses primitive types, it might even
 * cause the dependency model and system model to depend on PureModel which is bad, as it could potentially cause memory leak
 * as we rebuild the graph.
 */
export class CoreModel extends BasicModel {
  primitiveTypesIndex = new Map<string, PrimitiveType>();
  precisePrimitiveTypesIndex = new Map<string, PrimitiveType>();

  get primitiveTypes(): PrimitiveType[] {
    return Array.from(this.primitiveTypesIndex.values());
  }

  get precisePrimitiveTypes(): PrimitiveType[] {
    return Array.from(this.precisePrimitiveTypesIndex.values());
  }

  constructor(graphPlugins: PureGraphPlugin[]) {
    super(ROOT_PACKAGE_NAME.CORE, graphPlugins);
    this.initializePrimitiveTypes();
    this.initializePrecisePrimitiveTypes();
    // index model store singleton
    this.setOwnStore(ModelStore.NAME, ModelStore.INSTANCE);
  }

  override get allOwnElements(): PackageableElement[] {
    return [...super.allOwnElements, ...this.primitiveTypes];
  }

  override getOwnNullableType(path: string): Type | undefined {
    let resolvedPath = path;
    if ((Object.values(PRECISE_PRIMITIVE_TYPE) as string[]).includes(path)) {
      // for precise primitive types, we use the name as the path
      resolvedPath = extractElementNameFromPath(path);
    }
    return super.getOwnNullableType(resolvedPath);
  }

  /**
   * NOTE: primitive types are special, they are not put in any package (i.e. they are not linked to `Root` package at all)
   */
  initializePrimitiveTypes(): void {
    [
      PrimitiveType.STRING,
      PrimitiveType.BOOLEAN,
      PrimitiveType.BINARY,
      PrimitiveType.NUMBER,
      PrimitiveType.INTEGER,
      PrimitiveType.FLOAT,
      PrimitiveType.DECIMAL,
      PrimitiveType.DATE,
      PrimitiveType.STRICTDATE,
      PrimitiveType.DATETIME,
      PrimitiveType.STRICTTIME,
      PrimitiveType.LATESTDATE,
      PrimitiveType.BYTE,
    ].forEach((primitiveType) => {
      this.primitiveTypesIndex.set(primitiveType.path, primitiveType);
      this.setOwnType(primitiveType.path, primitiveType);
    });
  }

  initializePrecisePrimitiveTypes(): void {
    [
      PrecisePrimitiveType.VARCHAR,
      PrecisePrimitiveType.INT,
      PrecisePrimitiveType.TINY_INT,
      PrecisePrimitiveType.U_TINY_INT,
      PrecisePrimitiveType.SMALL_INT,
      PrecisePrimitiveType.U_SMALL_INT,
      PrecisePrimitiveType.U_INT,
      PrecisePrimitiveType.BIG_INT,
      PrecisePrimitiveType.U_BIG_INT,
      PrecisePrimitiveType.FLOAT,
      PrecisePrimitiveType.DOUBLE,
      PrecisePrimitiveType.NUMERIC,
      PrecisePrimitiveType.TIMESTAMP,
    ].forEach((precisePrimitiveType) => {
      this.precisePrimitiveTypesIndex.set(
        precisePrimitiveType.path,
        precisePrimitiveType,
      );
      this.setOwnType(precisePrimitiveType.path, precisePrimitiveType);
    });
  }
}

export class SystemModel extends BasicModel {
  autoImports: Package[] = [];

  constructor(graphPlugins: PureGraphPlugin[]) {
    super(ROOT_PACKAGE_NAME.SYSTEM, graphPlugins);
  }

  /**
   * NOTE: auto imports are for special types and profiles from system model
   * such as `Any` or `doc` profiles. We don't actually build the packages here
   * just resolving them, so we have to make sure whatever package we have as
   * auto imports, we must have built some elements with such package, e.g.
   *
   * `meta::pure::metamodel::type::Any` covers `meta::pure::metamodel::type`
   * `meta::pure::profiles::doc` covers `meta::pure::profiles`
   */
  initializeAutoImports(): void {
    this.autoImports = AUTO_IMPORTS.map((_package) =>
      guaranteeType(
        this.getOwnNullableElement(_package, true),
        Package,
        `Can't find auto-import package '${_package}'`,
      ),
    );
  }
}

export class GenerationModel extends BasicModel {
  constructor(graphPlugins: PureGraphPlugin[]) {
    super(ROOT_PACKAGE_NAME.MODEL_GENERATION, graphPlugins);
  }
}

/**
 * The model of Pure, a.k.a the Pure graph
 */
export class PureModel extends BasicModel {
  private readonly coreModel: CoreModel;
  readonly systemModel: SystemModel;
  generationModel: GenerationModel;
  dependencyManager: DependencyManager; // used to manage the elements from dependency projects

  constructor(
    coreModel: CoreModel,
    systemModel: SystemModel,
    graphPlugins: PureGraphPlugin[],
  ) {
    super(ROOT_PACKAGE_NAME.MAIN, graphPlugins);
    this.coreModel = coreModel;
    this.systemModel = systemModel;
    this.generationModel = new GenerationModel(graphPlugins);
    this.dependencyManager = new DependencyManager(graphPlugins);
  }

  get autoImports(): Package[] {
    return this.systemModel.autoImports;
  }

  get primitiveTypes(): PrimitiveType[] {
    return this.coreModel.primitiveTypes;
  }

  get sectionIndices(): SectionIndex[] {
    return [
      ...this.coreModel.ownSectionIndices,
      ...this.systemModel.ownSectionIndices,
      ...this.dependencyManager.sectionIndices,
      ...this.ownSectionIndices,
      ...this.generationModel.ownSectionIndices,
    ];
  }
  get profiles(): Profile[] {
    return [
      ...this.coreModel.ownProfiles,
      ...this.systemModel.ownProfiles,
      ...this.dependencyManager.profiles,
      ...this.ownProfiles,
      ...this.generationModel.ownProfiles,
    ];
  }
  get enumerations(): Enumeration[] {
    return [
      ...this.coreModel.ownEnumerations,
      ...this.systemModel.ownEnumerations,
      ...this.dependencyManager.enumerations,
      ...this.ownEnumerations,
      ...this.generationModel.ownEnumerations,
    ];
  }
  get measures(): Measure[] {
    return [
      ...this.coreModel.ownMeasures,
      ...this.systemModel.ownMeasures,
      ...this.dependencyManager.measures,
      ...this.ownMeasures,
      ...this.generationModel.ownMeasures,
    ];
  }
  get classes(): Class[] {
    return [
      ...this.coreModel.ownClasses,
      ...this.systemModel.ownClasses,
      ...this.dependencyManager.classes,
      ...this.ownClasses,
      ...this.generationModel.ownClasses,
    ];
  }
  get types(): Type[] {
    return [
      ...this.coreModel.ownTypes,
      ...this.systemModel.ownTypes,
      ...this.dependencyManager.types,
      ...this.ownTypes,
      ...this.generationModel.ownTypes,
    ];
  }
  get associations(): Association[] {
    return [
      ...this.coreModel.ownAssociations,
      ...this.systemModel.ownAssociations,
      ...this.dependencyManager.associations,
      ...this.ownAssociations,
      ...this.generationModel.ownAssociations,
    ];
  }
  get functions(): ConcreteFunctionDefinition[] {
    return [
      ...this.coreModel.ownFunctions,
      ...this.systemModel.ownFunctions,
      ...this.dependencyManager.functions,
      ...this.ownFunctions,
      ...this.generationModel.ownFunctions,
    ];
  }
  get functionActivators(): FunctionActivator[] {
    return [
      ...this.coreModel.ownFunctionActivators,
      ...this.systemModel.ownFunctionActivators,
      ...this.dependencyManager.functionActivators,
      ...this.ownFunctionActivators,
      ...this.generationModel.ownFunctionActivators,
    ];
  }
  get stores(): Store[] {
    return [
      ...this.coreModel.ownStores,
      ...this.systemModel.ownStores,
      ...this.dependencyManager.stores,
      ...this.ownStores,
      ...this.generationModel.ownStores,
    ];
  }
  get databases(): Database[] {
    return [
      ...this.coreModel.ownDatabases,
      ...this.systemModel.ownDatabases,
      ...this.dependencyManager.databases,
      ...this.ownDatabases,
      ...this.generationModel.ownDatabases,
    ];
  }
  get mappings(): Mapping[] {
    return [
      ...this.coreModel.ownMappings,
      ...this.systemModel.ownMappings,
      ...this.dependencyManager.mappings,
      ...this.ownMappings,
      ...this.generationModel.ownMappings,
    ];
  }
  get services(): Service[] {
    return [
      ...this.coreModel.ownServices,
      ...this.systemModel.ownServices,
      ...this.dependencyManager.services,
      ...this.ownServices,
      ...this.generationModel.ownServices,
    ];
  }
  get runtimes(): PackageableRuntime[] {
    return [
      ...this.coreModel.ownRuntimes,
      ...this.systemModel.ownRuntimes,
      ...this.dependencyManager.runtimes,
      ...this.ownRuntimes,
      ...this.generationModel.ownRuntimes,
    ];
  }
  get connections(): PackageableConnection[] {
    return [
      ...this.coreModel.ownConnections,
      ...this.systemModel.ownConnections,
      ...this.dependencyManager.connections,
      ...this.ownConnections,
      ...this.generationModel.ownConnections,
    ];
  }
  get dataElements(): DataElement[] {
    return [
      ...this.coreModel.ownDataElements,
      ...this.systemModel.ownDataElements,
      ...this.dependencyManager.dataElements,
      ...this.ownDataElements,
      ...this.generationModel.ownDataElements,
    ];
  }
  get executionEnvironments(): ExecutionEnvironmentInstance[] {
    return [
      ...this.coreModel.ownExecutionEnvironments,
      ...this.systemModel.ownExecutionEnvironments,
      ...this.dependencyManager.executionEnvironments,
      ...this.ownExecutionEnvironments,
      ...this.generationModel.ownExecutionEnvironments,
    ];
  }

  get generationSpecifications(): GenerationSpecification[] {
    return [
      ...this.coreModel.ownGenerationSpecifications,
      ...this.systemModel.ownGenerationSpecifications,
      ...this.dependencyManager.generationSpecifications,
      ...this.ownGenerationSpecifications,
      ...this.generationModel.ownGenerationSpecifications,
    ];
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return [
      ...this.coreModel.ownFileGenerations,
      ...this.systemModel.ownFileGenerations,
      ...this.dependencyManager.fileGenerations,
      ...this.ownFileGenerations,
      ...this.generationModel.ownFileGenerations,
    ];
  }

  get ingests(): IngestDefinition[] {
    return [
      ...this.coreModel.ownIngests,
      ...this.systemModel.ownIngests,
      ...this.dependencyManager.ingests,
      ...this.ownIngests,
      ...this.generationModel.ownIngests,
    ];
  }

  get allElements(): PackageableElement[] {
    return [
      ...this.coreModel.allOwnElements,
      ...this.systemModel.allOwnElements,
      ...this.dependencyManager.allOwnElements,
      ...this.allOwnElements,
      ...this.generationModel.allOwnElements,
    ];
  }

  get testables(): Testable[] {
    return [
      ...this.coreModel.ownTestables,
      ...this.systemModel.ownTestables,
      ...this.dependencyManager.testables,
      ...this.ownTestables,
      ...this.generationModel.ownTestables,
    ];
  }

  getPrimitiveType = (type: PRIMITIVE_TYPE): PrimitiveType =>
    guaranteeNonNullable(
      this.coreModel.primitiveTypesIndex.get(type),
      `Can't find primitive type '${type}'`,
    );
  getType = (path: string): Type =>
    guaranteeNonNullable(
      this.getOwnNullableType(path) ??
        this.generationModel.getOwnNullableType(path) ??
        this.dependencyManager.getOwnNullableType(path) ??
        this.systemModel.getOwnNullableType(path) ??
        this.coreModel.getOwnNullableType(path),
      `Can't find type '${path}'`,
    );
  getProfile = (path: string): Profile =>
    guaranteeNonNullable(
      this.getOwnNullableProfile(path) ??
        this.generationModel.getOwnNullableProfile(path) ??
        this.dependencyManager.getOwnNullableProfile(path) ??
        this.systemModel.getOwnNullableProfile(path),
      `Can't find profile '${path}'`,
    );
  getEnumeration = (path: string): Enumeration =>
    guaranteeType(
      this.getType(path),
      Enumeration,
      `Can't find enumeration '${path}'`,
    );
  getMeasure = (path: string): Measure =>
    guaranteeType(this.getType(path), Measure, `Can't find measure '${path}'`);
  getUnit = (path: string): Unit =>
    guaranteeType(this.getType(path), Unit, `Can't find unit '${path}'`);
  getClass = (path: string): Class =>
    guaranteeType(this.getType(path), Class, `Can't find class '${path}'`);
  getAssociation = (path: string): Association =>
    guaranteeNonNullable(
      this.getOwnNullableAssociation(path) ??
        this.generationModel.getOwnNullableAssociation(path) ??
        this.dependencyManager.getOwnNullableAssociation(path) ??
        this.systemModel.getOwnNullableAssociation(path),
      `Can't find association '${path}'`,
    );
  getPropertyOwner = (path: string): PropertyOwner =>
    guaranteeNonNullable(
      this.getOwnNullableAssociation(path) ??
        this.generationModel.getOwnNullableAssociation(path) ??
        this.dependencyManager.getOwnNullableAssociation(path) ??
        this.systemModel.getOwnNullableAssociation(path) ??
        guaranteeType(this.getType(path), Class),
      `Can't find property owner '${path}'`,
    );
  getFunction = (path: string): ConcreteFunctionDefinition =>
    guaranteeType(
      this.getOwnNullableFunction(path) ??
        this.generationModel.getOwnNullableFunction(path) ??
        this.dependencyManager.getOwnNullableFunction(path) ??
        this.systemModel.getOwnNullableFunction(path),
      ConcreteFunctionDefinition,
      `Can't find function '${path}'`,
    );
  getFunctionActivator = (path: string): FunctionActivator =>
    guaranteeType(
      this.getOwnNullableFunctionActivator(path) ??
        this.generationModel.getOwnNullableFunctionActivator(path) ??
        this.dependencyManager.getOwnNullableFunctionActivator(path) ??
        this.systemModel.getOwnNullableFunctionActivator(path),
      FunctionActivator,
      `Can't find function activator '${path}'`,
    );
  getStore = (path: string): Store =>
    guaranteeNonNullable(
      this.getOwnNullableStore(path) ??
        this.generationModel.getOwnNullableStore(path) ??
        this.dependencyManager.getOwnNullableStore(path) ??
        this.systemModel.getOwnNullableStore(path) ??
        this.coreModel.getOwnNullableStore(path),
      `Can't find store '${path}'`,
    );
  getFlatDataStore = (path: string): FlatData =>
    guaranteeType(
      this.getStore(path),
      FlatData,
      `Can't find flat-data store '${path}'`,
    );
  getDatabase = (path: string): Database =>
    guaranteeType(
      this.getStore(path),
      Database,
      `Can't find database store '${path}'`,
    );
  getMapping = (path: string): Mapping =>
    guaranteeNonNullable(
      this.getOwnNullableMapping(path) ??
        this.generationModel.getOwnNullableMapping(path) ??
        this.dependencyManager.getOwnNullableMapping(path) ??
        this.systemModel.getOwnNullableMapping(path),
      `Can't find mapping '${path}'`,
    );
  getService = (path: string): Service =>
    guaranteeNonNullable(
      this.getOwnNullableService(path) ??
        this.generationModel.getOwnNullableService(path) ??
        this.dependencyManager.getOwnNullableService(path) ??
        this.systemModel.getOwnNullableService(path),
      `Can't find service '${path}'`,
    );
  getConnection = (path: string): PackageableConnection =>
    guaranteeNonNullable(
      this.getOwnNullableConnection(path) ??
        this.generationModel.getOwnNullableConnection(path) ??
        this.dependencyManager.getOwnNullableConnection(path) ??
        this.systemModel.getOwnNullableConnection(path),
      `Can't find connection '${path}'`,
    );
  getRuntime = (path: string): PackageableRuntime =>
    guaranteeNonNullable(
      this.getOwnNullableRuntime(path) ??
        this.generationModel.getOwnNullableRuntime(path) ??
        this.dependencyManager.getOwnNullableRuntime(path) ??
        this.systemModel.getOwnNullableRuntime(path),
      `Can't find runtime '${path}'`,
    );
  getGenerationSpecification = (path: string): GenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnNullableGenerationSpecification(path) ??
        this.generationModel.getOwnNullableGenerationSpecification(path) ??
        this.dependencyManager.getOwnNullableGenerationSpecification(path) ??
        this.systemModel.getOwnNullableGenerationSpecification(path),
      `Can't find generation specification '${path}'`,
    );
  getFileGeneration = (path: string): FileGenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnNullableFileGeneration(path) ??
        this.generationModel.getOwnNullableFileGeneration(path) ??
        this.dependencyManager.getOwnNullableFileGeneration(path) ??
        this.systemModel.getOwnNullableFileGeneration(path),
      `Can't find file generation '${path}'`,
    );
  getDataElement = (path: string): DataElement =>
    guaranteeNonNullable(
      this.getOwnNullableDataElement(path) ??
        this.generationModel.getOwnNullableDataElement(path) ??
        this.dependencyManager.getOwnNullableDataElement(path) ??
        this.systemModel.getOwnNullableDataElement(path),
      `Can't find data element '${path}'`,
    );

  getExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
    notFoundErrorMessage?: string,
  ): T {
    // NOTE: beware that this method will favor main graph elements over those of subgraphs when resolving
    return guaranteeNonNullable(
      this.getOwnNullableExtensionElement(path, extensionElementClass) ??
        this.generationModel.getOwnNullableExtensionElement(
          path,
          extensionElementClass,
        ) ??
        this.dependencyManager.getOwnNullableExtensionElement(
          path,
          extensionElementClass,
        ) ??
        this.systemModel.getOwnNullableExtensionElement(
          path,
          extensionElementClass,
        ),
      notFoundErrorMessage ?? `Can't find element '${path}'`,
    );
  }
  getElement = (path: string, includePackage?: boolean): PackageableElement =>
    guaranteeNonNullable(
      this.getNullableElement(path, includePackage),
      `Can't find element '${path}'`,
    );

  getNullableClass = (path: string): Class | undefined =>
    returnUndefOnError(() => this.getClass(path));
  getNullableMapping = (path: string): Mapping | undefined =>
    returnUndefOnError(() => this.getMapping(path));
  getNullableService = (path: string): Service | undefined =>
    returnUndefOnError(() => this.getService(path));
  getNullableRuntime = (path: string): PackageableRuntime | undefined =>
    returnUndefOnError(() => this.getRuntime(path));
  getNullableFileGeneration = (
    path: string,
  ): FileGenerationSpecification | undefined =>
    returnUndefOnError(() => this.getFileGeneration(path));

  getNullableElement(
    path: string,
    includePackage?: boolean,
  ): PackageableElement | undefined {
    // NOTE: beware that this method will favor main graph elements over those of subgraphs when resolving
    const element =
      super.getOwnNullableElement(path) ??
      this.dependencyManager.getNullableElement(path) ??
      this.generationModel.getOwnNullableElement(path) ??
      this.systemModel.getOwnNullableElement(path) ??
      this.coreModel.getOwnNullableElement(path);
    if (includePackage && !element) {
      return (
        this.getNullablePackage(path) ??
        this.dependencyManager.getNullableElement(path, true) ??
        this.generationModel.getNullablePackage(path) ??
        this.systemModel.getNullablePackage(path)
      );
    }
    return element;
  }

  getPackages(path: string): Package[] {
    return [
      this.getNullablePackage(path),
      ...this.dependencyManager.getPackages(path),
      this.generationModel.getNullablePackage(path),
      this.systemModel.getNullablePackage(path),
    ].filter(isNonNullable);
  }

  getMultiplicity(
    lowerBound: number,
    upperBound: number | undefined,
  ): Multiplicity {
    let multiplicity: Multiplicity | undefined;
    if (lowerBound === 1 && upperBound === 1) {
      multiplicity = Multiplicity.ONE;
    } else if (lowerBound === 0 && upperBound === 1) {
      multiplicity = Multiplicity.ZERO_ONE;
    } else if (lowerBound === 0 && upperBound === undefined) {
      multiplicity = Multiplicity.ZERO_MANY;
    } else if (lowerBound === 1 && upperBound === undefined) {
      multiplicity = Multiplicity.ONE_MANY;
    } else if (lowerBound === 0 && upperBound === 0) {
      multiplicity = Multiplicity.ZERO;
    }
    return multiplicity ?? new Multiplicity(lowerBound, upperBound);
  }

  addElement(
    element: PackageableElement,
    packagePath: string | undefined,
  ): void {
    const fullPath = createPath(packagePath ?? '', element.name);

    // check for duplication first, but skip package
    const existingElement = this.getNullableElement(fullPath, false);
    if (existingElement) {
      throw new IllegalStateError(
        `Can't create element '${fullPath}': another element with the same path already existed`,
      );
    }

    super.addOwnElement(element, packagePath);
  }

  deleteElement(element: PackageableElement): void {
    super.deleteOwnElement(element);

    const deadReferencesCleaners = this.graphPlugins.flatMap(
      (plugin) => plugin.getExtraDeadReferencesCleaners?.() ?? [],
    );

    for (const cleaner of deadReferencesCleaners) {
      cleaner(this);
    }
  }

  renameElement(element: PackageableElement, newPath: string): void {
    // check for duplication first, but skip package
    const existingElement = this.getNullableElement(newPath, false);
    if (existingElement) {
      throw new IllegalStateError(
        `Can't rename element '${element.path}' to '${newPath}': another element with the same path already existed`,
      );
    }

    super.renameOwnElement(element, element.path, newPath);
  }
}
