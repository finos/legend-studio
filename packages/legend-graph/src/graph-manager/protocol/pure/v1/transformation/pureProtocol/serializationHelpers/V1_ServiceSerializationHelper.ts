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
  raw,
  type ModelSchema,
  optional,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
  optionalCustom,
  customListWithSchema,
  customEquivalentList,
  customList,
  optionalCustomUsingModelSchema,
} from '@finos/legend-shared';
import {
  type V1_ServiceExecution,
  V1_KeyedExecutionParameter,
  V1_PureMultiExecution,
  V1_PureSingleExecution,
} from '../../../model/packageableElements/service/V1_ServiceExecution.js';
import { V1_Service } from '../../../model/packageableElements/service/V1_Service.js';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_deserializeRuntime,
  V1_serializeRuntime,
} from './V1_RuntimeSerializationHelper.js';
import { V1_ServiceTest } from '../../../model/packageableElements/service/V1_ServiceTest.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from './V1_CoreSerializationHelper.js';
import { V1_ConnectionTestData } from '../../../model/packageableElements/service/V1_ConnectionTestData.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from './V1_DataElementSerializationHelper.js';
import { V1_ParameterValue } from '../../../model/packageableElements/service/V1_ParameterValue.js';
import { V1_TestData } from '../../../model/packageableElements/service/V1_TestData.js';
import {
  V1_deserializeAtomicTest,
  V1_deserializeTestAssertion,
  V1_deserializeTestSuite,
  V1_serializeAtomicTest,
  V1_serializeTestAssertion,
  V1_serializeTestSuite,
  V1_TestSuiteType,
} from './V1_TestSerializationHelper.js';
import { V1_ServiceTestSuite } from '../../../model/packageableElements/service/V1_ServiceTestSuite.js';
import {
  type V1_DEPRECATED__ServiceTest,
  V1_DEPRECATED__KeyedSingleExecutionTest,
  V1_DEPRECATED__MultiExecutionTest,
  V1_DEPRECATED__SingleExecutionTest,
  V1_DEPRECATED__TestContainer,
} from '../../../model/packageableElements/service/V1_DEPRECATED__ServiceTest.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite.js';
import { ATOMIC_TEST_TYPE } from '../../../../../../../graph/MetaModelConst.js';
import { V1_PostValidation } from '../../../model/packageableElements/service/V1_PostValidation.js';
import { V1_PostValidationAssertion } from '../../../model/packageableElements/service/V1_PostValidationAssertion.js';
import {
  V1_DeploymentOwnership,
  type V1_ServiceOwnership,
  V1_UserListOwnership,
} from '../../../model/packageableElements/service/V1_ServiceOwnership.js';

export const V1_SERVICE_ELEMENT_PROTOCOL_TYPE = 'service';

enum V1_ServiceTestType {
  SINGLE_EXECUTION_TEST = 'singleExecutionTest',
  MULTI_EXECUTION_TEST = 'multiExecutionTest',
}

enum V1_ServiceExecutionType {
  PURE_SINGLE_EXECUTION = 'pureSingleExecution',
  PURE_MULTI_EXECUTION = 'pureMultiExecution',
}

enum V1_ServiceOwnershipType {
  DEPLOYMENT_OWNERSHIP = 'deploymentOwnership',
  USERLIST_OWNERSHIP = 'userListOwnership',
}

export const V1_connectionTestDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ConnectionTestData> =>
  createModelSchema(V1_ConnectionTestData, {
    data: custom(
      (val) => V1_serializeEmbeddedDataType(val, plugins),
      (val) => V1_deserializeEmbeddedDataType(val, plugins),
    ),
    id: primitive(),
  });

export const V1_parameterValueModelSchema = createModelSchema(
  V1_ParameterValue,
  {
    name: primitive(),
    value: raw(),
  },
);

const V1_servicePostValidationAssertionModelSchema = createModelSchema(
  V1_PostValidationAssertion,
  {
    assertion: usingModelSchema(V1_rawLambdaModelSchema),
    id: primitive(),
  },
);

const V1_servicePostValidationModelSchema = createModelSchema(
  V1_PostValidation,
  {
    assertions: list(
      custom(
        (val) => serialize(V1_servicePostValidationAssertionModelSchema, val),
        (val) => deserialize(V1_servicePostValidationAssertionModelSchema, val),
      ),
    ),
    description: primitive(),
    parameters: list(usingModelSchema(V1_rawLambdaModelSchema)),
  },
);

export const V1_testDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TestData> =>
  createModelSchema(V1_TestData, {
    connectionsTestData: list(
      usingModelSchema(V1_connectionTestDataModelSchema(plugins)),
    ),
  });

export const V1_serviceTestModelSchema = createModelSchema(V1_ServiceTest, {
  _type: usingConstantValueSchema(ATOMIC_TEST_TYPE.Service_Test),
  assertions: list(
    custom(
      (val) => V1_serializeTestAssertion(val),
      (val) => V1_deserializeTestAssertion(val),
    ),
  ),
  id: primitive(),
  keys: list(primitive()),
  parameters: customListWithSchema(V1_parameterValueModelSchema),
  serializationFormat: optional(primitive()),
});

export const V1_serviceTestSuiteModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceTestSuite> =>
  createModelSchema(V1_ServiceTestSuite, {
    _type: usingConstantValueSchema(V1_TestSuiteType.SERVICE_TEST_SUITE),
    id: primitive(),
    testData: optionalCustomUsingModelSchema(V1_testDataModelSchema(plugins)),
    tests: list(
      custom(
        (val) => V1_serializeAtomicTest(val, plugins),
        (val) => V1_deserializeAtomicTest(val, plugins),
      ),
    ),
  });

