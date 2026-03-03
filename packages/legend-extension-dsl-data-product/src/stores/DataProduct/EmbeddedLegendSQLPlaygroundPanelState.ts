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
  LogEvent,
  csvStringify,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import { makeObservable, flow, flowResult, computed, reaction } from 'mobx';
import {
  LegendSQLPlaygroundState,
  DEFAULT_SQL_TEXT,
  buildDefaultDataProductQuery,
} from '@finos/legend-query-builder';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  GRAPH_MANAGER_EVENT,
  TDSExecutionResult,
  V1_buildExecutionResult,
  V1_deserializeExecutionResult,
  V1_ExecuteInput,
  V1_SdlcDeploymentDataProductOrigin,
  type V1_ExecutionResult,
  V1_DataProductArtifact,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  type V1_EntitlementsDataProductDetails,
} from '@finos/legend-graph';
import { createExecuteInput } from '../../utils/QueryExecutionUtils.js';
import {
  getIngestDeploymentServerConfigName,
  type IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import { type Entity, StoredFileGeneration } from '@finos/legend-storage';
import { resolveVersion, StoreProjectData } from '@finos/legend-server-depot';

export class EmbeddedLegendSQLPlaygroundPanelState extends LegendSQLPlaygroundState {
  readonly dataProductViewerState: DataProductViewerState;
  readonly dataProductDetails:
    | V1_EntitlementsDataProductDetails
    | null
    | undefined;
  readonly getResolvedUserEnv: () => IngestDeploymentServerConfig | undefined;
  readonly accessPointId: string;

  constructor(
    dataProductViewerState: DataProductViewerState,
    dataProductDetails: V1_EntitlementsDataProductDetails | undefined,
    getResolvedUserEnv: () => IngestDeploymentServerConfig | undefined,
    accessPointId: string,
  ) {
    super();
    makeObservable(this, {
      query: computed,
      executeRawSQL: flow,
      initializeAccessorExplorer: flow,
    });
    this.dataProductViewerState = dataProductViewerState;
    this.dataProductDetails = dataProductDetails;
    this.getResolvedUserEnv = getResolvedUserEnv;
    this.accessPointId = accessPointId;
    reaction(
      () => this.query,
      (query) => {
        if (query) {
          this.setSQLQuery(`${DEFAULT_SQL_TEXT}${query}`);
        }
      },
    );
  }

  *initializeAccessorExplorer(): GeneratorFn<void> {
    if (this.accessorExplorerState) {
      return;
    }
    try {
      const dataProductDetails = this.dataProductDetails;
      const entities =
        dataProductDetails?.origin instanceof V1_SdlcDeploymentDataProductOrigin
          ? ((yield this.dataProductViewerState.depotServerClient.getVersionEntities(
              dataProductDetails.origin.group,
              dataProductDetails.origin.artifact,
              dataProductDetails.origin.version,
            )) as Entity[])
          : [];

      yield flowResult(
        this.initializeExplorer(
          entities,
          this.dataProductViewerState.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
          (path) => this.fetchDataProductArtifact(path),
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.dataProductViewerState.applicationStore.notificationService.notifyError(
        `Error initializing explorer: ${error}`,
      );
    }
  }

  private async fetchDataProductArtifact(
    dataProductPath: string,
  ): Promise<V1_DataProductArtifact | undefined> {
    const dataOrigin = this.dataProductDetails?.origin;
    if (
      !(dataOrigin instanceof V1_SdlcDeploymentDataProductOrigin) ||
      !this.dataProductViewerState.projectGAV
    ) {
      return undefined;
    }

    try {
      const storeProject = new StoreProjectData();
      storeProject.groupId = this.dataProductViewerState.projectGAV.groupId;
      storeProject.artifactId =
        this.dataProductViewerState.projectGAV.artifactId;

      const files = (
        await this.dataProductViewerState.depotServerClient.getGenerationFilesByType(
          storeProject,
          resolveVersion(this.dataProductViewerState.projectGAV.versionId),
          V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
        )
      ).map((rawFile) => StoredFileGeneration.serialization.fromJson(rawFile));

      const fileGen = files.find((e) => e.path === dataProductPath)?.file
        .content;
      if (fileGen) {
        const content: PlainObject = JSON.parse(fileGen) as PlainObject;
        return V1_DataProductArtifact.serialization.fromJson(content);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.dataProductViewerState.applicationStore.notificationService.notifyError(
        `Error fetching data product artifact for ${dataProductPath}: ${error.message}`,
      );
    }
    return undefined;
  }

  get query(): string | undefined {
    const dataProductPath =
      this.dataProductViewerState.dataProductArtifact?.dataProduct.path;
    if (!dataProductPath) {
      return undefined;
    }
    return buildDefaultDataProductQuery(dataProductPath, this.accessPointId);
  }

  override *executeRawSQL(): GeneratorFn<void> {
    if (this.executeRawSQLState.isInProgress) {
      return;
    }
    try {
      this.executeRawSQLState.inProgress();
      const sql = this.getSelectedSQL();
      const sqlQuery = `#SQL{${sql}}#`;
      const start = Date.now();
      const resolvedUserEnv = this.getResolvedUserEnv();
      const executionInput = (yield createExecuteInput(
        guaranteeNonNullable(
          resolvedUserEnv
            ? getIngestDeploymentServerConfigName(resolvedUserEnv)
            : '',
        ),
        sqlQuery,
        this.dataProductViewerState,
        guaranteeNonNullable(this.dataProductDetails),
      )) as V1_ExecuteInput;
      const result = V1_buildExecutionResult(
        V1_deserializeExecutionResult(
          (yield this.dataProductViewerState.engineServerClient.runQuery(
            V1_ExecuteInput.serialization.toJson(executionInput),
          )) as PlainObject<V1_ExecutionResult>,
        ),
      );
      if (result instanceof TDSExecutionResult) {
        const data = result.result.rows.map((row) => row.values);
        const csvData = csvStringify([result.result.columns, ...data]);
        this.setSqlExecutionResult({
          value: csvData,
          sqlDuration: Date.now() - start,
        });
      }
    } catch (error) {
      assertErrorThrown(error);
      this.dataProductViewerState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.dataProductViewerState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.executeRawSQLState.complete();
    }
  }
}
