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
  type ModelSchema,
  optional,
  primitive,
  list,
  custom,
  raw,
} from 'serializr';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_FunctionTestSuite } from '../../../model/packageableElements/function/test/V1_FunctionTestSuite.js';
import {
  V1_TestSuiteType,
  V1_deserializeAtomicTest,
  V1_deserializeTestAssertion,
  V1_serializeAtomicTest,
  V1_serializeTestAssertion,
} from './V1_TestSerializationHelper.js';
import {
  customListWithSchema,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_FunctionStoreTestData } from '../../../model/packageableElements/function/test/V1_FunctionStoreTestData.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from './V1_DataElementSerializationHelper.js';
import {
  V1_FunctionParameterValue,
  V1_FunctionTest,
} from '../../../model/packageableElements/function/test/V1_FunctionTest.js';
import { ATOMIC_TEST_TYPE } from '../../../../../../../graph/MetaModelConst.js';

export const V1_parameterValueModelSchema = createModelSchema(
  V1_FunctionParameterValue,
  {
    name: primitive(),
    value: raw(),
  },
);

export const V1_functionTestModelSchema = createModelSchema(V1_FunctionTest, {
  type: usingConstantValueSchema(ATOMIC_TEST_TYPE.Function_Test),
  assertions: list(
    custom(
      (val) => V1_serializeTestAssertion(val),
      (val) => V1_deserializeTestAssertion(val),
    ),
  ),
  doc: optional(primitive()),
  id: primitive(),
  parameters: customListWithSchema(V1_parameterValueModelSchema),
});

const V1_FunctionStoreTestDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FunctionStoreTestData> =>
  createModelSchema(V1_FunctionStoreTestData, {
    data: custom(
      (val) => V1_serializeEmbeddedDataType(val, plugins),
      (val) => V1_deserializeEmbeddedDataType(val, plugins),
    ),
    doc: optional(primitive()),
    store: primitive(),
  });

export const V1_functionTestSuiteModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FunctionTestSuite> =>
  createModelSchema(V1_FunctionTestSuite, {
    _type: usingConstantValueSchema(V1_TestSuiteType.FUNCTION_TEST_SUITE),
    doc: optional(primitive()),
    id: primitive(),
    testData: optional(
      list(usingModelSchema(V1_FunctionStoreTestDataModelSchema(plugins))),
    ),
    tests: list(
      custom(
        (val) => V1_serializeAtomicTest(val, plugins),
        (val) => V1_deserializeAtomicTest(val, plugins),
      ),
    ),
  });
