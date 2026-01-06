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
  ActionState,
  LogEvent,
  csvStringify,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import { observable, makeObservable, flow, computed, reaction } from 'mobx';
import type {
  CommandRegistrar,
  GenericLegendApplicationStore,
} from '@finos/legend-application';
import { AbstractSQLPlaygroundState } from '@finos/legend-lego/sql-playground';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  GRAPH_MANAGER_EVENT,
  TDSExecutionResult,
  V1_buildExecutionResult,
  V1_deserializeExecutionResult,
  V1_ExecuteInput,
  type V1_ExecutionResult,
} from '@finos/legend-graph';
import { createExecuteInput } from '../../utils/QueryExecutionUtils.js';
import type { DataProductAccessPointState } from './DataProductAccessPointState.js';
import type { DataProductDataAccessState } from './DataProductDataAccessState.js';
import { getIngestDeploymentServerConfigName } from '@finos/legend-server-lakehouse';

const DEFAULT_SQL_TEXT = `--Start building your SQL.`;

export interface SQL_ExecutionResult {
  value: string;
  sqlDuration: number;
}

export class DataProductSqlPlaygroundPanelState
  extends AbstractSQLPlaygroundState
  implements CommandRegistrar
{
  readonly dataProductViewerState: DataProductViewerState;
  isFetchingSchema = ActionState.create();
  applicationStore: GenericLegendApplicationStore;
  dataAccessState: DataProductDataAccessState | undefined;
  accessPointState: DataProductAccessPointState | undefined;

  constructor(dataProductViewerState: DataProductViewerState) {
    super();
    makeObservable(this, {
      isFetchingSchema: observable,
      dataAccessState: observable,
      accessPointState: observable,
      query: computed,
      executeRawSQL: flow,
      init: flow,
    });
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = this.dataProductViewerState.applicationStore;
    reaction(
      () => this.query,
      (query) => {
        if (query) {
          this.sqlText = `${DEFAULT_SQL_TEXT}\n${query}`;
          this.sqlEditorTextModel.setValue(this.sqlText);
        }
      },
    );
  }

  *init(
    dataAccessState: DataProductDataAccessState,
    accessPointState: DataProductAccessPointState,
  ): GeneratorFn<void> {
    this.dataAccessState = dataAccessState;
    this.accessPointState = accessPointState;
  }

  get query(): string | undefined {
    if (
      !this.accessPointState ||
      !this.dataProductViewerState.dataProductArtifact?.dataProduct.path
    ) {
      return undefined;
    }
    return `SELECT * FROM p('${this.dataProductViewerState.dataProductArtifact.dataProduct.path}.${this.accessPointState.accessPoint.id}') LIMIT 100`;
  }
  override registerCommands(): void {}
  override deregisterCommands(): void {}

  override *executeRawSQL(): GeneratorFn<void> {
    if (this.executeRawSQLState.isInProgress) {
      return;
    }
    try {
      this.executeRawSQLState.inProgress();
      let sql = this.sqlText;
      const currentSelection = this.sqlEditor?.getSelection();
      if (currentSelection) {
        const selectionValue =
          this.sqlEditorTextModel.getValueInRange(currentSelection);
        if (selectionValue.trim() !== '') {
          sql = selectionValue;
        }
      }
      try {
        const sqlQuery = `#SQL{${sql}}#`;
        const start = Date.now();
        const executionInput = (yield createExecuteInput(
          guaranteeNonNullable(
            this.dataAccessState?.resolvedUserEnv
              ? getIngestDeploymentServerConfigName(
                  this.dataAccessState.resolvedUserEnv,
                )
              : '',
          ),
          sqlQuery,
          this.dataProductViewerState,
          guaranteeNonNullable(
            this.accessPointState?.entitlementsDataProductDetails,
          ),
        )) as V1_ExecuteInput;
        const result = V1_buildExecutionResult(
          V1_deserializeExecutionResult(
            (yield this.dataProductViewerState.engineServerClient.runQuery(
              V1_ExecuteInput.serialization.toJson(executionInput),
            )) as PlainObject<V1_ExecutionResult>,
          ),
        ) as TDSExecutionResult;
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
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Error executing query: ${error}`,
      );
      assertErrorThrown(error);
    } finally {
      this.executeRawSQLState.complete();
    }
  }
}
