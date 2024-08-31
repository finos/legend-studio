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
  type Clazz,
  guaranteeNonNullable,
  IllegalStateError,
  isNonNullable,
} from '@finos/legend-shared';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { Enumeration } from '../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Type } from '../graph/metamodel/pure/packageableElements/domain/Type.js';
import type { Class } from '../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Mapping } from '../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Profile } from '../graph/metamodel/pure/packageableElements/domain/Profile.js';
import { Package } from '../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { ConcreteFunctionDefinition } from './metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Store } from '../graph/metamodel/pure/packageableElements/store/Store.js';
import type { Association } from '../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { Service } from '../graph/metamodel/pure/packageableElements/service/Service.js';
import { BasicModel } from '../graph/BasicModel.js';
import type { PackageableRuntime } from '../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { PackageableConnection } from '../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { FileGenerationSpecification } from '../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from '../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type { Measure } from '../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { SectionIndex } from '../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import { type EntitiesWithOrigin, GAV_DELIMITER } from '@finos/legend-storage';
import type { Database } from './metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { DataElement } from './metamodel/pure/packageableElements/data/DataElement.js';
import type { ExecutionEnvironmentInstance } from './metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import { LegendSDLC, type GraphDataOrigin } from './GraphDataOrigin.js';
import type { FunctionActivator } from './metamodel/pure/packageableElements/function/FunctionActivator.js';
import type { PureGraphPlugin } from './PureGraphPlugin.js';
import type { Testable } from './metamodel/pure/test/Testable.js';

export const DEPENDENCY_ROOT_PACKAGE_PREFIX = '@dependency__';
export const generateDependencyRootPackageName = (
  dependencyKey: string,
): string => `${DEPENDENCY_ROOT_PACKAGE_PREFIX}${dependencyKey}`;
export const extractDependencyGACoordinateFromRootPackageName = (
  packageName: string,
): string | undefined => {
  const idx = packageName.indexOf(DEPENDENCY_ROOT_PACKAGE_PREFIX);
  if (idx !== 0) {
    return undefined;
  }
  return packageName.substring(DEPENDENCY_ROOT_PACKAGE_PREFIX.length);
};

export class DependencyModel extends BasicModel {
  constructor(
    extensionElementClasses: PureGraphPlugin[],
    root: Package,
    origin: GraphDataOrigin,
  ) {
    super(root.name, extensionElementClasses, origin);
    this.root = root;
  }
}

const buildDependencyElementGetter =
  <T extends PackageableElement>(
    dependencyManager: DependencyManager,
    elementGetter: (dependencyGraph: BasicModel, path: string) => T | undefined,
  ): ((path: string) => T | undefined) =>
  (path: string): T | undefined => {
    for (const dependencyGraph of dependencyManager.dependencyGraphs) {
      const element = elementGetter(dependencyGraph, path);
      if (element) {
        return element;
      }
    }
    return undefined;
  };

export class DependencyManager {
  private readonly graphPlugins: PureGraphPlugin[];

  private _origin: GraphDataOrigin | undefined;

  roots: Package[] = [];
  projectDependencyModelsIndex = new Map<string, BasicModel>();

  constructor(graphPlugins: PureGraphPlugin[]) {
    this.graphPlugins = graphPlugins;
  }

  /**
   * Here we create and index a graph for each dependency
   */
  initialize(dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>): void {
    Array.from(dependencyEntitiesIndex.entries()).forEach(
      ([dependencyKey, entitiesWithOrigin]) => {
        const pkg = new Package(
          generateDependencyRootPackageName(dependencyKey),
        );
        this.roots.push(pkg);
        // NOTE: all dependency models will share the dependency manager root package.
        this.projectDependencyModelsIndex.set(
          dependencyKey,
          new DependencyModel(
            this.graphPlugins,
            pkg,
            new LegendSDLC(
              entitiesWithOrigin.groupId,
              entitiesWithOrigin.artifactId,
              entitiesWithOrigin.versionId,
            ),
          ),
        );
      },
    );
  }

  get numberOfDependencies(): number {
    return this.projectDependencyModelsIndex.size;
  }

  get hasDependencies(): boolean {
    return Boolean(this.projectDependencyModelsIndex.size);
  }

  get dependencyGraphs(): BasicModel[] {
    return Array.from(this.projectDependencyModelsIndex.values());
  }

  get allOwnElements(): PackageableElement[] {
    return this.dependencyGraphs.flatMap((dep) => dep.allOwnElements);
  }

  get origin(): GraphDataOrigin | undefined {
    return this._origin;
  }

