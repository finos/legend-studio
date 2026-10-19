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
  serialize,
  deserialize,
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
  customList,
  customListWithSchema,
  isString,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { V1_FunctionTestData } from '../../../model/packageableElements/function/test/V1_FunctionTestData.js';
import {
  V1_BaseDataResolver,
  type V1_DataResolver,
} from '../../../model/data/V1_DataResolver.js';
import {
  V1_deserializeDataResolver,
  V1_serializeDataResolver,
} from './V1_DataResolverSerializationHelper.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from './V1_DataElementSerializationHelper.js';
import {
  V1_FunctionParameterValue,
  V1_FunctionTest,
} from '../../../model/packageableElements/function/test/V1_FunctionTest.js';
import {
  ATOMIC_TEST_TYPE,
  PackageableElementPointerType,
} from '../../../../../../../graph/MetaModelConst.js';
import { V1_packageableElementPointerModelSchema } from './V1_CoreSerializationHelper.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_EmbeddedData } from '../../../model/data/V1_EmbeddedData.js';

export const V1_parameterValueModelSchema = createModelSchema(
  V1_FunctionParameterValue,
  {
    name: primitive(),
    value: raw(),
  },
);

export const V1_functionTestModelSchema = createModelSchema(V1_FunctionTest, {
  _type: usingConstantValueSchema(ATOMIC_TEST_TYPE.Function_Test),
  assertions: list(
    custom(
      (val) => V1_serializeTestAssertion(val),
      (val) => V1_deserializeTestAssertion(val),
    ),
  ),
  id: primitive(),
  doc: optional(primitive()),
  parameters: customListWithSchema(V1_parameterValueModelSchema),
});

const V1_deserializeDataElementReferenceValue = (
  json: PlainObject<V1_PackageableElementPointer> | string,
): V1_PackageableElementPointer => {
  // For backward compatibility: see https://github.com/finos/legend-engine/pull/2621
  if (isString(json)) {
    return new V1_PackageableElementPointer(
      PackageableElementPointerType.STORE,
      json,
    );
  }
  return deserialize(V1_packageableElementPointerModelSchema, json);
};

const V1_serializeFunctionTestData = (
  protocol: V1_FunctionTestData,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_FunctionTestData> => {
  return {
    data: V1_serializeEmbeddedDataType(protocol.data, plugins),
    doc: protocol.doc,
    packageableElementPointer: serialize(
      V1_packageableElementPointerModelSchema,
      protocol.packageableElementPointer,
    ),
  };
};

const V1_deserializeFunctionTestData = (
  json: PlainObject<V1_FunctionTestData>,
  plugins: PureProtocolProcessorPlugin[],
): V1_FunctionTestData => {
  const functionTestData = new V1_FunctionTestData();
  functionTestData.data = V1_deserializeEmbeddedDataType(
    json.data as PlainObject<V1_EmbeddedData>,
    plugins,
  );
  functionTestData.doc = json.doc as string | undefined;

  // For backward compatibility: see https://github.com/finos/legend-engine/pull/4098
  if (json.store) {
    functionTestData.packageableElementPointer =
      V1_deserializeDataElementReferenceValue(
        json.store as PlainObject<V1_PackageableElementPointer>,
      );
  } else {
    functionTestData.packageableElementPointer =
      V1_deserializeDataElementReferenceValue(
        json.packageableElementPointer as PlainObject<V1_PackageableElementPointer>,
      );
  }
  return functionTestData;
};

const V1_serializeFunctionTestDataResolver = (
  protocol: V1_DataResolver,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataResolver> => {
  if (protocol instanceof V1_BaseDataResolver) {
    const functionTestData = new V1_FunctionTestData();
    functionTestData.packageableElementPointer = protocol.elementPointer;
    functionTestData.data = protocol.data;
    return V1_serializeFunctionTestData(functionTestData, plugins);
  }
  return V1_serializeDataResolver(protocol, plugins);
};

const V1_deserializeFunctionTestDataResolver = (
  json: PlainObject<V1_DataResolver>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataResolver => {
  if (json._type) {
    return V1_deserializeDataResolver(json, plugins);
  }
  const functionTestData = V1_deserializeFunctionTestData(json, plugins);
  const resolver = new V1_BaseDataResolver();
  resolver.elementPointer = functionTestData.packageableElementPointer;
  resolver.data = functionTestData.data;
  return resolver;
};

export const V1_functionTestSuiteModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FunctionTestSuite> =>
  createModelSchema(V1_FunctionTestSuite, {
    _type: usingConstantValueSchema(V1_TestSuiteType.FUNCTION_TEST_SUITE),
    doc: optional(primitive()),
    id: primitive(),
    testData: customList(
      (val: V1_DataResolver) =>
        V1_serializeFunctionTestDataResolver(val, plugins),
      (val) => V1_deserializeFunctionTestDataResolver(val, plugins),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
    tests: list(
      custom(
        (val) => V1_serializeAtomicTest(val, plugins),
        (val) => V1_deserializeAtomicTest(val, plugins),
      ),
    ),
  });
