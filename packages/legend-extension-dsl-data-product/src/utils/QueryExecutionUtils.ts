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
  PureClientVersion,
  V1_deserializeRawValueSpecification,
  type V1_EntitlementsDataProductDetails,
  V1_ExecuteInput,
  V1_LakehouseRuntime,
  V1_PackageableRuntime,
  V1_PureModelContextCombination,
  V1_PureModelContextData,
  V1_RawBaseExecutionContext,
  type V1_RawLambda,
} from '@finos/legend-graph';
import type { DataProductViewerState } from '../stores/DataProduct/DataProductViewerState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const createExecuteInput = async (
  resolvedUserEnv: string,
  query: string,
  dataProductViewerState: DataProductViewerState,
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
): Promise<V1_ExecuteInput> => {
  const runtime = new V1_LakehouseRuntime();
  runtime.warehouse = `LAKEHOUSE_CONSUMER_DEFAULT_WH`;
  runtime.environment = resolvedUserEnv;

  const packageableRuntime = new V1_PackageableRuntime();
  packageableRuntime.runtimeValue = runtime;
  packageableRuntime.name = 'INTERNAL_RUNTIME';
  packageableRuntime.package = '_internal_runtime_package';
  const queryToExecute = `${query}->from(${packageableRuntime.path})`;
  const model = guaranteeNonNullable(
    dataProductViewerState.getAccessPointModel(
      dataProductViewerState.projectGAV,
      entitlementsDataProductDetails.origin,
    ),
  );
  const data = new V1_PureModelContextData();
  data.elements.push(packageableRuntime);
  const contextModel = new V1_PureModelContextCombination([model, data]);

  const rawLambda = V1_deserializeRawValueSpecification(
    await dataProductViewerState.engineServerClient.grammarToJSON_lambda(
      queryToExecute,
    ),
  ) as V1_RawLambda;
  const executionInput = new V1_ExecuteInput();
  executionInput.model = contextModel;
  executionInput.function = rawLambda;
  executionInput.clientVersion = PureClientVersion.VX_X_X;
  executionInput.context = new V1_RawBaseExecutionContext();
  return executionInput;
};
