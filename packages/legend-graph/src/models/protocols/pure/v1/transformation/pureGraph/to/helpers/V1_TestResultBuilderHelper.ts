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
import { AssertFail } from '../../../../../../../metamodels/pure/test/assertion/status/AssertFail.js';
import type { AssertionStatus } from '../../../../../../../metamodels/pure/test/assertion/status/AssertionStatus.js';
import { AssertPass } from '../../../../../../../metamodels/pure/test/assertion/status/AssertPass.js';
import { EqualToJsonAssertFail } from '../../../../../../../metamodels/pure/test/assertion/status/EqualToJsonAssertFail.js';
import { AtomicTestId } from '../../../../../../../metamodels/pure/test/result/AtomicTestId.js';
import {
  TestError,
  TestFailed,
  TestPassed,
  type TestResult,
} from '../../../../../../../metamodels/pure/test/result/TestResult.js';
import {
  AtomicTest,
  TestSuite,
} from '../../../../../../../metamodels/pure/test/Test.js';
import type { Testable } from '../../../../../../../metamodels/pure/test/Testable.js';
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
): AssertFail => {
  const assertion = guaranteeNonNullable(
    atomicTest.assertions.find((a) => a.id === element.id),
  );
  return new AssertFail(assertion, element.message);
};
const buildAssertPass = (
  element: V1_AssertPass,
  atomicTest: AtomicTest,
): AssertPass => {
  const assertion = guaranteeNonNullable(
    atomicTest.assertions.find((a) => a.id === element.id),
  );
  return new AssertPass(assertion);
};

const buildEqualToJsonAssertFail = (
  element: V1_EqualToJsonAssertFail,
  atomicTest: AtomicTest,
): EqualToJsonAssertFail => {
  const assertion = guaranteeNonNullable(
    atomicTest.assertions.find((a) => a.id === element.id),
  );
  const equalToJsonAssertFail = new EqualToJsonAssertFail(
    assertion,
    element.message,
  );
  equalToJsonAssertFail.actual = element.actual;
  equalToJsonAssertFail.expected = element.expected;
  return equalToJsonAssertFail;
};

const buildAssertionStatus = (
  value: V1_AssertionStatus,
  atomicTest: AtomicTest,
): AssertionStatus => {
  if (value instanceof V1_EqualToJsonAssertFail) {
    return buildEqualToJsonAssertFail(value, atomicTest);
  } else if (value instanceof V1_AssertFail) {
    return buildAssertFail(value, atomicTest);
  } else if (value instanceof V1_AssertPass) {
    return buildAssertPass(value, atomicTest);
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
): TestFailed => {
  const testFailed = new TestFailed();
  testFailed.atomicTestId = buildAtomicTestId(element.atomicTestId, testable);
  testFailed.testable = testable;
  testFailed.assertStatuses = element.assertStatuses.map((e) =>
    buildAssertionStatus(e, testFailed.atomicTestId.atomicTest),
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

export const V1_buildTestResult = (
  element: V1_TestResult,
  testable: Testable,
): TestResult | undefined => {
  if (element instanceof V1_TestPassed) {
    return V1_buildTestPassed(element, testable);
  } else if (element instanceof V1_TestFailed) {
    return V1_buildTestFailed(element, testable);
  } else if (element instanceof V1_TestError) {
    return V1_buildTestError(element, testable);
  }
  throw new UnsupportedOperationError(`Can't build test result`, element);
};
