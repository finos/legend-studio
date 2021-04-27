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
  UnsupportedOperationError,
  assertNonEmptyString,
  assertType,
  assertNonNullable,
} from '@finos/legend-studio-shared';
import { GraphError } from '../../../../../../../MetaModelUtility';
import { CORE_LOG_EVENT } from '../../../../../../../../utils/Logger';
import type { Runtime } from '../../../../../../../metamodels/pure/model/packageableElements/runtime/Runtime';
import { RuntimePointer } from '../../../../../../../metamodels/pure/model/packageableElements/runtime/Runtime';
import type { Service } from '../../../../../../../metamodels/pure/model/packageableElements/service/Service';
import type { ServiceTest } from '../../../../../../../metamodels/pure/model/packageableElements/service/ServiceTest';
import {
  SingleExecutionTest,
  MultiExecutionTest,
  TestContainer,
  KeyedSingleExecutionTest,
} from '../../../../../../../metamodels/pure/model/packageableElements/service/ServiceTest';
import type { ServiceExecution } from '../../../../../../../metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  PureSingleExecution,
  PureMultiExecution,
  KeyedExecutionParameter,
} from '../../../../../../../metamodels/pure/model/packageableElements/service/ServiceExecution';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_ServiceTest } from '../../../../model/packageableElements/service/V1_ServiceTest';
import {
  V1_SingleExecutionTest,
  V1_MultiExecutionTest,
} from '../../../../model/packageableElements/service/V1_ServiceTest';
import type { V1_ServiceExecution } from '../../../../model/packageableElements/service/V1_ServiceExecution';
import {
  V1_PureSingleExecution,
  V1_PureMultiExecution,
} from '../../../../model/packageableElements/service/V1_ServiceExecution';
import type { V1_Runtime } from '../../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_RuntimePointer,
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_StoreConnections,
  V1_IdentifiedConnection,
} from '../../../../model/packageableElements/runtime/V1_Runtime';
import { V1_processEngineRuntime } from './V1_RuntimeBuilderHelper';
import {
  V1_PackageableElementPointer,
  V1_PackageableElementPointerType,
} from '../../../../model/packageableElements/V1_PackageableElement';
import { V1_rawLambdaBuilderWithResolver } from './V1_RawLambdaResolver';

export const V1_processServiceTest = (
  serviceTest: V1_ServiceTest,
  context: V1_GraphBuilderContext,
  parentService: Service,
): ServiceTest => {
  if (serviceTest instanceof V1_SingleExecutionTest) {
    assertType(
      parentService.execution,
      PureSingleExecution,
      'Service with single execution requires a single execution test',
    );
    const singleTest = new SingleExecutionTest(parentService, serviceTest.data);
    singleTest.asserts = serviceTest.asserts.map((assert) => {
      const testContainer = new TestContainer(
        V1_rawLambdaBuilderWithResolver(
          context,
          assert.assert.parameters,
          assert.assert.body,
        ),
        singleTest,
      );
      testContainer.parameterValues = assert.parameterValues;
      return testContainer;
    });
    return singleTest;
  } else if (serviceTest instanceof V1_MultiExecutionTest) {
    assertType(
      parentService.execution,
      PureMultiExecution,
      'Service with multi execution requires a multi execution test',
    );
    const multiTest = new MultiExecutionTest(parentService);
    if (!serviceTest.tests.length) {
      throw new GraphError('Service multi execution test must not be empty');
    }
    const executionKeys = new Set(
      parentService.execution.executionParameters.map(
        (execution) => execution.key,
      ),
    );
    const uniqueKeys = new Set<string>();
    multiTest.tests = serviceTest.tests.map((test) => {
      assertNonEmptyString(
        test.key,
        'Service multi execution test key is missing',
      );
      // check duplicated key
      if (uniqueKeys.has(test.key)) {
        throw new GraphError(
          `Service multi execution test with key '${test.key}' already exists`,
        );
      }
      uniqueKeys.add(test.key);
      const keyedTest = new KeyedSingleExecutionTest(
        test.key,
        parentService,
        test.data,
      );
      keyedTest.asserts = test.asserts.map((assert) => {
        const testContaier = new TestContainer(
          V1_rawLambdaBuilderWithResolver(
            context,
            assert.assert.parameters,
            assert.assert.body,
          ),
          keyedTest,
        );
        testContaier.parameterValues = assert.parameterValues;
        return testContaier;
      });
      return keyedTest;
    });
    // verify matching key values between multi execution and multi execution test
    // NOTE: since test depends on execution, we want to check first if no test is found for an execution
    const testWithoutExecutionKeys = new Set(
      Array.from(uniqueKeys.values()).filter((key) => !executionKeys.has(key)),
    );
    Array.from(uniqueKeys.values()).forEach((key) => executionKeys.delete(key));
    /**
     * Here, we verify matching key values between multi execution and multi test
     * NOTE: since test depends on execution, we definitely want to throw when no execution is found for a test.
     * The other direction is debatable, on one hand it makes sense to have a test for each execution, but very often
     * (and majorly for backward compatibility reasons) we have executions that only differ in connection information
     * like credentials, etc. As such it is immaterial to mandate test for each execution.
     *
     * The being said, the UI should enforce the best practice and make people specify one test per execution regardless
     * As such, here we will warn user if their executions don't have tests, and auto-fill with one.
     */
    if (executionKeys.size) {
      context.logger.error(
        CORE_LOG_EVENT.GRAPH_PROBLEM,
        new GraphError(
          `Execution(s) with key '${Array.from(executionKeys.values()).join(
            ', ',
          )}' do not have a corresponding test`,
        ),
      );
      multiTest.tests = parentService.execution.executionParameters.map(
        (execution) =>
          multiTest.tests.find((test) => test.key === execution.key) ??
          new KeyedSingleExecutionTest(execution.key, parentService, ''),
      );
    } else if (testWithoutExecutionKeys.size) {
      throw new GraphError(
        `Test(s) with key '${Array.from(testWithoutExecutionKeys.values()).join(
          ', ',
        )}' do not have a corresponding execution`,
      );
    }
    return multiTest;
  }
  throw new UnsupportedOperationError();
};

