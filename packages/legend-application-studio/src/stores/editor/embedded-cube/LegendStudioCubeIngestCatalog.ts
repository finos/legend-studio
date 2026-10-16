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
  type CubeIngestEnvironmentKey,
  type NodeId,
} from '@finos/legend-cube-builder';
import type { IngestDefinition } from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';
import type { LegendStudioCubeWorkspace } from './LegendStudioCubeWorkspace.js';

// Legend Cube in Studio: a cube reads the ingest definitions of the project
// being edited, as the workspace holds them, and runs in the lakehouse
// environment of the class the viewer picks (Mode), production or
// production parallel (`LegendStudioCubeWorkspace`). The Ingest tab lists
// every definition of the project, under one producer that stands for the
// project, each named by the URN it would have if this project deployed it
// in that class.

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

/** The DIDs an ingest definition's owner names, as its content holds them */
const ownerDeploymentsOf = (
  definition: IngestDefinition,
): { production: boolean; prodParallel: boolean } => {
  const owner = (definition.content as { owner?: unknown }).owner;
  const has = (key: string): boolean =>
    typeof owner === 'object' &&
    owner !== null &&
    (owner as Record<string, unknown>)[key] !== undefined &&
    (owner as Record<string, unknown>)[key] !== null;
  return { production: has('production'), prodParallel: has('prodParallel') };
};

/**
 * The classes a Studio cube's runs read, the default first: production
 * parallel, as the workspace isn't released, unless the definition Cube
 * was opened from names only a production DID (user, 2026-10-16)
 */
export const getLegendStudioCubeIngestClasses = (
  opened: IngestDefinition | undefined,
): CubeDataProductEnvironmentType[] => {
  const owner = opened ? ownerDeploymentsOf(opened) : undefined;
  return owner?.production && !owner.prodParallel
    ? [PRODUCTION, PRODUCTION_PARALLEL]
    : [PRODUCTION_PARALLEL, PRODUCTION];
};

/** The one producer deployment the tab lists: the project itself, whatever its definitions' deployments */
export const LEGEND_STUDIO_CUBE_PROJECT_PRODUCER = '0';

export const LEGEND_STUDIO_CUBE_MESSAGE = {
  GONE: (definition: string): string =>
    `The project has no ingest definition ${definition} any more.`,
  UNREADABLE: (definition: string): string =>
    `Cube can't read the data sets of ingest definition ${definition}.`,
  NO_DATA_SET: (dataSet: string, definition: string): string =>
    `Ingest definition ${definition} has no data set "${dataSet}".`,
};

/**
 * The project's own ingest definitions, for the Ingest tab and for the
 * engine, which types and runs on them as the workspace holds them now
 */
export class LegendStudioCubeIngestCatalog
  implements CubeIngestCatalog, CubeIngestDefinitionSource
{
  readonly environmentTypes: readonly CubeDataProductEnvironmentType[];
  readonly editorStore: EditorStore;
  readonly workspace: LegendStudioCubeWorkspace;

  constructor(
    editorStore: EditorStore,
    workspace: LegendStudioCubeWorkspace,
    /** The definition Cube was opened from, whose owner sets the default class */
    opened?: IngestDefinition,
  ) {
    this.editorStore = editorStore;
    this.workspace = workspace;
    this.environmentTypes = getLegendStudioCubeIngestClasses(opened);
  }

  /** The project's own definitions, not its dependencies' */
  private get definitions(): IngestDefinition[] {
    return this.editorStore.graphManagerState.graph.ownIngests;
  }

  /** The URN a cube of a class names the project's definition by */
  urnOf(
    definition: IngestDefinition,
    environmentType: CubeDataProductEnvironmentType = PRODUCTION,
  ): string {
    return formatCubeIngestUrn({
      environmentType,
      ...this.workspace.project,
      definition: definition.path,
    });
  }

  /** The project's definition a URN of either class names */
  private definitionOf(urn: string): IngestDefinition {
    const path = parseCubeIngestUrn(urn)?.definition;
    const definition = this.definitions.find((each) => each.path === path);
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

  /** The environment of each class, as a run of it reads */
  async listEnvironments(): Promise<readonly CubeIngestEnvironment[]> {
    return Promise.all(
      this.environmentTypes.map((environmentType) =>
        this.resolveEnvironment({ environmentType }),
      ),
    );
  }

  /** The environment a run of the class names, with the project runtime's warehouse; a name given is not read */
  async resolveEnvironment(
    environment: CubeIngestEnvironmentKey,
  ): Promise<CubeIngestEnvironment> {
    const runtime = await this.workspace.resolveRuntime(
      environment.environmentType,
    );
    return new CubeIngestEnvironment({
      environmentType: environment.environmentType,
      name: runtime.label,
      runtimeEnvironment: runtime.environment,
      warehouse: runtime.warehouse,
    });
  }

  async getRuntimeEnvironment(
    environment: CubeIngestEnvironmentKey,
  ): Promise<string> {
    return (await this.workspace.resolveRuntime(environment.environmentType))
      .environment;
  }

  /** One producer, the project, so the tab lists every definition at once */
  async listProducers(): Promise<readonly CubeIngestProducer[]> {
    const { groupId, artifactId } = this.workspace.project;
    return [
      new CubeIngestProducer({
        deploymentId: LEGEND_STUDIO_CUBE_PROJECT_PRODUCER,
        urn: `${groupId}:${artifactId}`,
      }),
    ];
  }

  /** Every definition of the project, whatever its app directory deployment, named by its URN in the class */
  async listDefinitions(
    environment: CubeIngestEnvironmentKey,
  ): Promise<CubeIngestDefinitionList> {
    return {
      candidates: this.definitions.map(
        (each) =>
          new CubeIngestDefinitionCandidate({
            urn: this.urnOf(each, environment.environmentType),
            definition: each.path,
            ...this.workspace.project,
          }),
      ),
      droppedCount: 0,
    };
  }

  /** The workspace's elements, which a typing's or a run's model holds */
  getModelElements(): Promise<readonly PlainObject[]> {
    return this.workspace.getModelElements();
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
    environment: CubeIngestEnvironmentKey,
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
