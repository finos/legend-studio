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
  type CompletionItem,
} from '../../server/models/DataCubeEngineModels.js';
import { guaranteeType } from '@finos/legend-shared';
import type { LegendREPLApplicationStore } from '../LegendREPLBaseStore.js';
import type { REPLStore } from '../REPLStore.js';
import { action, makeObservable, observable } from 'mobx';

class DataCubeEngine {
  private readonly client: REPLServerClient;

  constructor(client: REPLServerClient) {
    this.client = client;
  }

  async getGridClientLicenseKey(): Promise<string> {
    return this.client.getGridClientLicenseKey();
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

  async executeQuery(query: V1_Lambda): Promise<TDSExecutionResult> {
    const result = await this.client.executeQuery({
      query: V1_serializeValueSpecification(query, []),
    });
    return guaranteeType(
      V1_buildExecutionResult(
        V1_serializeExecutionResult(JSON.parse(result.result)),
      ),
      TDSExecutionResult,
    );
  }
}

/**
 * Infrastructure for data cube, can be shared across multiple data cube states
 */
export class DataCubeInfrastructure {
  readonly replStore: REPLStore;
  readonly application: LegendREPLApplicationStore;
  readonly engine: DataCubeEngine;

  gridClientRowBuffer = 50;
  enableDebugMode = false;

  constructor(replStore: REPLStore) {
    makeObservable(this, {
      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      enableDebugMode: observable,
      setEnableDebugMode: action,
    });

    this.replStore = replStore;
    this.application = replStore.applicationStore;
    this.engine = new DataCubeEngine(replStore.client);
  }

  setGridClientRowBuffer(rowBuffer: number): void {
    this.gridClientRowBuffer = rowBuffer;
  }

  setEnableDebugMode(enableDebugMode: boolean): void {
    this.enableDebugMode = enableDebugMode;
  }
}
