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
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { MultiExecutionServiceTestResult } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/MultiExecutionServiceTestResult.js';
import { AssertFail } from '../../../../../../../../graph/metamodel/pure/test/assertion/status/AssertFail.js';
import type { AssertionStatus } from '../../../../../../../../graph/metamodel/pure/test/assertion/status/AssertionStatus.js';
import { AssertPass } from '../../../../../../../../graph/metamodel/pure/test/assertion/status/AssertPass.js';
import { EqualToJsonAssertFail } from '../../../../../../../../graph/metamodel/pure/test/assertion/status/EqualToJsonAssertFail.js';
import {
  type TestResult,
  TestError,
  TestExecuted,
} from '../../../../../../../../graph/metamodel/pure/test/result/TestResult.js';
import {
  AtomicTest,
  TestSuite,
} from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import type { Testable } from '../../../../../../../../graph/metamodel/pure/test/Testable.js';
import { V1_MultiExecutionServiceTestResult } from '../../../../model/packageableElements/service/V1_MultiExecutionServiceTestResult.js';
import { V1_AssertFail } from '../../../../model/test/assertion/status/V1_AssertFail.js';
import type { V1_AssertionStatus } from '../../../../model/test/assertion/status/V1_AssertionStatus.js';
import { V1_AssertPass } from '../../../../model/test/assertion/status/V1_AssertPass.js';
import { V1_EqualToJsonAssertFail } from '../../../../model/test/assertion/status/V1_EqualToJsonAssertFail.js';
import {
  type V1_TestResult,
  V1_TestExecuted,
  V1_TestError,
} from '../../../../model/test/result/V1_TestResult.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import type { Testable_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/Testable_PureProtocolProcessorPlugin_Extension.js';
import {
  TestExecutionPlanDebug,
  UnknownTestDebug,
  type TestDebug,
} from '../../../../../../../../graph/metamodel/pure/test/result/DebugTestsResult.js';
import {
  V1_TestExecutionPlanDebug,
  V1_UnknownTestDebug,
  type V1_TestDebug,
} from '../../../../engine/test/V1_DebugTestsResult.js';

const buildTestSuite = (
  testable: Testable,
  testSuiteId?: string | undefined,
): TestSuite | undefined =>
  testable.tests
    .filter(filterByType(TestSuite))
    .find((t) => t.id === testSuiteId);

const buildAtomicTest = (
  testable: Testable,
  atomicTestId: string,
  testSuite?: TestSuite,
): AtomicTest => {
  if (testSuite) {
    return guaranteeNonNullable(
      testSuite.tests.find((aT) => aT.id === atomicTestId),
    );
  } else {
    return guaranteeType(
      testable.tests.find((e) => e.id === atomicTestId),
      AtomicTest,
    );
  }
};

const buildAssertFail = (
  element: V1_AssertFail,
  atomicTest: AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
): AssertFail => {
  let assertion = atomicTest.assertions.find((a) => a.id === element.id);
  const extraAssertionBuilder = plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTestableAssertionBuilders?.() ?? [],
  );

  for (const builder of extraAssertionBuilder) {
    const assertionBuilder = builder(atomicTest, element);
    if (assertionBuilder) {
      assertion = assertionBuilder;
    }
  }

  if (assertion) {
    return new AssertFail(assertion, element.message);
  }
  throw new UnsupportedOperationError(
    `Can't build AssertFail: no compatible builder available from plugins`,
    element,
  );
};

const buildAssertPass = (
  element: V1_AssertPass,
  atomicTest: AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
): AssertPass => {
  let assertion = atomicTest.assertions.find((a) => a.id === element.id);
  const extraAssertionBuilder = plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTestableAssertionBuilders?.() ?? [],
  );

  for (const builder of extraAssertionBuilder) {
    const assertionBuilder = builder(atomicTest, element);
    if (assertionBuilder) {
      assertion = assertionBuilder;
    }
  }

  if (assertion) {
    return new AssertPass(assertion);
  }
  throw new UnsupportedOperationError(
    `Can't build AssertPass: no compatible builder available from plugins`,
    element,
  );
};

const buildEqualToJsonAssertFail = (
  element: V1_EqualToJsonAssertFail,
  atomicTest: AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
): EqualToJsonAssertFail => {
  let assertion = atomicTest.assertions.find((a) => a.id === element.id);
  const extraAssertionBuilder = plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTestableAssertionBuilders?.() ?? [],
  );

  for (const builder of extraAssertionBuilder) {
    const assertionBuilder = builder(atomicTest, element);
    if (assertionBuilder) {
      assertion = assertionBuilder;
    }
  }

  if (assertion) {
    const equalToJsonAssertFail = new EqualToJsonAssertFail(
      assertion,
      element.message,
    );
    equalToJsonAssertFail.actual = element.actual;
    equalToJsonAssertFail.expected = element.expected;
    return equalToJsonAssertFail;
  }
  throw new UnsupportedOperationError(
    `Can't build EqualToJsonAssertFail: no compatible builder available from plugins`,
    element,
  );
};

