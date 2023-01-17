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
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  deserializeMap,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import { ATOMIC_TEST_TYPE } from '../../../../../../../graph/MetaModelConst.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { Testable_PureProtocolProcessorPlugin_Extension } from '../../../../Testable_PureProtocolProcessorPlugin_Extension.js';
import { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest.js';
import { V1_MappingTestSuite } from '../../../model/packageableElements/mapping/V1_MappingTestSuite.js';
import { V1_MultiExecutionServiceTestResult } from '../../../model/packageableElements/service/V1_MultiExecutionServiceTestResult.js';
import { V1_ServiceTest } from '../../../model/packageableElements/service/V1_ServiceTest.js';
import { V1_ServiceTestSuite } from '../../../model/packageableElements/service/V1_ServiceTestSuite.js';
import { V1_AssertFail } from '../../../model/test/assertion/status/V1_AssertFail.js';
import type { V1_AssertionStatus } from '../../../model/test/assertion/status/V1_AssertionStatus.js';
import { V1_AssertPass } from '../../../model/test/assertion/status/V1_AssertPass.js';
import { V1_EqualToJsonAssertFail } from '../../../model/test/assertion/status/V1_EqualToJsonAssertFail.js';
import { V1_EqualTo } from '../../../model/test/assertion/V1_EqualTo.js';
import { V1_EqualToJson } from '../../../model/test/assertion/V1_EqualToJson.js';
import { V1_EqualToTDS } from '../../../model/test/assertion/V1_EqualToTDS.js';
import type { V1_TestAssertion } from '../../../model/test/assertion/V1_TestAssertion.js';
import {
  type V1_TestResult,
  V1_TestError,
  V1_TestFailed,
  V1_TestPassed,
} from '../../../model/test/result/V1_TestResult.js';
import type { V1_AtomicTest } from '../../../model/test/V1_AtomicTest.js';
import { V1_AtomicTestId } from '../../../model/test/V1_AtomicTestId.js';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite.js';
import { V1_externalFormatDataModelSchema } from './V1_DataElementSerializationHelper.js';
import {
  V1_mappingTestModelSchema,
  V1_mappingTestSuiteModelSchema,
} from './V1_MappingSerializationHelper.js';
import {
  V1_serviceTestModelSchema,
  V1_serviceTestSuiteModelSchema,
} from './V1_ServiceSerializationHelper.js';

enum V1_AssertionStatusType {
  ASSERT_FAIL = 'assertFail',
  ASSERT_PASS = 'assertPass',
  EQUAL_TO_JSON_ASSERT_FAIL = 'equalToJsonAssertFail',
}

export enum V1_TestAssertionType {
  EQUAL_TO = 'equalTo',
  EQUAL_TO_JSON = 'equalToJson',
  EQUAL_TO_TDS = 'equalToTDS',
}

enum V1_TestResultType {
  TEST_ERROR = 'testError',
  TEST_PASSED = 'testPassed',
  TEST_FAILED = 'testFailed',
  MULTI_EXECUTION_TEST_RESULT = 'multiExecutionTestResult',
  // Remove once https://github.com/finos/legend-engine/pull/808 is released
  TEMPROARY_MULTI_EXECUTION_TEST_RESULT = 'MultiExecutionServiceTestResult',
}

export enum V1_TestSuiteType {
  SERVICE_TEST_SUITE = 'serviceTestSuite',
  MAPPING_TEST_SUITE = 'mappingTestSuite',
}

export const V1_atomicTestIdModelSchema = createModelSchema(V1_AtomicTestId, {
  atomicTestId: primitive(),
  testSuiteId: primitive(),
});

export const V1_assertFailModelSchema = createModelSchema(V1_AssertFail, {
  _type: usingConstantValueSchema(V1_AssertionStatusType.ASSERT_FAIL),
  id: primitive(),
  message: primitive(),
});

export const V1_assertPassModelSchema = createModelSchema(V1_AssertPass, {
  _type: usingConstantValueSchema(V1_AssertionStatusType.ASSERT_PASS),
  id: primitive(),
});

export const V1_equalToJsonAssertFailModelSchema = createModelSchema(
  V1_EqualToJsonAssertFail,
  {
    _type: usingConstantValueSchema(
      V1_AssertionStatusType.EQUAL_TO_JSON_ASSERT_FAIL,
    ),
    actual: primitive(),
    expected: primitive(),
    id: primitive(),
    message: primitive(),
  },
);

const V1_serializeAssertionStatus = (
  protocol: V1_AssertionStatus,
): PlainObject<V1_AssertionStatus> => {
  if (protocol instanceof V1_EqualToJsonAssertFail) {
    return serialize(V1_equalToJsonAssertFailModelSchema, protocol);
  } else if (protocol instanceof V1_AssertFail) {
    return serialize(V1_assertFailModelSchema, protocol);
  } else if (protocol instanceof V1_AssertPass) {
    return serialize(V1_assertPassModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize assertion status`,
    protocol,
  );
};

const V1_deserializeAssertionStatus = (
  json: PlainObject<V1_AssertionStatus>,
): V1_AssertionStatus => {
  switch (json._type) {
    case V1_AssertionStatusType.ASSERT_FAIL:
      return deserialize(V1_assertFailModelSchema, json);
    case V1_AssertionStatusType.ASSERT_PASS:
      return deserialize(V1_assertPassModelSchema, json);
    case V1_AssertionStatusType.EQUAL_TO_JSON_ASSERT_FAIL:
      return deserialize(V1_equalToJsonAssertFailModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize assertion status of type '${json._type}'`,
      );
  }
};

export const V1_equalToModelSchema = createModelSchema(V1_EqualTo, {
  _type: usingConstantValueSchema(V1_TestAssertionType.EQUAL_TO),
  expected: primitive(),
  id: primitive(),
});

export const V1_equalToJsonModelSchema = createModelSchema(V1_EqualToJson, {
  _type: usingConstantValueSchema(V1_TestAssertionType.EQUAL_TO_JSON),
  expected: usingModelSchema(V1_externalFormatDataModelSchema),
  id: primitive(),
});

const V1_equalToTDSModelSchema = createModelSchema(V1_EqualToTDS, {
  _type: usingConstantValueSchema(V1_TestAssertionType.EQUAL_TO_TDS),
  expected: usingModelSchema(V1_externalFormatDataModelSchema),
  id: primitive(),
});

export const V1_testErrorModelSchema = createModelSchema(V1_TestError, {
  atomicTestId: usingModelSchema(V1_atomicTestIdModelSchema),
  error: primitive(),
  testable: primitive(),
});

export const V1_testFailedModelSchema = createModelSchema(V1_TestFailed, {
  assertStatuses: list(
    custom(
      (val) => V1_serializeAssertionStatus(val),
      (val) => V1_deserializeAssertionStatus(val),
    ),
  ),
  atomicTestId: usingModelSchema(V1_atomicTestIdModelSchema),
  testable: primitive(),
});

export const V1_MultiExecutionServiceTestResultModelSchema = createModelSchema(
  V1_MultiExecutionServiceTestResult,
  {
    atomicTestId: usingModelSchema(V1_atomicTestIdModelSchema),
    keyIndexedTestResults: custom(
      () => SKIP,
      (val) =>
        deserializeMap(val, (v) =>
          V1_deserializeTestResult(v as PlainObject<V1_TestResult>),
        ),
    ),
    testable: primitive(),
  },
);

export const V1_testPassedModelSchema = createModelSchema(V1_TestPassed, {
  atomicTestId: usingModelSchema(V1_atomicTestIdModelSchema),
  testable: primitive(),
});

export function V1_deserializeTestResult(
  json: PlainObject<V1_TestResult>,
): V1_TestResult {
  switch (json._type) {
    case V1_TestResultType.TEST_ERROR:
      return deserialize(V1_testErrorModelSchema, json);
    case V1_TestResultType.TEST_FAILED:
      return deserialize(V1_testFailedModelSchema, json);
    case V1_TestResultType.TEST_PASSED:
      return deserialize(V1_testPassedModelSchema, json);
    case V1_TestResultType.MULTI_EXECUTION_TEST_RESULT:
    case V1_TestResultType.TEMPROARY_MULTI_EXECUTION_TEST_RESULT:
      return deserialize(V1_MultiExecutionServiceTestResultModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize atomic test of type '${json._type}'`,
      );
  }
}

export const V1_serializeAtomicTest = (
  protocol: V1_AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AtomicTest> => {
  if (protocol instanceof V1_ServiceTest) {
    return serialize(V1_serviceTestModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_MappingTest) {
    return serialize(V1_mappingTestModelSchema(plugins), protocol);
  }
  const extraAtomicTestSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAtomicTestProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraAtomicTestSerializers) {
    const atomicTestProtocolJson = serializer(protocol, plugins);
    if (atomicTestProtocolJson) {
      return atomicTestProtocolJson;
    }
  }

  throw new UnsupportedOperationError(
    `Can't serialize atomic test: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeAtomicTest = (
  json: PlainObject<V1_AtomicTest>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AtomicTest => {
  switch (json._type) {
    case ATOMIC_TEST_TYPE.Service_Test:
      return deserialize(V1_serviceTestModelSchema(plugins), json);
    case ATOMIC_TEST_TYPE.Mapping_Test:
      return deserialize(V1_mappingTestModelSchema(plugins), json);
    default: {
      const extraAtomicTestProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as Testable_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraAtomicTestProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraAtomicTestProtocolDeserializers) {
        const atomicTestProtocol = deserializer(json, plugins);
        if (atomicTestProtocol) {
          return atomicTestProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize atomic test of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

export const V1_serializeTestAssertion = (
  protocol: V1_TestAssertion,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_TestAssertion> => {
  if (protocol instanceof V1_EqualTo) {
    return serialize(V1_equalToModelSchema, protocol);
  } else if (protocol instanceof V1_EqualToJson) {
    return serialize(V1_equalToJsonModelSchema, protocol);
  } else if (protocol instanceof V1_EqualToTDS) {
    return serialize(V1_equalToTDSModelSchema, protocol);
  }
  const extraTestAssertionSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTestAssertionProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraTestAssertionSerializers) {
    const testAssertionProtocolJson = serializer(protocol, plugins);
    if (testAssertionProtocolJson) {
      return testAssertionProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize test assertion`,
    protocol,
  );
};

export const V1_deserializeTestAssertion = (
  json: PlainObject<V1_TestAssertion>,
  plugins: PureProtocolProcessorPlugin[],
): V1_TestAssertion => {
  switch (json._type) {
    case V1_TestAssertionType.EQUAL_TO:
      return deserialize(V1_equalToModelSchema, json);
    case V1_TestAssertionType.EQUAL_TO_JSON:
      return deserialize(V1_equalToJsonModelSchema, json);
    case V1_TestAssertionType.EQUAL_TO_TDS:
      return deserialize(V1_equalToTDSModelSchema, json);
    default:
      const extraTestAssertionProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as Testable_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraTestAssertionProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraTestAssertionProtocolDeserializers) {
        const testAssertionProtocol = deserializer(json, plugins);
        if (testAssertionProtocol) {
          return testAssertionProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize test assertion of type '${json._type}'`,
      );
  }
};

export const V1_serializeTestSuite = (
  protocol: V1_TestSuite,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_TestSuite> => {
  if (protocol instanceof V1_ServiceTestSuite) {
    return serialize(V1_serviceTestSuiteModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_MappingTestSuite) {
    return serialize(V1_mappingTestSuiteModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize test suite`, protocol);
};

export const V1_deserializeTestSuite = (
  json: PlainObject<V1_TestSuite>,
  plugins: PureProtocolProcessorPlugin[],
): V1_TestSuite => {
  switch (json._type) {
    case V1_TestSuiteType.SERVICE_TEST_SUITE:
      return deserialize(V1_serviceTestSuiteModelSchema(plugins), json);
    case V1_TestSuiteType.MAPPING_TEST_SUITE:
      return deserialize(V1_mappingTestSuiteModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize test suite of type '${json._type}'`,
      );
  }
};