const pureSingleExecutionModelSchema = createModelSchema(
  V1_PureSingleExecution,
  {
    _type: usingConstantValueSchema(
      V1_ServiceExecutionType.PURE_SINGLE_EXECUTION,
    ),
    func: usingModelSchema(V1_rawLambdaModelSchema),
    mapping: optional(primitive()),
    runtime: optionalCustom(V1_serializeRuntime, V1_deserializeRuntime),
  },
);

const deploymentOwnershipSchema = createModelSchema(V1_DeploymentOwnership, {
  _type: usingConstantValueSchema(V1_ServiceOwnershipType.DEPLOYMENT_OWNERSHIP),
  identifier: primitive(),
});

const userListOwnershipSchema = createModelSchema(V1_UserListOwnership, {
  _type: usingConstantValueSchema(V1_ServiceOwnershipType.USERLIST_OWNERSHIP),
  users: list(primitive()),
});

const keyedExecutionParamaterModelSchema = createModelSchema(
  V1_KeyedExecutionParameter,
  {
    key: primitive(),
    mapping: primitive(),
    runtime: optionalCustom(V1_serializeRuntime, V1_deserializeRuntime),
  },
);

const pureMultiExecutionModelSchema = createModelSchema(V1_PureMultiExecution, {
  _type: usingConstantValueSchema(V1_ServiceExecutionType.PURE_MULTI_EXECUTION),
  executionKey: optional(primitive()),
  executionParameters: optional(
    list(usingModelSchema(keyedExecutionParamaterModelSchema)),
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
    `Can't serialize service execution`,
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
        `Can't deserialize service execution of type '${json._type}'`,
      );
  }
};

const V1_serializeOwnership = (
  protocol: V1_ServiceOwnership,
): PlainObject<V1_ServiceOwnership> => {
  if (protocol instanceof V1_DeploymentOwnership) {
    return serialize(deploymentOwnershipSchema, protocol);
  } else if (protocol instanceof V1_UserListOwnership) {
    return serialize(userListOwnershipSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service ownership`,
    protocol,
  );
};

const V1_deserializeOwnership = (
  json: PlainObject<V1_ServiceOwnership>,
): V1_ServiceOwnership => {
  switch (json._type) {
    case V1_ServiceOwnershipType.DEPLOYMENT_OWNERSHIP:
      return deserialize(deploymentOwnershipSchema, json);
    case V1_ServiceOwnershipType.USERLIST_OWNERSHIP:
      return deserialize(userListOwnershipSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize service ownership of type '${json._type}'`,
      );
  }
};

const testContainerModelSchema = createModelSchema(
  V1_DEPRECATED__TestContainer,
  {
    assert: usingModelSchema(V1_rawLambdaModelSchema),
    parametersValues: customEquivalentList({
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  },
);

const singleExecutionTestModelSchema = createModelSchema(
  V1_DEPRECATED__SingleExecutionTest,
  {
    _type: usingConstantValueSchema(V1_ServiceTestType.SINGLE_EXECUTION_TEST),
    asserts: list(usingModelSchema(testContainerModelSchema)),
    data: primitive(),
  },
);

const keyedSingleExecutionTestModelSchema = createModelSchema(
  V1_DEPRECATED__KeyedSingleExecutionTest,
  {
    asserts: list(usingModelSchema(testContainerModelSchema)),
    data: primitive(),
    key: primitive(),
  },
);

const multiExecutionTestModelSchema = createModelSchema(
  V1_DEPRECATED__MultiExecutionTest,
  {
    _type: usingConstantValueSchema(V1_ServiceTestType.MULTI_EXECUTION_TEST),
    tests: list(usingModelSchema(keyedSingleExecutionTestModelSchema)),
  },
);

const V1_serializeLegacyServiceTest = (
  protocol: V1_DEPRECATED__ServiceTest,
): PlainObject<V1_DEPRECATED__ServiceTest> => {
  if (protocol instanceof V1_DEPRECATED__SingleExecutionTest) {
    return serialize(singleExecutionTestModelSchema, protocol);
  } else if (protocol instanceof V1_DEPRECATED__MultiExecutionTest) {
    return serialize(multiExecutionTestModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize service test`, protocol);
};

const V1_deserializeLegacyServiceTest = (
  json: PlainObject<V1_DEPRECATED__ServiceTest>,
): V1_DEPRECATED__ServiceTest => {
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

export const V1_serviceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Service> =>
  createModelSchema(V1_Service, {
    _type: usingConstantValueSchema(V1_SERVICE_ELEMENT_PROTOCOL_TYPE),
    autoActivateUpdates: primitive(),
    documentation: primitive(),
    execution: custom(
      (val) => V1_serializeServiceExecution(val),
      (val) => V1_deserializeServiceExecution(val),
    ),
    name: primitive(),
    owners: list(primitive()),
    ownership: optionalCustom(
      (val) => V1_serializeOwnership(val),
      (val) => V1_deserializeOwnership(val),
    ),
    package: primitive(),
    pattern: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    test: optionalCustom(
      V1_serializeLegacyServiceTest,
      V1_deserializeLegacyServiceTest,
    ),
    testSuites: customList(
      (value: V1_TestSuite) => V1_serializeTestSuite(value, plugins),
      (value) => V1_deserializeTestSuite(value, plugins),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
    postValidations: customListWithSchema(V1_servicePostValidationModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  });