const buildAssertionStatus = (
  value: V1_AssertionStatus,
  atomicTest: AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
): AssertionStatus => {
  if (value instanceof V1_EqualToJsonAssertFail) {
    return buildEqualToJsonAssertFail(value, atomicTest, plugins);
  } else if (value instanceof V1_AssertFail) {
    return buildAssertFail(value, atomicTest, plugins);
  } else if (value instanceof V1_AssertPass) {
    return buildAssertPass(value, atomicTest, plugins);
  }
  throw new UnsupportedOperationError(`Can't build assertion status`, value);
};

export const V1_buildTestError = (
  element: V1_TestError,
  testable: Testable,
): TestError => {
  const testSuite = buildTestSuite(testable, element.testSuiteId);
  const atomicTest = buildAtomicTest(testable, element.atomicTestId, testSuite);
  const testError = new TestError(testSuite, atomicTest);
  testError.testable = testable;
  testError.error = element.error;
  return testError;
};

export const V1_buildTestExecuted = (
  element: V1_TestExecuted,
  testable: Testable,
  plugins: PureProtocolProcessorPlugin[],
): TestExecuted => {
  const testSuite = buildTestSuite(testable, element.testSuiteId);
  const atomicTest = buildAtomicTest(testable, element.atomicTestId, testSuite);
  const testExecuted = new TestExecuted(testSuite, atomicTest);
  testExecuted.testable = testable;
  testExecuted.assertStatuses = element.assertStatuses.map((e) =>
    buildAssertionStatus(e, atomicTest, plugins),
  );
  testExecuted.testExecutionStatus = element.testExecutionStatus;
  return testExecuted;
};

export const V1_buildMultiExecutionServiceTestResult = (
  element: V1_MultiExecutionServiceTestResult,
  testable: Testable,
  plugins: PureProtocolProcessorPlugin[],
): MultiExecutionServiceTestResult => {
  const testSuite = buildTestSuite(testable, element.testSuiteId);
  const atomicTest = buildAtomicTest(testable, element.atomicTestId, testSuite);
  const multi = new MultiExecutionServiceTestResult(testSuite, atomicTest);
  multi.testable = testable;
  multi.keyIndexedTestResults = new Map<string, TestResult>();
  Array.from(element.keyIndexedTestResults.entries()).forEach((result) => {
    multi.keyIndexedTestResults.set(
      result[0],
      V1_buildTestResult(result[1], testable, plugins),
    );
  });
  return multi;
};

export function V1_buildTestResult(
  element: V1_TestResult,
  testable: Testable,
  plugins: PureProtocolProcessorPlugin[],
): TestResult {
  if (element instanceof V1_TestExecuted) {
    return V1_buildTestExecuted(element, testable, plugins);
  } else if (element instanceof V1_TestError) {
    return V1_buildTestError(element, testable);
  } else if (element instanceof V1_MultiExecutionServiceTestResult) {
    return V1_buildMultiExecutionServiceTestResult(element, testable, plugins);
  }
  throw new UnsupportedOperationError(`Can't build test result`, element);
}

export const V1_buildTestExecutionPlanDebug = (
  element: V1_TestExecutionPlanDebug,
  testable: Testable,
): TestExecutionPlanDebug => {
  const testSuite = buildTestSuite(testable, element.testSuiteId);
  const atomicTest = buildAtomicTest(testable, element.atomicTestId, testSuite);
  const compiledDebug = new TestExecutionPlanDebug(testSuite, atomicTest);
  compiledDebug.testable = testable;
  compiledDebug.error = element.error;
  compiledDebug.executionPlan = element.executionPlan;
  compiledDebug.debug = element.debug;
  return compiledDebug;
};

export const V1_buildUnknownTestDebug = (
  element: V1_UnknownTestDebug,
  testable: Testable,
): UnknownTestDebug => {
  const testSuite = buildTestSuite(testable, element.testSuiteId);
  const atomicTest = buildAtomicTest(testable, element.atomicTestId, testSuite);
  const compiledDebug = new UnknownTestDebug(testSuite, atomicTest);
  compiledDebug.testable = testable;
  compiledDebug.error = element.error;
  compiledDebug.value = element.value;
  return compiledDebug;
};

export function V1_buildDebugTestResult(
  element: V1_TestDebug,
  testable: Testable,
): TestDebug {
  if (element instanceof V1_TestExecutionPlanDebug) {
    return V1_buildTestExecutionPlanDebug(element, testable);
  } else if (element instanceof V1_UnknownTestDebug) {
    return V1_buildUnknownTestDebug(element, testable);
  }
  throw new UnsupportedOperationError(`Can't build test result`, element);
}
