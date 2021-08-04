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
  createModelSchema,
  primitive,
  deserialize,
  custom,
  list,
  serialize,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  deserializeArray,
  UnsupportedOperationError,
  serializeArray,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { V1_ServiceExecution } from '../../../model/packageableElements/service/V1_ServiceExecution';
import {
  V1_KeyedExecutionParameter,
  V1_PureMultiExecution,
  V1_PureSingleExecution,
} from '../../../model/packageableElements/service/V1_ServiceExecution';
import { V1_Service } from '../../../model/packageableElements/service/V1_Service';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper';
import type { V1_Runtime } from '../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_RuntimePointer,
} from '../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_runtimePointerModelSchema,
  V1_engineRuntimeModelSchema,
  V1_legacyRuntimeModelSchema,
  V1_RuntimeType,
} from './V1_RuntimeSerializationHelper';
import type { V1_ServiceTest } from '../../../model/packageableElements/service/V1_ServiceTest';
import {
  V1_KeyedSingleExecutionTest,
  V1_MultiExecutionTest,
  V1_SingleExecutionTest,
  V1_TestContainer,
} from '../../../model/packageableElements/service/V1_ServiceTest';

export const V1_SERVICE_ELEMENT_PROTOCOL_TYPE = 'service';

enum V1_ServiceTestType {
  SINGLE_EXECUTION_TEST = 'singleExecutionTest',
  MULTI_EXECUTION_TEST = 'multiExecutionTest',
}

enum V1_ServiceExecutionType {
  PURE_SINGLE_EXECUTION = 'pureSingleExecution',
  PURE_MULTI_EXECUTION = 'pureMultiExecution',
}

const V1_serializeRuntimeValue = (
  protocol: V1_Runtime,
): PlainObject<V1_Runtime> => {
  if (protocol instanceof V1_RuntimePointer) {
    return serialize(V1_runtimePointerModelSchema, protocol);
  } else if (protocol instanceof V1_EngineRuntime) {
    return serialize(V1_engineRuntimeModelSchema, protocol);
  } else if (protocol instanceof V1_LegacyRuntime) {
    return serialize(V1_legacyRuntimeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize runtime value`,
    protocol,
  );
};

const V1_deserializeRuntimeValue = (
  json: PlainObject<V1_Runtime>,
): V1_Runtime => {
  switch (json._type) {
    case V1_RuntimeType.RUNTIME_POINTER:
      return deserialize(V1_runtimePointerModelSchema, json);
    case V1_RuntimeType.ENGINE_RUNTIME:
      return deserialize(V1_engineRuntimeModelSchema, json);
    case V1_RuntimeType.LEGACY_RUNTIME:
    case undefined:
      return deserialize(V1_legacyRuntimeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deeserialize runtime value of type '${json._type}'`,
      );
  }
};

const pureSingleExecutionModelSchema = createModelSchema(
  V1_PureSingleExecution,
  {
    _type: usingConstantValueSchema(
      V1_ServiceExecutionType.PURE_SINGLE_EXECUTION,
    ),
    func: usingModelSchema(V1_rawLambdaModelSchema),
    mapping: primitive(),
    runtime: custom(
      (val) => V1_serializeRuntimeValue(val),
      (val) => V1_deserializeRuntimeValue(val),
    ),
  },
);

const keyedExecutionParamaterModelSchema = createModelSchema(
  V1_KeyedExecutionParameter,
  {
    key: primitive(),
    mapping: primitive(),
    runtime: custom(
      (val) => V1_serializeRuntimeValue(val),
      (val) => V1_deserializeRuntimeValue(val),
    ),
  },
);

const pureMultiExecutionModelSchema = createModelSchema(V1_PureMultiExecution, {
  _type: usingConstantValueSchema(V1_ServiceExecutionType.PURE_MULTI_EXECUTION),
  executionKey: primitive(),
  executionParameters: list(
    usingModelSchema(keyedExecutionParamaterModelSchema),
  ),
  func: usingModelSchema(V1_rawLambdaModelSchema),
});

const V1_serializeServiceExecution = (
  protocol: V1_ServiceExecution,
): PlainObject<V1_ServiceExecution> => {
  if (protocol instanceof V1_PureSingleExecution) {
    return serialize(pureSingleExecutionModelSchema, protocol);
  } else if (protocol instanceof V1_PureMultiExecution) {
    return serialize(pureMultiExecutionModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service excution`,
    protocol,
  );
};

const V1_deserializeServiceExecution = (
  json: PlainObject<V1_ServiceExecution>,
): V1_ServiceExecution => {
  switch (json._type) {
    case V1_ServiceExecutionType.PURE_SINGLE_EXECUTION:
      return deserialize(pureSingleExecutionModelSchema, json);
    case V1_ServiceExecutionType.PURE_MULTI_EXECUTION:
      return deserialize(pureMultiExecutionModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service excution of type '${json._type}'`,
      );
  }
};

const testContainerModelSchema = createModelSchema(V1_TestContainer, {
  assert: usingModelSchema(V1_rawLambdaModelSchema),
  parametersValues: custom(
    (values) => serializeArray(values, (value) => value, true),
    (values) => deserializeArray(values, (v) => v, false),
  ),
});

const singleExecutionTestModelSchema = createModelSchema(
  V1_SingleExecutionTest,
  {
    _type: usingConstantValueSchema(V1_ServiceTestType.SINGLE_EXECUTION_TEST),
    asserts: list(usingModelSchema(testContainerModelSchema)),
    data: primitive(),
  },
);

const keyedSingleExecutionTestModelSchema = createModelSchema(
  V1_KeyedSingleExecutionTest,
  {
    asserts: list(usingModelSchema(testContainerModelSchema)),
    data: primitive(),
    key: primitive(),
  },
);

const multiExecutionTestModelSchema = createModelSchema(V1_MultiExecutionTest, {
  _type: usingConstantValueSchema(V1_ServiceTestType.MULTI_EXECUTION_TEST),
  tests: list(usingModelSchema(keyedSingleExecutionTestModelSchema)),
});

const V1_serializeServiceTest = (
  protocol: V1_ServiceTest,
): PlainObject<V1_ServiceTest> => {
  if (protocol instanceof V1_SingleExecutionTest) {
    return serialize(singleExecutionTestModelSchema, protocol);
  } else if (protocol instanceof V1_MultiExecutionTest) {
    return serialize(multiExecutionTestModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize service test`, protocol);
};

const V1_deserializeServiceTest = (
  json: PlainObject<V1_ServiceTest>,
): V1_ServiceTest => {
  switch (json._type) {
    case V1_ServiceTestType.SINGLE_EXECUTION_TEST:
      return deserialize(singleExecutionTestModelSchema, json);
    case V1_ServiceTestType.MULTI_EXECUTION_TEST:
      return deserialize(multiExecutionTestModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service test of type '${json._type}'`,
      );
  }
};

export const V1_servicedModelSchema = createModelSchema(V1_Service, {
  _type: usingConstantValueSchema(V1_SERVICE_ELEMENT_PROTOCOL_TYPE),
  autoActivateUpdates: primitive(),
  documentation: primitive(),
  execution: custom(
    (val) => V1_serializeServiceExecution(val),
    (val) => V1_deserializeServiceExecution(val),
  ),
  name: primitive(),
  owners: list(primitive()),
  package: primitive(),
  pattern: primitive(),
  test: custom(
    (val) => V1_serializeServiceTest(val),
    (val) => V1_deserializeServiceTest(val),
  ),
});
