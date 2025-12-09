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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { observable, makeObservable, flow } from 'mobx';
import type {
  CommandRegistrar,
  GenericLegendApplicationStore,
} from '@finos/legend-application';
import { AbstractSQLPlaygroundState } from '@finos/legend-lego/sql-playground';
import type { DataProductViewerState } from './DataProductViewerState.js';

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

  constructor(dataProductViewerState: DataProductViewerState) {
    super();
    makeObservable(this, {
      isFetchingSchema: observable,
      executeRawSQL: flow,
    });
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = this.dataProductViewerState.applicationStore;
  }
  override registerCommands(): void {}
  override deregisterCommands(): void {}

  override *executeRawSQL(): GeneratorFn<void> {
    try {
      throw new UnsupportedOperationError(
        `Sql query execution is not supported.`,
      );
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
