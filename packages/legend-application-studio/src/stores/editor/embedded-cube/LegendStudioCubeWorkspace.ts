/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  buildCubeLakehouseEnvironment,
  CubeDataProductEnvironmentType,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeDataProductModelSource,
  type CubeDataProductProject,
  type CubeHostProject,
  type CubeHostProjectRuntime,
  type CubeLakehouseEnvironment,
} from '@finos/legend-cube-builder';
import {
  decorateEnvWithRealm,
  LakehouseEnvironmentType,
} from '@finos/legend-server-lakehouse';
import {
  LakehouseBaseRuntime,
  LakehouseRuntime,
  ModelStore,
  PrimitiveType,
  type PackageableElement,
  type PackageableRuntime,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';

// The project Studio edits, as Legend Cube reads it: its coordinates, the
// lakehouse environment its runs use, and the model its typing and runs
// read, the workspace as it is now. A cube in Studio reads only the
// project's own ingest definitions and data products, which aren't
// deployed: they are typed and run on the workspace, as Studio's own
// queries of them are. Runs use the viewer's lakehouse environment, read
// from their entitlements when Studio has the lakehouse contract server
// (`lakehouse.url`), as Legend Query reads it; else the environment of the
// project's lakehouse runtime. Production parallel adds its realm (`-pp`).
// A project runtime, when there is one, gives a new cube its warehouse.

/** The project's coordinates when Studio has no project configuration, which Cube's sources still name */
const UNKNOWN_PROJECT = { groupId: 'studio', artifactId: 'workspace' };

/** The version a cube of the workspace's data products names: the workspace, never a release */
export const LEGEND_STUDIO_CUBE_WORKSPACE_VERSION = 'workspace';

export const LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE = {
  NO_RUNTIME:
    "Add a lakehouse runtime to the project: a cube runs the project's ingest data sets and data products on it, as Studio's own queries do.",
  NO_ENVIRONMENT: (runtime: string): string =>
    `The project's lakehouse runtime ${runtime} names no environment.`,
};

/** What a run of a class uses: the lakehouse environment, and the project runtime it was read from, when it was */
export interface LegendStudioCubeRuntime extends CubeHostProjectRuntime {
  readonly environment: string;
  readonly path?: string | undefined;
}

/** The environment of a class: production parallel's adds its realm */
const environmentOfClass = (
  environment: string,
  environmentType: CubeDataProductEnvironmentType,
): string =>
  environmentType === CubeDataProductEnvironmentType.PRODUCTION_PARALLEL
    ? decorateEnvWithRealm(
        environment,
        LakehouseEnvironmentType.PRODUCTION_PARALLEL,
      )
    : environment;

export class LegendStudioCubeWorkspace
  implements
    CubeHostProject,
    CubeLakehouseEnvironment,
    CubeDataProductModelSource
{
  readonly editorStore: EditorStore;
  /** The viewer's lakehouse environment, from their entitlements, when Studio has the contract server */
  private readonly viewerEnvironment: CubeLakehouseEnvironment | undefined;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    const { applicationStore, lakehouseContractServerClient } = editorStore;
    this.viewerEnvironment = lakehouseContractServerClient
      ? buildCubeLakehouseEnvironment({
          contractServerClient: lakehouseContractServerClient,
          depotServerClient: editorStore.depotServerClient,
          getAccessToken: () => applicationStore.getAccessToken(),
          getCurrentUser: () => applicationStore.identityService.currentUser,
        })
      : undefined;
  }

  /** The project's coordinates, which the URNs and models of Cube's sources carry */
  get project(): { groupId: string; artifactId: string } {
    const configuration =
      this.editorStore.projectConfigurationEditorState.projectConfiguration;
    return configuration
      ? {
          groupId: configuration.groupId,
          artifactId: configuration.artifactId,
        }
      : UNKNOWN_PROJECT;
  }

  /**
   * The lakehouse runtime a run uses: the project's first, as Studio's own
   * queries of an ingest definition or a data product pick
   * (`getCompatibleRuntimesFromAccessorOwner`, `LakehouseDataProductExecutionState`)
   */
  get lakehouseRuntime(): PackageableRuntime | undefined {
    return this.editorStore.graphManagerState.usableRuntimes.find(
      (runtime) => runtime.runtimeValue instanceof LakehouseBaseRuntime,
    );
  }

  /**
   * What a run of a class uses: the viewer's environment, with the project
   * runtime's warehouse when there is one; without the contract server, the
   * project runtime's environment, which it then needs
   */
  async resolveRuntime(
    environmentType = CubeDataProductEnvironmentType.PRODUCTION,
  ): Promise<LegendStudioCubeRuntime> {
    const runtime = this.lakehouseRuntime;
    const value = runtime?.runtimeValue as LakehouseBaseRuntime | undefined;
    const warehouse =
      value instanceof LakehouseRuntime ? value.warehouse : undefined;
    if (this.viewerEnvironment) {
      const environment = await this.viewerEnvironment.resolveEnvironment(
        this.workspaceProjectOf(environmentType),
      );
      return {
        environment,
        label: `${environment}, your lakehouse environment`,
        warehouse,
      };
    }
    const project = await this.resolveProjectRuntime();
    const environment = environmentOfClass(
      project.environment,
      environmentType,
    );
    return {
      ...project,
      environment,
      label: `${environment}, from ${project.path}`,
    };
  }

  /** The workspace's data products of a class, as the viewer's environment resolver reads a project */
  private workspaceProjectOf(
    environmentType: CubeDataProductEnvironmentType,
  ): CubeDataProductProject {
    return {
      ...this.project,
      versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
      environmentType,
    };
  }

  /** The project's lakehouse runtime, which a run needs without the contract server */
  private async resolveProjectRuntime(): Promise<
    LegendStudioCubeRuntime & { readonly path: string }
  > {
    const runtime = this.lakehouseRuntime;
    if (!runtime) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE.NO_RUNTIME,
      );
    }
    const value = runtime.runtimeValue as LakehouseBaseRuntime;
    if (!value.environment) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE.NO_ENVIRONMENT(runtime.path),
      );
    }
    return {
      path: runtime.path,
      environment: value.environment,
      label: `${value.environment}, from ${runtime.path}`,
      warehouse:
        value instanceof LakehouseRuntime ? value.warehouse : undefined,
    };
  }

  /** The environment a data product run's lakehouse runtime names, for the cube's class */
  async resolveEnvironment(project: CubeDataProductProject): Promise<string> {
    return (await this.resolveRuntime(project.environmentType)).environment;
  }

  /**
   * The elements a cube's typing and runs read, as protocol JSON: the
   * workspace's own and its dependencies', as Studio's own queries send
   * them, so a definition's materialized views and a data product's access
   * points find what they read
   */
  async getModelElements(): Promise<readonly PlainObject[]> {
    const { graph, graphManager } = this.editorStore.graphManagerState;
    return [...graph.allOwnElements, ...graph.dependencyManager.allOwnElements]
      .filter(
        (element: PackageableElement) =>
          !(element instanceof PrimitiveType) &&
          !(element instanceof ModelStore),
      )
      .map(
        (element) =>
          graphManager.elementToEntity(element, {
            pruneSourceInformation: true,
          }).content,
      );
  }

  /** The model a cube of the workspace's data products reads them from: the workspace */
  async getProjectModel(): Promise<PlainObject> {
    return { _type: 'data', elements: await this.getModelElements() };
  }
}
