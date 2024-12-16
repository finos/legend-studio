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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { DataAccessState } from '../data-access/DataAccessState.js';
import {
  type GraphManagerState,
  type RawLambda,
  RuntimePointer,
  buildRawLambdaFromLambdaFunction,
} from '@finos/legend-graph';
import {
  type LambdaParameterState,
  buildParametersLetLambdaFunc,
} from '../shared/LambdaParameterState.js';

export class QueryBuilderCheckEntitlementsState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;

  dataAccessState?: DataAccessState | undefined;
  showCheckEntitlementsViewer = false;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      showCheckEntitlementsViewer: observable,
      dataAccessState: observable,
      setShowCheckEntitlementsViewer: action,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setShowCheckEntitlementsViewer(val: boolean): void {
    this.showCheckEntitlementsViewer = val;

    this.dataAccessState = undefined;
    if (
      this.queryBuilderState.executionContextState.mapping &&
      this.queryBuilderState.executionContextState.runtimeValue instanceof
        RuntimePointer
    ) {
      this.dataAccessState = new DataAccessState(
        this.queryBuilderState.applicationStore,
        this.queryBuilderState.graphManagerState,
        {
          mapping: this.queryBuilderState.executionContextState.mapping.path,
          runtime:
            this.queryBuilderState.executionContextState.runtimeValue
              .packageableRuntime.value.path,
          getQuery: async () =>
            this.createExecutableQuery(
              this.queryBuilderState.buildQuery(),
              this.queryBuilderState.parametersState.parameterStates,
              this.queryBuilderState.graphManagerState,
            ),
          graphData: this.queryBuilderState.getGraphData(),
        },
      );
    }
  }

  createExecutableQuery(
    rawLambda: RawLambda,
    parameterStates: LambdaParameterState[],
    graphManagerState: GraphManagerState,
  ): RawLambda {
    if (parameterStates.length > 0) {
      const execLambdaFunction = buildParametersLetLambdaFunc(
        graphManagerState.graph,
        parameterStates,
      );
      const execQuery = buildRawLambdaFromLambdaFunction(
        execLambdaFunction,
        graphManagerState,
      );
      //reset Parameters
      if (Array.isArray(rawLambda.body) && Array.isArray(execQuery.body)) {
        execQuery.body = [
          ...(execQuery.body as object[]),
          ...(rawLambda.body as object[]),
        ];
        return execQuery;
      }
    }
    return rawLambda;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CHECK_ENTITLEMENTS_STATE,
      this.showCheckEntitlementsViewer,
    ]);
  }
}
