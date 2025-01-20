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
  type PlainObject,
  usingConstantValueSchema,
  usingModelSchema,
  UnsupportedOperationError,
  optionalCustom,
  optionalCustomUsingModelSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  primitive,
  list,
  deserialize,
  serialize,
} from 'serializr';
import {
  V1_ExecutionEnvironmentInstance,
  V1_MultiExecutionParameters,
  V1_RuntimeComponents,
  V1_SingleExecutionParameters,
  type V1_ExecutionParameters,
} from '../../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import {
  V1_deserializeRuntime,
  V1_serializeRuntime,
} from './V1_RuntimeSerializationHelper.js';
import { V1_packageableElementPointerModelSchema } from './V1_CoreSerializationHelper.js';

export const V1_EXECUTION_ENVIRONMENT_ELEMENT_PROTOCOL_TYPE =
  'executionEnvironmentInstance';

enum V1_ExecEnvirParameterType {
  PURE_SINGLE_EXECUTION = 'singleExecutionParameters',
  PURE_MULTI_EXECUTION = 'multiExecutionParameters',
}

const V1_runtimeComponentsModelSchema = createModelSchema(
  V1_RuntimeComponents,
  {
    clazz: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => deserialize(V1_packageableElementPointerModelSchema, val),
    ),
    binding: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => deserialize(V1_packageableElementPointerModelSchema, val),
    ),
    runtime: optionalCustom(
      (val) => V1_serializeRuntime(val),
      (val) => V1_deserializeRuntime(val),
    ),
  },
);

const V1_singleExecutionParametersModelSchema = createModelSchema(
  V1_SingleExecutionParameters,
  {
    _type: usingConstantValueSchema(
      V1_ExecEnvirParameterType.PURE_SINGLE_EXECUTION,
    ),
    key: primitive(),
    mapping: primitive(),
    runtime: optionalCustom(
      (val) => V1_serializeRuntime(val),
      (val) => V1_deserializeRuntime(val),
    ),
    runtimeComponents: optionalCustomUsingModelSchema(
      V1_runtimeComponentsModelSchema,
    ),
  },
);

export const V1_multiExecutionParametersmodelSchema = createModelSchema(
  V1_MultiExecutionParameters,
  {
    _type: usingConstantValueSchema(
      V1_ExecEnvirParameterType.PURE_MULTI_EXECUTION,
    ),
    masterKey: primitive(),
    singleExecutionParameters: list(
      usingModelSchema(V1_singleExecutionParametersModelSchema),
    ),
  },
);

const V1_serializeExecutionParameters = (
  protocol: V1_ExecutionParameters,
): PlainObject<V1_ExecutionParameters> => {
  if (protocol instanceof V1_SingleExecutionParameters) {
    return serialize(V1_singleExecutionParametersModelSchema, protocol);
  } else if (protocol instanceof V1_MultiExecutionParameters) {
    return serialize(V1_multiExecutionParametersmodelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize excution env exec parameters`,
    protocol,
  );
};

const V1_deserializeExecutionParameters = (
  json: PlainObject<V1_ExecutionParameters>,
): V1_ExecutionParameters => {
  switch (json._type) {
    case V1_ExecEnvirParameterType.PURE_SINGLE_EXECUTION:
      return deserialize(V1_singleExecutionParametersModelSchema, json);
    case V1_ExecEnvirParameterType.PURE_MULTI_EXECUTION:
      return deserialize(V1_multiExecutionParametersmodelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize execution parameters of type '${json._type}'`,
      );
  }
};

export const V1_executionEnvModelSchema = createModelSchema(
  V1_ExecutionEnvironmentInstance,
  {
    _type: usingConstantValueSchema(
      V1_EXECUTION_ENVIRONMENT_ELEMENT_PROTOCOL_TYPE,
    ),
    name: primitive(),
    executionParameters: list(
      custom(
        (val) => V1_serializeExecutionParameters(val),
        (val) => V1_deserializeExecutionParameters(val),
      ),
    ),
    package: primitive(),
  },
);