  setOrigin(val: GraphDataOrigin): void {
    if (this._origin) {
      throw new IllegalStateError(`Graph origin has already been set`);
    } else {
      this._origin = val;
    }
  }

  getOwnNullableSectionIndex = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableSectionIndex(path),
  );
  getOwnNullableProfile = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableProfile(path),
  );
  getOwnNullableType = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableType(path),
  );
  getOwnNullableClass = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableClass(path),
  );
  getOwnNullableEnumeration = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableEnumeration(path),
  );
  getOwnNullableMeasure = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableMeasure(path),
  );
  getOwnNullableAssociation = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableAssociation(path),
  );
  getOwnNullableFunction = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableFunction(path),
  );
  getOwnNullableFunctionActivator = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) =>
      dep.getOwnNullableFunctionActivator(path),
  );
  getOwnNullableStore = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableStore(path),
  );
  getOwnNullableMapping = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableMapping(path),
  );
  getOwnNullableConnection = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableConnection(path),
  );
  getOwnNullableRuntime = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableRuntime(path),
  );
  getOwnNullableService = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableService(path),
  );
  getOwnNullableGenerationSpecification = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) =>
      dep.getOwnNullableGenerationSpecification(path),
  );
  getOwnNullableFileGeneration = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableFileGeneration(path),
  );
  getOwnNullableDataElement = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnNullableDataElement(path),
  );
  getOwnExecutionEnvironment = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) =>
      dep.getOwnNullableExecutionEnviornment(path),
  );
  getOwnNullableExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
  ): T | undefined {
    for (const dependencyGraph of this.dependencyGraphs) {
      const element = dependencyGraph
        .getExtensionForElementClass(extensionElementClass)
        .getElement(path);
      if (element) {
        return element;
      }
    }
    return undefined;
  }

  get sectionIndices(): SectionIndex[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownSectionIndices);
  }
  get profiles(): Profile[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownProfiles);
  }
  get enumerations(): Enumeration[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownEnumerations);
  }
  get measures(): Measure[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownMeasures);
  }
  get classes(): Class[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownClasses);
  }
  get types(): Type[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownTypes);
  }
  get associations(): Association[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownAssociations);
  }
  get functions(): ConcreteFunctionDefinition[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownFunctions);
  }
  get functionActivators(): FunctionActivator[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownFunctionActivators);
  }
  get stores(): Store[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownStores);
  }
  get databases(): Database[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownDatabases);
  }
  get mappings(): Mapping[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownMappings);
  }
  get services(): Service[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownServices);
  }
  get runtimes(): PackageableRuntime[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownRuntimes);
  }
  get connections(): PackageableConnection[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownConnections);
  }
  get dataElements(): DataElement[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownDataElements);
  }
  get generationSpecifications(): GenerationSpecification[] {
    return this.dependencyGraphs.flatMap(
      (dep) => dep.ownGenerationSpecifications,
    );
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownFileGenerations);
  }
  get testables(): Testable[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownTestables);
  }
  get executionEnvironments(): ExecutionEnvironmentInstance[] {
    return this.dependencyGraphs.flatMap((dep) => dep.ownExecutionEnvironments);
  }

  getExtensionElements<T extends PackageableElement>(
    extensionElementClass: Clazz<T>,
  ): T[] {
    return this.dependencyGraphs.flatMap((dep) =>
      dep.getExtensionElements(extensionElementClass),
    );
  }

  getModel(projectId: string): BasicModel {
    return guaranteeNonNullable(
      this.projectDependencyModelsIndex.get(projectId),
      `Can't find dependency model with project ID '${projectId}'`,
    );
  }

  getNullableElement(
    path: string,
    includePackage?: boolean,
  ): PackageableElement | undefined {
    const model = this.dependencyGraphs.find((dep) =>
      Boolean(dep.getOwnNullableElement(path, includePackage)),
    );
    return model?.getOwnNullableElement(path, includePackage);
  }

  getPackages(path: string): Package[] {
    return this.dependencyGraphs
      .map((dep) => dep.getNullablePackage(path))
      .filter(isNonNullable);
  }

  getElementOrigin(element: PackageableElement): string | undefined {
    const model = this.dependencyGraphs.find((dep) =>
      Boolean(dep.getOwnNullableElement(element.path)),
    );
    return model?.origin instanceof LegendSDLC
      ? `${model.origin.groupId}${GAV_DELIMITER}${model.origin.artifactId}`
      : undefined;
  }
}
