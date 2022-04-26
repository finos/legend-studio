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

import { UnsupportedOperationError } from '@finos/legend-shared';
import { AssertFail } from '../../../../../../metamodels/pure/test/assertion/status/AssertFail';
import type { AssertionStatus } from '../../../../../../metamodels/pure/test/assertion/status/AssertionStatus';
import { AssertPass } from '../../../../../../metamodels/pure/test/assertion/status/AssertPass';
import { EqualToJsonAssertFail } from '../../../../../../metamodels/pure/test/assertion/status/EqualToJsonAssertFail';
import type { AtomicTestId } from '../../../../../../metamodels/pure/test/AtomicTestId';
import { V1_AssertFail } from '../../../model/test/assertion/status/V1_AssertFail';
import type { V1_AssertionStatus } from '../../../model/test/assertion/status/V1_AssertionStatus';
import { V1_AssertPass } from '../../../model/test/assertion/status/V1_AssertPass';
import { V1_EqualToJsonAssertFail } from '../../../model/test/assertion/status/V1_EqualToJsonAssertFail';
import { V1_AtomicTestId } from '../../../model/test/V1_AtomicTestId';
import { V1_EqualTo } from '../../../model/test/assertion/V1_EqualTo';
import { V1_EqualToJson } from '../../../model/test/assertion/V1_EqualToJson';
import { EqualTo } from '../../../../../../metamodels/pure/test/assertion/EqualTo';
import { EqualToJson } from '../../../../../../metamodels/pure/test/assertion/EqualToJson';
import { V1_transformExternalFormatData } from './V1_DataElementTransformer';
import type { V1_AtomicTest } from '../../../model/test/V1_AtomicTest';
import type { AtomicTest } from '../../../../../../metamodels/pure/test/AtomicTest';
import { ServiceTest } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTest';
import type { V1_TestAssertion } from '../../../model/test/assertion/V1_TestAssertion';
import type { TestAssertion } from '../../../../../../metamodels/pure/test/assertion/TestAssertion';
import type { TestSuite } from '../../../../../../metamodels/pure/test/TestSuite';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite';
import { V1_TestResult } from '../../../model/test/result/V1_TestResult';
import { V1_TestPassed } from '../../../model/test/result/V1_TestPassed';
import { V1_TestFailed } from '../../../model/test/result/V1_TestFailed';
import { V1_TestError } from '../../../model/test/result/V1_TestError';
import type { TestResult } from '../../../../../../metamodels/pure/test/result/TestResult';
import type { TestPassed } from '../../../../../../metamodels/pure/test/result/TestPassed';
import type { TestFailed } from '../../../../../../metamodels/pure/test/result/TestFailed';
import type { TestError } from '../../../../../../metamodels/pure/test/result/TestError';
import {
  V1_transformServiceTest,
  V1_transformServiceTestSuite,
} from './V1_ServiceTransformer';
import { ServiceTestSuite } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTestSuite';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';

const transformAtomicTestId = (element: AtomicTestId): V1_AtomicTestId => {
  const atomicTestId = new V1_AtomicTestId();
  atomicTestId.atomicTestId = element.atomicTestId;
  atomicTestId.testSuiteId = element.testSuiteId;
  return atomicTestId;
};

const transformAssertFail = (element: AssertFail): V1_AssertFail => {
  const assertFail = new V1_AssertFail();
  assertFail.id = element.id;
  assertFail.message = element.message;
  return assertFail;
};

const transformAssertPass = (element: AssertPass): V1_AssertPass => {
  const assertPass = new V1_AssertPass();
  assertPass.id = element.id;
  return assertPass;
};

const transformEqualToJsonAssertFail = (
  element: EqualToJsonAssertFail,
): V1_EqualToJsonAssertFail => {
  const equalToJsonAssertFail = new V1_EqualToJsonAssertFail();
  equalToJsonAssertFail.id = element.id;
  equalToJsonAssertFail.message = element.message;
  equalToJsonAssertFail.actual = element.actual;
  equalToJsonAssertFail.expected = element.expected;
  return equalToJsonAssertFail;
};

const transformAssertionStatus = (
  value: AssertionStatus,
): V1_AssertionStatus => {
  if (value instanceof EqualToJsonAssertFail) {
    return transformEqualToJsonAssertFail(value);
  } else if (value instanceof AssertFail) {
    return transformAssertFail(value);
  } else if (value instanceof AssertPass) {
    return transformAssertPass(value);
  }
  throw new UnsupportedOperationError(
    `Can't transform assertion status`,
    value,
  );
};

const transformEqualTo = (element: EqualTo): V1_EqualTo => {
  const equalTo = new V1_EqualTo();
  equalTo.id = element.id;
  equalTo.expected = element.expected;
  return equalTo;
};

const transformEqualToJson = (element: EqualToJson): V1_EqualToJson => {
  const equalToJson = new V1_EqualToJson();
  equalToJson.id = element.id;
  equalToJson.expected = V1_transformExternalFormatData(element.expected);
  return equalToJson;
};

export const V1_transformTestError = (element: TestError): V1_TestError => {
  const testError = new V1_TestError();
  testError.testable = element.testable;
  testError.error = element.error;
  testError.atomicTestId = transformAtomicTestId(element.atomicTestId);
  return testError;
};

export const V1_transformTestFailed = (element: TestFailed): V1_TestFailed => {
  const testFailed = new V1_TestFailed();
  testFailed.testable = element.testable;
  testFailed.atomicTestId = transformAtomicTestId(element.atomicTestId);
  testFailed.assertStatuses = element.assertStatuses.map((assertStatus) =>
    transformAssertionStatus(assertStatus),
  );
  return testFailed;
};

export const V1_transformTestPassed = (element: TestPassed): V1_TestPassed => {
  const testPassed = new V1_TestPassed();
  testPassed.testable = element.testable;
  testPassed.atomicTestId = transformAtomicTestId(element.atomicTestId);
  return testPassed;
};

export const V1_transformTestResult = (element: TestResult): V1_TestResult => {
  const testResult = new V1_TestResult();
  testResult.testable = element.testable;
  testResult.atomicTestId = transformAtomicTestId(element.atomicTestId);
  return testResult;
};

export const V1_transformAtomicTest = (value: AtomicTest): V1_AtomicTest => {
  if (value instanceof ServiceTest) {
    return V1_transformServiceTest(value);
  }
  throw new UnsupportedOperationError(`Can't transform atomic test`, value);
};

export const V1_transformTestAssertion = (
  value: TestAssertion,
): V1_TestAssertion => {
  if (value instanceof EqualTo) {
    return transformEqualTo(value);
  } else if (value instanceof EqualToJson) {
    return transformEqualToJson(value);
  }
  throw new UnsupportedOperationError(`Can't transform test assertion`, value);
};

export const V1_transformTestSuite = (
  value: TestSuite,
  context: V1_GraphTransformerContext,
): V1_TestSuite => {
  if (value instanceof ServiceTestSuite) {
    return V1_transformServiceTestSuite(value, context);
  }
  throw new UnsupportedOperationError(`Can't transform test suite`, value);
};
