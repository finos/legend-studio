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
  type BasicModel,
  type PureModel,
  type GraphManagerState,
  ConcreteFunctionDefinition,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  RawLambda,
  RuntimePointer,
  Service,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type DataSpaceExecutable,
  type DataSpaceExecutionContext,
  DataSpace,
  DataSpaceExecutableTemplate,
  DataSpacePackageableElementExecutable,
} from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export const getDataSpace = (path: string, graph: PureModel): DataSpace =>
  graph.getExtensionElement(
    path,
    DataSpace,
    `Can't find data product '${path}'`,
  );

export const getOwnDataSpace = (path: string, graph: BasicModel): DataSpace =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, DataSpace),
    `Can't find data product '${path}'`,
  );

export const getExecutionContextFromDataspaceExecutable = (
  dataSpace: DataSpace,
  executable: DataSpaceExecutable,
): DataSpaceExecutionContext | undefined => {
  let executionContext;
  if (
    executable instanceof DataSpaceExecutableTemplate ||
    (executable instanceof DataSpacePackageableElementExecutable &&
      executable.executable.value instanceof ConcreteFunctionDefinition)
  ) {
    executionContext = executable.executionContextKey
      ? dataSpace.executionContexts.find(
          (c) => c.name === executable.executionContextKey,
        )
      : dataSpace.defaultExecutionContext;
  } else if (
    executable instanceof DataSpacePackageableElementExecutable &&
    executable.executable.value instanceof Service
  ) {
    if (executable.executionContextKey) {
      executionContext = dataSpace.executionContexts.find(
        (c) => c.name === executable.executionContextKey,
      );
    } else if (executable.executable.value.execution instanceof PureExecution) {
      const serviceExecution = executable.executable.value.execution;
      const serviceMapping =
        serviceExecution instanceof PureSingleExecution
          ? [serviceExecution.mapping?.value]
          : serviceExecution instanceof PureMultiExecution
            ? serviceExecution.executionParameters?.map((p) => p.mapping.value)
            : [];
      const serviceRuntime =
        serviceExecution instanceof PureSingleExecution
          ? serviceExecution.runtime instanceof RuntimePointer
            ? [serviceExecution.runtime.packageableRuntime.value]
            : []
          : serviceExecution instanceof PureMultiExecution
            ? serviceExecution.executionParameters
                ?.map((p) => p.runtime)
                .filter((r) => r instanceof RuntimePointer)
                .map((rp) => rp.packageableRuntime.value)
            : [];
      executionContext = dataSpace.executionContexts.find(
        (c) =>
          serviceMapping?.includes(c.mapping.value) &&
          serviceRuntime?.includes(c.defaultRuntime.value),
      );
    }
  }
  return executionContext;
};

export const getQueryFromDataspaceExecutable = (
  executable: DataSpaceExecutable,
  graphManagerState: GraphManagerState,
): RawLambda | undefined => {
  let query;
  if (executable instanceof DataSpaceExecutableTemplate) {
    query = executable.query;
  } else if (executable instanceof DataSpacePackageableElementExecutable) {
    if (executable.executable.value instanceof ConcreteFunctionDefinition) {
      const functionDef = executable.executable.value;
      query = new RawLambda(
        functionDef.parameters.map((_param) =>
          graphManagerState.graphManager.serializeRawValueSpecification(_param),
        ),
        functionDef.expressionSequence,
      );
    } else if (
      executable.executable.value instanceof Service &&
      executable.executable.value.execution instanceof PureExecution
    ) {
      query = executable.executable.value.execution.func;
    }
  }
  return query;
};
