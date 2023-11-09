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
  LogEvent,
  UnsupportedOperationError,
  assertNonEmptyString,
  assertType,
  assertNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../../__lib__/GraphManagerEvent.js';
import {
  type Runtime,
  RuntimePointer,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { Service } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/Service.js';
import { ServiceTest } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceTest.js';
import {
  type ServiceExecution,
  PureSingleExecution,
  PureMultiExecution,
  KeyedExecutionParameter,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceExecution.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_ServiceTest } from '../../../../model/packageableElements/service/V1_ServiceTest.js';
import {
  type V1_ServiceExecution,
  V1_PureSingleExecution,
  V1_PureMultiExecution,
} from '../../../../model/packageableElements/service/V1_ServiceExecution.js';
import {
  type V1_Runtime,
  V1_RuntimePointer,
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_StoreConnections,
  V1_IdentifiedConnection,
} from '../../../../model/packageableElements/runtime/V1_Runtime.js';
import { V1_buildEngineRuntime } from './V1_RuntimeBuilderHelper.js';
import { V1_PackageableElementPointer } from '../../../../model/packageableElements/V1_PackageableElement.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';
import { GraphBuilderError } from '../../../../../../../../graph-manager/GraphManagerUtils.js';
import {
  type V1_DEPRECATED__ServiceTest,
  V1_DEPRECATED__SingleExecutionTest,
  V1_DEPRECATED__MultiExecutionTest,
} from '../../../../model/packageableElements/service/V1_DEPRECATED__ServiceTest.js';
import type { TestSuite } from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import { PackageableElementPointerType } from '../../../../../../../../graph/MetaModelConst.js';
import type { V1_ConnectionTestData } from '../../../../model/packageableElements/service/V1_ConnectionTestData.js';
import { ConnectionTestData } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ConnectionTestData.js';
import type { V1_ParameterValue } from '../../../../model/packageableElements/service/V1_ParameterValue.js';
import { ParameterValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ParameterValue.js';
import type { V1_TestData } from '../../../../model/packageableElements/service/V1_TestData.js';
import { TestData } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceTestData.js';
import { V1_buildTestAssertion } from './V1_TestBuilderHelper.js';
import type { V1_ServiceTestSuite } from '../../../../model/packageableElements/service/V1_ServiceTestSuite.js';
import { ServiceTestSuite } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceTestSuite.js';
import {
  type DEPRECATED__ServiceTest,
  DEPRECATED__KeyedSingleExecutionTest,
  DEPRECATED__SingleExecutionTest,
  DEPRECATED__TestContainer,
  DEPRECATED__MultiExecutionTest,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/service/DEPRECATED__ServiceTest.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';
import type { V1_PostValidation } from '../../../../model/packageableElements/service/V1_PostValidation.js';
import { PostValidation } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/PostValidation.js';
import type { V1_PostValidationAssertion } from '../../../../model/packageableElements/service/V1_PostValidationAssertion.js';
import { PostValidationAssertion } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/PostValidationAssertion.js';
import {
  V1_DeploymentOwnership,
  type V1_ServiceOwnership,
  V1_UserListOwnership,
} from '../../../../model/packageableElements/service/V1_ServiceOwnership.js';
import {
  DeploymentOwnership,
  type ServiceOwnership,
  UserListOwnership,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/service/ServiceOwnership.js';

const buildConnectionTestData = (
  element: V1_ConnectionTestData,
  context: V1_GraphBuilderContext,
): ConnectionTestData => {
  const connectionTestData = new ConnectionTestData();
  connectionTestData.connectionId = element.id;
  connectionTestData.testData = V1_buildEmbeddedData(element.data, context);
  return connectionTestData;
};

const buildParameterValue = (element: V1_ParameterValue): ParameterValue => {
  const parameterValue = new ParameterValue();
  parameterValue.name = element.name;
  parameterValue.value = element.value;
  return parameterValue;
};

const buildPostValidationAssertion = (
  element: V1_PostValidationAssertion,
  context: V1_GraphBuilderContext,
): PostValidationAssertion => {
  const postValidationAssertion = new PostValidationAssertion();
  postValidationAssertion.id = element.id;
  postValidationAssertion.assertion = V1_buildRawLambdaWithResolvedPaths(
    element.assertion.parameters,
    element.assertion.body,
    context,
  );
  return postValidationAssertion;
};

export const V1_buildPostValidation = (
  element: V1_PostValidation,
  context: V1_GraphBuilderContext,
): PostValidation => {
  const postValidation = new PostValidation();
  postValidation.description = element.description;
  postValidation.assertions = element.assertions.map((a) =>
    buildPostValidationAssertion(a, context),
  );
  postValidation.parameters = element.parameters.map((rq) =>
    V1_buildRawLambdaWithResolvedPaths(rq.parameters, rq.body, context),
  );
  return postValidation;
};

const buildTestData = (
  element: V1_TestData,
  context: V1_GraphBuilderContext,
): TestData => {
  const testData = new TestData();
  testData.connectionsTestData = element.connectionsTestData.map(
    (connectionTestData) =>
      buildConnectionTestData(connectionTestData, context),
  );
  return testData;
};

export const V1_buildServiceTest = (
  element: V1_ServiceTest,
  parentSuite: TestSuite,
  context: V1_GraphBuilderContext,
): ServiceTest => {
  const serviceTest = new ServiceTest();
  serviceTest.id = element.id;
  serviceTest.__parent = parentSuite;
  serviceTest.serializationFormat = element.serializationFormat;
  serviceTest.parameters = element.parameters.map((parameter) =>
    buildParameterValue(parameter),
  );
  serviceTest.keys = element.keys;
  serviceTest.assertions = element.assertions.map((assertion) =>
    V1_buildTestAssertion(assertion, serviceTest, context),
  );
  return serviceTest;
};

export const V1_buildServiceTestSuite = (
  element: V1_ServiceTestSuite,
  context: V1_GraphBuilderContext,
): ServiceTestSuite => {
  const serviceTestSuite = new ServiceTestSuite();
  serviceTestSuite.id = element.id;
  serviceTestSuite.testData = element.testData
    ? buildTestData(element.testData, context)
    : undefined;
  serviceTestSuite.tests = element.tests.map((test) =>
    V1_buildServiceTest(
      guaranteeType(test, V1_ServiceTest),
      serviceTestSuite,
      context,
    ),
  );
  return serviceTestSuite;
};

export const V1_buildLegacyServiceTest = (
  serviceTest: V1_DEPRECATED__ServiceTest,
  context: V1_GraphBuilderContext,
  parentService: Service,
): DEPRECATED__ServiceTest => {
  if (serviceTest instanceof V1_DEPRECATED__SingleExecutionTest) {
    assertType(
      parentService.execution,
      PureSingleExecution,
      'Service with single-execution requires a single-execution test',
    );
    const singleTest = new DEPRECATED__SingleExecutionTest(
      parentService,
      serviceTest.data,
    );
    singleTest.asserts = serviceTest.asserts.map((assert) => {
      const testContainer = new DEPRECATED__TestContainer(
        V1_buildRawLambdaWithResolvedPaths(
          assert.assert.parameters,
          assert.assert.body,
          context,
        ),
        singleTest,
      );
      testContainer.parametersValues = assert.parametersValues;
      return testContainer;
    });
    return singleTest;
  } else if (serviceTest instanceof V1_DEPRECATED__MultiExecutionTest) {
    assertType(
      parentService.execution,
      PureMultiExecution,
      'Service with multi-execution requires a multi-execution test',
    );
    const multiTest = new DEPRECATED__MultiExecutionTest(parentService);
    if (!serviceTest.tests.length) {
      throw new GraphBuilderError(
        'Service multi-execution test must not be empty',
      );
    }
    const executionKeys = new Set(
      (parentService.execution.executionParameters ?? []).map(
        (execution) => execution.key,
      ),
    );
    const uniqueKeys = new Set<string>();
    multiTest.tests = serviceTest.tests.map((test) => {
      assertNonEmptyString(
        test.key,
        'Service multi-execution test key is missing',
      );
      // check duplicated key
      if (uniqueKeys.has(test.key)) {
        throw new GraphBuilderError(
          `Service multi-execution test with key '${test.key}' already exists`,
        );
      }
      uniqueKeys.add(test.key);
      const keyedTest = new DEPRECATED__KeyedSingleExecutionTest(
        test.key,
        parentService,
        test.data,
      );
      keyedTest.asserts = test.asserts.map((assert) => {
        const testContaier = new DEPRECATED__TestContainer(
          V1_buildRawLambdaWithResolvedPaths(
            assert.assert.parameters,
            assert.assert.body,
            context,
          ),
          keyedTest,
        );
        testContaier.parametersValues = assert.parametersValues;
        return testContaier;
      });
      return keyedTest;
    });
    // verify matching key values between multi-execution and multi-execution test
    // NOTE: since test depends on execution, we want to check first if no test is found for an execution
    const testWithoutExecutionKeys = new Set(
      Array.from(uniqueKeys.values()).filter((key) => !executionKeys.has(key)),
    );
    Array.from(uniqueKeys.values()).forEach((key) => executionKeys.delete(key));
    /**
     * Here, we verify matching key values between multi-execution and multi test
     * NOTE: since test depends on execution, we definitely want to throw when no execution is found for a test.
     * The other direction is debatable, on one hand it makes sense to have a test for each execution, but very often
     * (and majorly for backward compatibility reasons) we have executions that only differ in connection information
     * like credentials, etc. As such it is immaterial to mandate test for each execution.
     *
     * The being said, the UI should enforce the best practice and make people specify one test per execution regardless
     * As such, here we will warn user if their executions don't have tests, and auto-fill with one.
     */
    if (executionKeys.size) {
      context.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        new GraphBuilderError(
          `Execution(s) with key '${Array.from(executionKeys.values()).join(
            ', ',
          )}' do not have a corresponding test`,
        ),
      );
      multiTest.tests = (parentService.execution.executionParameters ?? []).map(
        (execution) =>
          multiTest.tests.find((test) => test.key === execution.key) ??
          new DEPRECATED__KeyedSingleExecutionTest(
            execution.key,
            parentService,
            '',
          ),
      );
    } else if (testWithoutExecutionKeys.size) {
      throw new GraphBuilderError(
        `Test(s) with key '${Array.from(testWithoutExecutionKeys.values()).join(
          ', ',
        )}' do not have a corresponding execution`,
      );
    }
    return multiTest;
  }
  throw new UnsupportedOperationError();
};

const buildServiceExecutionRuntime = (
  runtime: V1_Runtime,
  mapping: string,
  context: V1_GraphBuilderContext,
): Runtime => {
  const mappingPointer = new V1_PackageableElementPointer(
    PackageableElementPointerType.MAPPING,
    mapping,
  );
  if (runtime instanceof V1_RuntimePointer) {
    assertNonNullable(
      runtime.runtime,
      `Runtime pointer 'runtime' field is missing`,
    );
    return new RuntimePointer(context.resolveRuntime(runtime.runtime));
  } else if (runtime instanceof V1_EngineRuntime) {
    runtime.mappings = runtime.mappings.length
      ? runtime.mappings
      : [mappingPointer];
    return V1_buildEngineRuntime(runtime, context);
  } else if (runtime instanceof V1_LegacyRuntime) {
    const engineRuntime = new V1_EngineRuntime();
    engineRuntime.mappings = runtime.mappings.length
      ? runtime.mappings
      : [mappingPointer];
    let idx = 1;
    engineRuntime.connections = [];
    runtime.connections.forEach((connection) => {
      assertNonNullable(
        connection.store,
        `Legacy runtime embedded connection 'store' field is missing`,
      );
      const identifiedConnection = new V1_IdentifiedConnection();
      identifiedConnection.id = `connection_${idx} `;
      idx++;
      identifiedConnection.connection = connection;
      let storeConnections = engineRuntime.connections.find(
        (sc) => sc.store.path === connection.store,
      );
      if (!storeConnections) {
        const newStoreConnections = new V1_StoreConnections();
        newStoreConnections.store = new V1_PackageableElementPointer(
          PackageableElementPointerType.STORE,
          connection.store,
        );
        storeConnections = newStoreConnections;
      }
      storeConnections.storeConnections.push(identifiedConnection);
    });
    return V1_buildEngineRuntime(engineRuntime, context);
  }
  throw new UnsupportedOperationError();
};

export const V1_buildServiceOwnership = (
  serviceOwnership: V1_ServiceOwnership,
  parentService: Service,
): ServiceOwnership => {
  if (serviceOwnership instanceof V1_DeploymentOwnership) {
    return new DeploymentOwnership(serviceOwnership.identifier, parentService);
  } else if (serviceOwnership instanceof V1_UserListOwnership) {
    return new UserListOwnership(serviceOwnership.users, parentService);
  }
  throw new UnsupportedOperationError();
};

export const V1_buildServiceExecution = (
  serviceExecution: V1_ServiceExecution,
  context: V1_GraphBuilderContext,
  parentService: Service,
): ServiceExecution => {
  if (serviceExecution instanceof V1_PureSingleExecution) {
    assertNonNullable(
      serviceExecution.func,
      `Service Pure execution 'func' field is missing`,
    );
    if (serviceExecution.mapping && serviceExecution.runtime) {
      return new PureSingleExecution(
        V1_buildRawLambdaWithResolvedPaths(
          serviceExecution.func.parameters,
          serviceExecution.func.body,
          context,
        ),
        parentService,
        context.resolveMapping(serviceExecution.mapping),
        buildServiceExecutionRuntime(
          serviceExecution.runtime,
          serviceExecution.mapping,
          context,
        ),
      );
    }
    return new PureSingleExecution(
      V1_buildRawLambdaWithResolvedPaths(
        serviceExecution.func.parameters,
        serviceExecution.func.body,
        context,
      ),
      parentService,
      undefined,
      undefined,
    );
  } else if (serviceExecution instanceof V1_PureMultiExecution) {
    assertNonNullable(
      serviceExecution.func,
      `Service Pure execution 'func' field is missing`,
    );
    const execution = new PureMultiExecution(
      serviceExecution.executionKey,
      V1_buildRawLambdaWithResolvedPaths(
        serviceExecution.func.parameters,
        serviceExecution.func.body,
        context,
      ),
      parentService,
    );
    const uniqueKeys = new Set();
    execution.executionParameters = serviceExecution.executionParameters?.map(
      (keyedExecutionParameter) => {
        assertNonEmptyString(
          keyedExecutionParameter.key,
          `Service multi-execution parameter 'key' field is missing`,
        );
        // check duplicated key
        if (uniqueKeys.has(keyedExecutionParameter.key)) {
          throw new GraphBuilderError(
            `Service multi-execution with key '${keyedExecutionParameter.key}' already exists`,
          );
        }
        return new KeyedExecutionParameter(
          keyedExecutionParameter.key,
          context.resolveMapping(keyedExecutionParameter.mapping),
          buildServiceExecutionRuntime(
            keyedExecutionParameter.runtime,
            keyedExecutionParameter.mapping,
            context,
          ),
        );
      },
    );
    return execution;
  }
  throw new UnsupportedOperationError();
};
