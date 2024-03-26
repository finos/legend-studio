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

import type { LegendREPLGridClientApplicationStore } from './LegendREPLGridClientBaseStore.js';
import { REPLServerClient } from '../server/REPLServerClient.js';
import {
  NetworkClient,
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { TDSRequest } from '../components/grid/TDSRequest.js';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import { REPLGridServerResult } from '../components/grid/REPLGridServerResult.js';
import { LEGEND_REPL_EVENT } from '../Const.js';
import { REPLGridState } from './REPLGridState.js';
import { buildLambdaExpressions } from '../components/grid/TDSLambdaBuilder.js';
import {
  type V1_TDSExecutionResult,
  TDSExecutionResult,
  V1_Lambda,
  V1_buildExecutionResult,
  V1_deserializeValueSpecification,
  V1_serializeExecutionResult,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';

export class REPLGridClientStore {
  readonly applicationStore: LegendREPLGridClientApplicationStore;
  readonly client: REPLServerClient;
  replGridState!: REPLGridState;

  constructor(applicationStore: LegendREPLGridClientApplicationStore) {
    makeObservable(this, {
      replGridState: observable,
      getREPLGridServerResult: flow,
      getInitialQueryLambda: flow,
      getInitialREPLGridServerResult: flow,
      getLicenseKey: flow,
    });
    this.applicationStore = applicationStore;
    this.client = new REPLServerClient(
      new NetworkClient({
        baseUrl: this.applicationStore.config.useDynamicREPLServer
          ? window.location.origin
          : this.applicationStore.config.replUrl,
      }),
    );
    this.replGridState = new REPLGridState();
  }

  *getREPLGridServerResult(tdsRequest: TDSRequest): GeneratorFn<void> {
    try {
      const isSubQuery = tdsRequest.groupBy.groupKeys.length !== 0;
      const lambda = buildLambdaExpressions(
        guaranteeNonNullable(this.replGridState.initialQueryLambda?.body[0]),
        tdsRequest,
      );
      const resultObj = (yield flowResult(
        this.client.getREPLGridServerResult(
          V1_serializeValueSpecification(lambda, []),
        ),
      )) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResult = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      this.replGridState.setCurrentResult(
        guaranteeType(
          V1_buildExecutionResult(V1_serializeExecutionResult(tdsResult)),
          TDSExecutionResult,
        ),
      );
      if (isSubQuery) {
        this.replGridState.setCurrentSubQuery(replGridResult.currentQuery);
      } else {
        this.replGridState.setCurrentQuery(replGridResult.currentQuery);
        this.replGridState.setCurrentSubQuery(undefined);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *getInitialQueryLambda(): GeneratorFn<void> {
    const lambdaObj =
      (yield this.client.getIntialQueryLambda()) as PlainObject<V1_Lambda>;
    const lambda = V1_deserializeValueSpecification(lambdaObj, []);
    if (lambda instanceof V1_Lambda) {
      this.replGridState.setInitialQueryLambda(lambda);
    }
  }

  *getInitialREPLGridServerResult(): GeneratorFn<void> {
    try {
      if (!this.replGridState.licenseKey) {
        yield flowResult(this.getLicenseKey());
      }
      if (!this.replGridState.initialQueryLambda) {
        yield flowResult(this.getInitialQueryLambda());
      }
      const resultObj =
        (yield this.client.getInitialREPLGridServerResult()) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResultObj = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      const tdsResult = guaranteeType(
        V1_buildExecutionResult(V1_serializeExecutionResult(tdsResultObj)),
        TDSExecutionResult,
      );
      this.replGridState.setInitialResult(tdsResult);
      this.replGridState.setCurrentQuery(replGridResult.currentQuery);
      this.replGridState.setCurrentSubQuery(undefined);
      this.replGridState.setColumns(tdsResult.result.columns);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *getLicenseKey(): GeneratorFn<void> {
    const licenseKey = (yield this.client.getLicenseKey()) as string;
    this.replGridState.setLicenseKey(licenseKey);
  }
}
