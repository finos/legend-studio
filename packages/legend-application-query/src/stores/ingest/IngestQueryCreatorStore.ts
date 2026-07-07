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
  type GeneratorFn,
  assertErrorThrown,
  guaranteeType,
  LogEvent,
  StopWatch,
  uuid,
} from '@finos/legend-shared';
import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  type Entity,
  extractEntityNameFromPath,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  type QueryBuilderState,
  QueryBuilderDataBrowserWorkflow,
} from '@finos/legend-query-builder';
import {
  type Query,
  type RawLambda,
  GRAPH_MANAGER_EVENT,
  IngestDefinition,
} from '@finos/legend-graph';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  QueryEditorStore,
  type QueryPersistConfiguration,
  QueryBuilderActionConfig_QueryApplication,
} from '../QueryEditorStore.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';
import { IngestLegendQueryBuilderState } from './IngestLegendQueryBuilderState.js';
import {
  fetchIngestEntitiesByClassifier,
  swapIngestInGraph,
} from './IngestQueryGraphHelper.js';

/**
 * Creator store backing the `INGEST_QUERY` route.
 *
 * Unlike the data-product creator (which builds a full graph to back the
 * editor's element browsing), the ingest flow only needs the single ingest
 * definition entity. We therefore override {@link QueryEditorStore.buildGraph}
 * to fetch JUST that entity from Depot and build a minimal graph containing
 * it — no dependency resolution, no full project entity fetch.
 */
export class IngestQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly ingestDefinitionPath: string;
  readonly dataSet: string;

  /**
   * All ingest definition entities for this project version, keyed by path.
   * Populated up front by {@link buildGraph} so the source dropdown can list
   * every ingest without forcing us to build them all into the graph. The
   * entity payloads are kept so {@link swapIngestDefinition} can build a
   * different one on demand.
   */
  private _ingestEntitiesByPath = new Map<string, Entity>();

  declare queryBuilderState: IngestLegendQueryBuilderState | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    ingestDefinitionPath: string,
    dataSet: string,
  ) {
    super(applicationStore, depotServerClient);
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.ingestDefinitionPath = ingestDefinitionPath;
    this.dataSet = dataSet;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  /**
   * Fetch every ingest definition entity in the project (so the source
   * dropdown can show them all) but only build the requested one into the
   * graph. The remaining entity payloads are cached on
   * {@link _ingestEntitiesByPath} and built on demand when the user swaps
   * ingests via {@link swapIngestDefinition}.
   *
   * TODO: revisit once `IngestDefinition` is properly modelled. Today the
   * entity is self-contained, but materialized views can reference other
   * elements (mappings, classes, runtimes, etc.) — at that point we'll need
   * to either fetch those dependent entities too, or fall back to a full
   * project build like the data-product creator does.
   */
  override *buildGraph(): GeneratorFn<void> {
    const stopWatch = new StopWatch();

    yield this.graphManagerState.initializeSystem();
    stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH_SYSTEM__SUCCESS);

    this.initState.setMessage(`Fetching ingest definitions...`);
    this._ingestEntitiesByPath = (yield fetchIngestEntitiesByClassifier(
      this.depotServerClient,
      this.groupId,
      this.artifactId,
      this.versionId,
    )) as Map<string, Entity>;
    this.initState.setMessage(undefined);
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);

    const target = this._ingestEntitiesByPath.get(this.ingestDefinitionPath);
    if (!target) {
      throw new Error(
        `Can't find ingest definition '${this.ingestDefinitionPath}' in project ${this.groupId}:${this.artifactId}:${this.versionId}`,
      );
    }

    yield swapIngestInGraph(this.graphManagerState, target, {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    });
    stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);

    this.applicationStore.logService.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
    );
  }

  /**
   * Remove the currently built ingest from the graph and build the entity at
   * `path` in its place. Backs {@link IngestLegendQueryBuilderState.swapIngest}
   * — see that callsite for why we don't pre-build every ingest.
   */
  async swapIngestDefinition(path: string): Promise<IngestDefinition> {
    const entity = this._ingestEntitiesByPath.get(path);
    if (!entity) {
      throw new Error(
        `Can't find ingest definition '${path}' in project ${this.groupId}:${this.artifactId}:${this.versionId}`,
      );
    }
    return swapIngestInGraph(this.graphManagerState, entity, {
      currentPath: this.ingestDefinitionPath,
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    });
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const ingestDefinition = guaranteeType(
      this.graphManagerState.graph.getElement(this.ingestDefinitionPath),
      IngestDefinition,
      `Can't find ingest definition '${this.ingestDefinitionPath}'`,
    );

    const sourceInfo = {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };

    // Build an adhoc lakehouse runtime using the user's lakehouse env +
    // consumer warehouse — same machinery used by the data product flow for
    // model-access / lakehouse access points. Register it on the graph as an
    // `_internal_` element so the editor can resolve it.
    const adhocRuntime = await this.createLakehousePackageableRuntime(
      this.ingestDefinitionPath,
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
      },
    );
    this.graphManagerState.graph.addElement(adhocRuntime, '_internal_');

    const queryBuilderState = new IngestLegendQueryBuilderState(
      this.applicationStore,
      undefined,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      ingestDefinition,
      Array.from(this._ingestEntitiesByPath.keys()),
      (path) => this.swapIngestDefinition(path),
      adhocRuntime,
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
      },
      undefined,
      sourceInfo,
    );

    try {
      // Resolve the accessor for the requested data set on this ingest
      // definition. This drives the editor source panel + compatible runtimes.
      await queryBuilderState.changeAccessorOwner(ingestDefinition);
      await queryBuilderState.changeAccessor({ tableName: this.dataSet });
      // Select the adhoc lakehouse runtime so the editor can execute the
      // query without the user having to pick one from `compatibleRuntimes`.
      // Mirrors what `LegendQueryDataProductQueryBuilderState.prepareAccessForExecution`
      // does for model-access / lakehouse access points in the data product flow.
      queryBuilderState.changeSelectedRuntime(adhocRuntime);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
    }

    return queryBuilderState;
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    const queryBuilderState = this.queryBuilderState;
    const ingestPath =
      queryBuilderState?.ingestDefinition.path ?? this.ingestDefinitionPath;
    const dataSet = queryBuilderState?.dataSet ?? this.dataSet;
    const ingestName = extractEntityNameFromPath(ingestPath);
    return {
      defaultName: options?.update
        ? `${ingestName}[${dataSet}]`
        : `New Query for ${ingestName}[${dataSet}]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
      },
    };
  }
}
