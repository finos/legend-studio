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
  assertNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type Runtime,
  RuntimePointer,
} from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import {
  type ExecutionParameters,
  MultiExecutionParameters,
  SingleExecutionParameters,
} from '../../../../../../../graph/metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import {
  type V1_Runtime,
  V1_EngineRuntime,
  V1_RuntimePointer,
} from '../../../model/packageableElements/runtime/V1_Runtime.js';
import {
  type V1_ExecutionParameters,
  V1_MultiExecutionParameters,
  V1_SingleExecutionParameters,
} from '../../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import { V1_buildEngineRuntime } from './helpers/V1_RuntimeBuilderHelper.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';

const buildExecutionRuntime = (
  runtime: V1_Runtime,
  context: V1_GraphBuilderContext,
): Runtime => {
  if (runtime instanceof V1_RuntimePointer) {
    assertNonNullable(
      runtime.runtime,
      `Runtime pointer 'runtime' field is missing`,
    );
    return new RuntimePointer(context.resolveRuntime(runtime.runtime));
  } else if (runtime instanceof V1_EngineRuntime) {
    return V1_buildEngineRuntime(runtime, context);
  }
  throw new UnsupportedOperationError();
};

export const V1_buildSingleExecutionParameters = (
  protocol: V1_SingleExecutionParameters,
  context: V1_GraphBuilderContext,
): SingleExecutionParameters => {
  const element = new SingleExecutionParameters();
  element.key = protocol.key;
  element.mapping = context.resolveMapping(protocol.mapping);
  element.runtime = buildExecutionRuntime(protocol.runtime, context);

  return element;
};

export const V1_buildExecutionParameters = (
  protocol: V1_ExecutionParameters,
  context: V1_GraphBuilderContext,
): ExecutionParameters => {
  if (protocol instanceof V1_SingleExecutionParameters) {
    return V1_buildSingleExecutionParameters(protocol, context);
  } else if (protocol instanceof V1_MultiExecutionParameters) {
    const element = new MultiExecutionParameters();
    element.masterKey = protocol.masterKey;
    element.singleExecutionParameters = protocol.singleExecutionParameters.map(
      (e) => V1_buildSingleExecutionParameters(e, context),
    );
    return element;
  }
  throw new UnsupportedOperationError(
    'Unsupported execution environment parameter type',
  );
};
