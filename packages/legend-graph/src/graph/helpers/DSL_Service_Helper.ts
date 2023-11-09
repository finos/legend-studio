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

import { uniq } from '@finos/legend-shared';
import {
  RuntimePointer,
  EngineRuntime,
  type IdentifiedConnection,
  type Runtime,
} from '../metamodel/pure/packageableElements/runtime/Runtime.js';
import type { Service } from '../metamodel/pure/packageableElements/service/Service.js';
import {
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
} from '../metamodel/pure/packageableElements/service/ServiceExecution.js';
import type { RawLambda } from '../metamodel/pure/rawValueSpecification/RawLambda.js';

export const getAllIdentifiedConnectionsFromRuntime = (
  runtime: Runtime,
): IdentifiedConnection[] => {
  const resolvedRuntimes: EngineRuntime[] = [];
  if (runtime instanceof RuntimePointer) {
    resolvedRuntimes.push(runtime.packageableRuntime.value.runtimeValue);
  } else if (runtime instanceof EngineRuntime) {
    resolvedRuntimes.push(runtime);
  }
  return resolvedRuntimes
    .flatMap((e) =>
      e.connections.map((connection) => connection.storeConnections),
    )
    .flat();
};

export const getAllIdentifiedServiceConnections = (
  service: Service,
): IdentifiedConnection[] => {
  const execution = service.execution;
  let runtimes: Runtime[] = [];
  if (execution instanceof PureSingleExecution && execution.runtime) {
    runtimes = [execution.runtime];
  } else if (execution instanceof PureMultiExecution) {
    runtimes = execution.executionParameters?.map((t) => t.runtime) ?? [];
  }
  return uniq(runtimes.flatMap(getAllIdentifiedConnectionsFromRuntime));
};

export const resolveServiceQueryRawLambda = (
  service: Service,
): RawLambda | undefined => {
  const execution = service.execution;
  if (execution instanceof PureExecution) {
    return execution.func;
  }
  return undefined;
};
