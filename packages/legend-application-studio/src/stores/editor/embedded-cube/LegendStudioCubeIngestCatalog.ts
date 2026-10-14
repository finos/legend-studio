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
import type { IngestDefinition } from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';
import type { LegendStudioCubeWorkspace } from './LegendStudioCubeWorkspace.js';

// Legend Cube in Studio: a cube reads the ingest definitions of the project
// being edited, as the workspace holds them, and runs on the project's
// lakehouse runtime, as Studio's own queries of an ingest definition do. The
// Ingest tab lists every definition of the project, under one producer that
// stands for the project, each named by the URN it would have if this
// project deployed it.

/** The one class a Studio cube reads the project's definitions as, so the Ingest tab offers no other */
const STUDIO_CUBE_INGEST_CLASS = CubeDataProductEnvironmentType.PRODUCTION;

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
  readonly environmentTypes = [STUDIO_CUBE_INGEST_CLASS];
  readonly editorStore: EditorStore;
  readonly workspace: LegendStudioCubeWorkspace;

  constructor(editorStore: EditorStore, workspace: LegendStudioCubeWorkspace) {
    this.editorStore = editorStore;
    this.workspace = workspace;
  }

  /** The project's own definitions, not its dependencies' */
  private get definitions(): IngestDefinition[] {
    return this.editorStore.graphManagerState.graph.ownIngests;
  }

  /** The URN a cube names the project's definition by */
  urnOf(definition: IngestDefinition): string {
    return formatCubeIngestUrn({
      environmentType: STUDIO_CUBE_INGEST_CLASS,
      ...this.workspace.project,
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

  /** The project's lakehouse runtime, which a run names, with its warehouse */
  async resolveEnvironment(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<CubeIngestEnvironment> {
    const runtime = await this.workspace.resolveRuntime();
    return new CubeIngestEnvironment({
      environmentType,
      name: runtime.label,
      runtimeEnvironment: runtime.environment,
      warehouse: runtime.warehouse,
    });
  }

  async getRuntimeEnvironment(): Promise<string> {
    return (await this.workspace.resolveRuntime()).environment;
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

  /** Every definition of the project, whatever its app directory deployment */
  async listDefinitions(): Promise<CubeIngestDefinitionList> {
    return {
      candidates: this.definitions.map(
        (each) =>
          new CubeIngestDefinitionCandidate({
            urn: this.urnOf(each),
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
