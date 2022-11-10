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
import { AtomicTestId } from '../../../../../../../../graph/metamodel/pure/test/result/AtomicTestId.js';
import {
  type TestResult,
  TestError,
  TestFailed,
  TestPassed,
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
  V1_TestFailed,
  V1_TestPassed,
  V1_TestError,
} from '../../../../model/test/result/V1_TestResult.js';
import type { V1_AtomicTestId } from '../../../../model/test/V1_AtomicTestId.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import type { Testable_PureProtocolProcessorPlugin_Extension } from '../../../../../Testable_PureProtocolProcessorPlugin_Extension.js';

const buildAtomicTestId = (
  element: V1_AtomicTestId,
  testable: Testable,
): AtomicTestId => {
  const testSuite = testable.tests
    .filter(filterByType(TestSuite))
    .find((t) => t.id === element.testSuiteId);
  let atomicTest: AtomicTest;
  if (testSuite) {
    atomicTest = guaranteeNonNullable(
      testSuite.tests.find((aT) => aT.id === element.atomicTestId),
    );
  } else {
    atomicTest = guaranteeType(
      testable.tests.find((e) => e.id === element.atomicTestId),
      AtomicTest,
    );
  }
  return new AtomicTestId(testSuite, atomicTest);
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
  const testError = new TestError();
  testError.testable = testable;
  testError.atomicTestId = buildAtomicTestId(element.atomicTestId, testable);
  testError.error = element.error;
  return testError;
};
export const V1_buildTestFailed = (
  element: V1_TestFailed,
  testable: Testable,
  plugins: PureProtocolProcessorPlugin[],
): TestFailed => {
  const testFailed = new TestFailed();
  testFailed.atomicTestId = buildAtomicTestId(element.atomicTestId, testable);
  testFailed.testable = testable;
  testFailed.assertStatuses = element.assertStatuses.map((e) =>
    buildAssertionStatus(e, testFailed.atomicTestId.atomicTest, plugins),
  );
  return testFailed;
};

export const V1_buildTestPassed = (
  element: V1_TestPassed,
  testable: Testable,
): TestPassed => {
  const testPassed = new TestPassed();
  testPassed.testable = testable;
  testPassed.atomicTestId = buildAtomicTestId(element.atomicTestId, testable);
  return testPassed;
};

export const V1_buildMultiExecutionServiceTestResult = (
  element: V1_MultiExecutionServiceTestResult,
  testable: Testable,
  plugins: PureProtocolProcessorPlugin[],
): MultiExecutionServiceTestResult => {
  const multi = new MultiExecutionServiceTestResult();
  multi.testable = testable;
  multi.atomicTestId = buildAtomicTestId(element.atomicTestId, testable);
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
  if (element instanceof V1_TestPassed) {
    return V1_buildTestPassed(element, testable);
  } else if (element instanceof V1_TestFailed) {
    return V1_buildTestFailed(element, testable, plugins);
  } else if (element instanceof V1_TestError) {
    return V1_buildTestError(element, testable);
  } else if (element instanceof V1_MultiExecutionServiceTestResult) {
    return V1_buildMultiExecutionServiceTestResult(element, testable, plugins);
  }
  throw new UnsupportedOperationError(`Can't build test result`, element);
}