export const V1_processServiceExecutionRuntime = (
  runtime: V1_Runtime,
  mapping: string,
  context: V1_GraphBuilderContext,
): Runtime => {
  const mappingPointer = new V1_PackageableElementPointer(
    V1_PackageableElementPointerType.MAPPING,
    mapping,
  );
  if (runtime instanceof V1_RuntimePointer) {
    assertNonNullable(runtime.runtime, 'Runtime pointer path is missing');
    return new RuntimePointer(context.resolveRuntime(runtime.runtime));
  } else if (runtime instanceof V1_EngineRuntime) {
    runtime.mappings = runtime.mappings.length
      ? runtime.mappings
      : [mappingPointer];
    return V1_processEngineRuntime(runtime, context);
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
        'Legacy runtime embedded connection store is missing',
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
          V1_PackageableElementPointerType.STORE,
          connection.store,
        );
        storeConnections = newStoreConnections;
      }
      storeConnections.storeConnections.push(identifiedConnection);
    });
    return V1_processEngineRuntime(engineRuntime, context);
  }
  throw new UnsupportedOperationError();
};

export const V1_processServiceExecution = (
  serviceExecution: V1_ServiceExecution,
  context: V1_GraphBuilderContext,
  parentService: Service,
): ServiceExecution => {
  if (serviceExecution instanceof V1_PureSingleExecution) {
    assertNonNullable(
      serviceExecution.func,
      'Service Pure execution function is missing',
    );
    return new PureSingleExecution(
      V1_rawLambdaBuilderWithResolver(
        context,
        serviceExecution.func.parameters,
        serviceExecution.func.body,
      ),
      parentService,
      context.resolveMapping(serviceExecution.mapping),
      V1_processServiceExecutionRuntime(
        serviceExecution.runtime,
        serviceExecution.mapping,
        context,
      ),
    );
  } else if (serviceExecution instanceof V1_PureMultiExecution) {
    if (!serviceExecution.executionParameters.length) {
      throw new GraphError('Service multi execution must not be empty');
    }
    assertNonNullable(
      serviceExecution.func,
      'Service Pure execution function is missing',
    );
    assertNonEmptyString(
      serviceExecution.executionKey,
      'Service multi execution key is missing',
    );
    const execution = new PureMultiExecution(
      serviceExecution.executionKey,
      V1_rawLambdaBuilderWithResolver(
        context,
        serviceExecution.func.parameters,
        serviceExecution.func.body,
      ),
      parentService,
    );
    const uniqueKeys = new Set();
    execution.executionParameters = serviceExecution.executionParameters.map(
      (keyedExecutionParameter) => {
        assertNonEmptyString(
          keyedExecutionParameter.key,
          'Service multi execution parameter key is missing',
        );
        // check duplicated key
        if (uniqueKeys.has(keyedExecutionParameter.key)) {
          throw new GraphError(
            `Service multi execution with key '${keyedExecutionParameter.key}' already exists`,
          );
        }
        return new KeyedExecutionParameter(
          keyedExecutionParameter.key,
          context.resolveMapping(keyedExecutionParameter.mapping),
          V1_processServiceExecutionRuntime(
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
