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
  type V1_Lambda,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
  type V1_ValueSpecification,
  TDSExecutionResult,
  V1_serializeExecutionResult,
  V1_buildExecutionResult,
} from '@finos/legend-graph';
import type { REPLServerClient } from '../../server/REPLServerClient.js';
import {
  DataCubeGetBaseQueryResult,
  type DataCubeInfrastructureInfo,
  type CompletionItem,
} from '../../server/REPLEngine.js';
import { guaranteeType } from '@finos/legend-shared';
import type { LegendREPLApplicationStore } from '../LegendREPLBaseStore.js';
import type { REPLStore } from '../REPLStore.js';
import { action, makeObservable, observable } from 'mobx';

export class DataCubeEngine {
  readonly replStore: REPLStore;
  readonly application: LegendREPLApplicationStore;
  private readonly client: REPLServerClient;

  enableDebugMode = true;
  gridClientRowBuffer = 50;
  gridClientPurgeClosedRowNodes = false;

  constructor(replStore: REPLStore) {
    makeObservable(this, {
      enableDebugMode: observable,
      setEnableDebugMode: action,

      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      gridClientPurgeClosedRowNodes: observable,
      setGridClientPurgeClosedRowNodes: action,
    });

    this.replStore = replStore;
    this.application = replStore.application;
    this.client = replStore.client;
  }

  setEnableDebugMode(enableDebugMode: boolean): void {
    this.enableDebugMode = enableDebugMode;
    this.applyChanges();
  }

  setGridClientRowBuffer(rowBuffer: number): void {
    this.gridClientRowBuffer = rowBuffer;
    this.applyChanges();
  }

  setGridClientPurgeClosedRowNodes(purgeClosedRowNodes: boolean): void {
    this.gridClientPurgeClosedRowNodes = purgeClosedRowNodes;
    this.applyChanges();
  }

  private applyChanges(): void {
    // When we support multi-view (i.e. multiple instances of DataCubes) we would need to traverse
    // through and update the configurations of all of their grid clients
    this.replStore.dataCube.grid.client.updateGridOptions({
      rowBuffer: this.gridClientRowBuffer,
      purgeClosedRowNodes: this.gridClientPurgeClosedRowNodes,
    });
  }

  async getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo> {
    return this.client.getInfrastructureInfo();
  }

  async getQueryTypeahead(
    code: string,
    isPartial?: boolean,
  ): Promise<CompletionItem[]> {
    return (await this.client.getQueryTypeahead({
      code,
      isPartial,
    })) as CompletionItem[];
  }

  async parseQuery(
    code: string,
    returnSourceInformation?: boolean,
  ): Promise<V1_ValueSpecification> {
    return V1_deserializeValueSpecification(
      await this.client.parseQuery({ code, returnSourceInformation }),
      [],
    );
  }

  async getBaseQuery(): Promise<DataCubeGetBaseQueryResult> {
    return DataCubeGetBaseQueryResult.serialization.fromJson(
      await this.client.getBaseQuery(),
    );
  }

  async executeQuery(
    query: V1_Lambda,
  ): Promise<{ result: TDSExecutionResult; executedSQL: string }> {
    const result = await this.client.executeQuery({
      query: V1_serializeValueSpecification(query, []),
      debug: this.enableDebugMode,
    });
    return {
      result: guaranteeType(
        V1_buildExecutionResult(
          V1_serializeExecutionResult(JSON.parse(result.result)),
        ),
        TDSExecutionResult,
      ),
      executedSQL: result.executedSQL,
    };
  }
}
