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

import type { Schema } from '@finos/legend-cube';
import {
  CubeDataProductEnvironmentType,
  CubeEngineError,
  CubeEngineErrorKind,
  CubeIngestDefinitionCandidate,
  CubeIngestEnvironment,
  CubeIngestProducer,
  formatCubeIngestUrn,
  parseCubeIngestUrn,
  readCubeIngestDataSets,
  type CubeIngestCatalog,
  type CubeIngestDataSet,
  type CubeIngestDataSetLocation,
  type CubeIngestDefinitionList,
  type CubeIngestDefinitionSource,
  type NodeId,
} from '@finos/legend-cube-builder';
import {
  LakehouseBaseRuntime,
  LakehouseRuntime,
  type IngestDefinition,
  type PackageableRuntime,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';

// Legend Cube in Studio: a cube reads the ingest definitions of the project
// being edited, as the workspace holds them, and runs on the project's
// lakehouse runtime, as Studio's own queries of an ingest definition do. The
// Ingest tab lists them as Legend Query's lists deployed ones, each named by
// the URN it would have if this project deployed it.

/** The one class a Studio cube reads the project's definitions as, so the Ingest tab offers no other */
const STUDIO_CUBE_INGEST_CLASS = CubeDataProductEnvironmentType.PRODUCTION;

/** The producer deployment of a definition with no app directory deployment */
const NO_DEPLOYMENT_ID = '0';

/** The project's coordinates when Studio has no project configuration, which the URNs still need */
const UNKNOWN_PROJECT = { groupId: 'studio', artifactId: 'workspace' };

export const LEGEND_STUDIO_CUBE_MESSAGE = {
  NO_RUNTIME:
    "Add a lakehouse runtime to the project: a cube runs the project's ingest data sets on it, as Studio's own queries do.",
  NO_ENVIRONMENT: (runtime: string): string =>
    `The project's lakehouse runtime ${runtime} names no environment.`,
  GONE: (definition: string): string =>
    `The project has no ingest definition ${definition} any more.`,
  UNREADABLE: (definition: string): string =>
    `Cube can't read the data sets of ingest definition ${definition}.`,
  NO_DATA_SET: (dataSet: string, definition: string): string =>
    `Ingest definition ${definition} has no data set "${dataSet}".`,
};

const deploymentIdOf = (definition: IngestDefinition): string =>
  definition.appDirDeployment
    ? String(definition.appDirDeployment.appDirId)
    : NO_DEPLOYMENT_ID;

/**
 * The project's own ingest definitions, for the Ingest tab and for the
 * engine, which types and runs on them as the workspace holds them now
 */
export class LegendStudioCubeIngestCatalog
  implements CubeIngestCatalog, CubeIngestDefinitionSource
{
  readonly environmentTypes = [STUDIO_CUBE_INGEST_CLASS];
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  private get project(): { groupId: string; artifactId: string } {
    const configuration =
      this.editorStore.projectConfigurationEditorState.projectConfiguration;
    return configuration
      ? {
          groupId: configuration.groupId,
          artifactId: configuration.artifactId,
        }
      : UNKNOWN_PROJECT;
  }

  /** The project's own definitions, not its dependencies' */
  private get definitions(): IngestDefinition[] {
    return this.editorStore.graphManagerState.graph.ownIngests;
  }

  /** The URN a cube names the project's definition by */
  urnOf(definition: IngestDefinition): string {
    return formatCubeIngestUrn({
      environmentType: STUDIO_CUBE_INGEST_CLASS,
      ...this.project,
      definition: definition.path,
    });
  }

  private definitionOf(urn: string): IngestDefinition {
    const definition = this.definitions.find(
      (each) => this.urnOf(each) === urn,
    );
    if (!definition) {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        LEGEND_STUDIO_CUBE_MESSAGE.GONE(
          parseCubeIngestUrn(urn)?.definition ?? urn,
        ),
      );
    }
    return definition;
  }

  /**
   * The lakehouse runtime a run uses: the project's first, as Studio's own
   * queries of an ingest definition pick (`getCompatibleRuntimesFromAccessorOwner`)
   */
  get runtime(): PackageableRuntime | undefined {
    return this.editorStore.graphManagerState.usableRuntimes.find(
      (runtime) => runtime.runtimeValue instanceof LakehouseBaseRuntime,
    );
  }

  async resolveEnvironment(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<CubeIngestEnvironment> {
    const { runtime } = this;
    if (!runtime) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        LEGEND_STUDIO_CUBE_MESSAGE.NO_RUNTIME,
      );
    }
    const value = runtime.runtimeValue as LakehouseBaseRuntime;
    if (!value.environment) {
      throw new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        LEGEND_STUDIO_CUBE_MESSAGE.NO_ENVIRONMENT(runtime.path),
      );
    }
    return new CubeIngestEnvironment({
      environmentType,
      name: `${value.environment}, from ${runtime.path}`,
      runtimeEnvironment: value.environment,
      warehouse:
        value instanceof LakehouseRuntime ? value.warehouse : undefined,
    });
  }

  async getRuntimeEnvironment(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<string> {
    return (await this.resolveEnvironment(environmentType)).runtimeEnvironment;
  }

  /** The app directory deployments of the project's definitions */
  async listProducers(): Promise<readonly CubeIngestProducer[]> {
    return [...new Set(this.definitions.map(deploymentIdOf))].map(
      (deploymentId) =>
        new CubeIngestProducer({
          deploymentId,
          urn: `${this.project.groupId}:${this.project.artifactId}:${deploymentId}`,
        }),
    );
  }

  async listDefinitions(
    environmentType: CubeDataProductEnvironmentType,
    producerDeploymentId: string,
  ): Promise<CubeIngestDefinitionList> {
    return {
      candidates: this.definitions
        .filter((each) => deploymentIdOf(each) === producerDeploymentId)
        .map(
          (each) =>
            new CubeIngestDefinitionCandidate({
              urn: this.urnOf(each),
              definition: each.path,
              ...this.project,
            }),
        ),
      droppedCount: 0,
    };
  }

  /** The definition's element, as the workspace holds it now */
  async getDefinitionElement(urn: string): Promise<PlainObject> {
    return this.editorStore.graphManagerState.graphManager.elementToEntity(
      this.definitionOf(urn),
      { pruneSourceInformation: true },
    ).content;
  }

  async describe(urn: string): Promise<readonly CubeIngestDataSet[]> {
    const element = await this.getDefinitionElement(urn);
    try {
      return readCubeIngestDataSets(element);
    } catch {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        LEGEND_STUDIO_CUBE_MESSAGE.UNREADABLE(this.definitionOf(urn).path),
      );
    }
  }

  async resolveSchemas(
    environmentType: CubeDataProductEnvironmentType,
    sources: ReadonlyMap<NodeId, CubeIngestDataSetLocation>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const described = new Map<
      string,
      readonly CubeIngestDataSet[] | CubeEngineError
    >();
    for (const { ingestDefinitionUrn } of sources.values()) {
      if (!described.has(ingestDefinitionUrn)) {
        try {
          described.set(
            ingestDefinitionUrn,
            await this.describe(ingestDefinitionUrn),
          );
        } catch (error) {
          described.set(
            ingestDefinitionUrn,
            error instanceof CubeEngineError
              ? error
              : new CubeEngineError(
                  CubeEngineErrorKind.COMPILE,
                  error instanceof Error ? error.message : String(error),
                ),
          );
        }
      }
    }
    return new Map(
      [...sources].map(([nodeId, source]) => {
        const read = described.get(source.ingestDefinitionUrn);
        if (read instanceof CubeEngineError || read === undefined) {
          return [
            nodeId,
            new CubeEngineError(
              read?.kind ?? CubeEngineErrorKind.COMPILE,
              read?.detail ??
                LEGEND_STUDIO_CUBE_MESSAGE.GONE(source.ingestDefinition),
              nodeId,
            ),
          ];
        }
        const dataSet = read.find((each) => each.name === source.dataSet);
        return [
          nodeId,
          dataSet?.schema && dataSet.isPickable
            ? dataSet.schema
            : new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                dataSet?.disabledReason ??
                  LEGEND_STUDIO_CUBE_MESSAGE.NO_DATA_SET(
                    source.dataSet,
                    source.ingestDefinition,
                  ),
                nodeId,
              ),
        ];
      }),
    );
  }
}
