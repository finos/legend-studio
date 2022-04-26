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

import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import { ExternalFormatData } from '../../../../../../../metamodels/pure/data/EmbeddedData';
import { EqualTo } from '../../../../../../../metamodels/pure/test/assertion/EqualTo';
import { EqualToJson } from '../../../../../../../metamodels/pure/test/assertion/EqualToJson';
import { AssertFail } from '../../../../../../../metamodels/pure/test/assertion/status/AssertFail';
import type { AssertionStatus } from '../../../../../../../metamodels/pure/test/assertion/status/AssertionStatus';
import { AssertPass } from '../../../../../../../metamodels/pure/test/assertion/status/AssertPass';
import { EqualToJsonAssertFail } from '../../../../../../../metamodels/pure/test/assertion/status/EqualToJsonAssertFail';
import type { TestAssertion } from '../../../../../../../metamodels/pure/test/assertion/TestAssertion';
import { AtomicTestId } from '../../../../../../../metamodels/pure/test/result/AtomicTestId';
import { TestError } from '../../../../../../../metamodels/pure/test/result/TestError';
import { TestFailed } from '../../../../../../../metamodels/pure/test/result/TestFailed';
import { TestPassed } from '../../../../../../../metamodels/pure/test/result/TestPassed';
import { TestResult } from '../../../../../../../metamodels/pure/test/result/TestResult';
import type {
  AtomicTest,
  TestSuite,
} from '../../../../../../../metamodels/pure/test/Test';
import { V1_ServiceTest } from '../../../../model/packageableElements/service/V1_ServiceTest';
import { V1_ServiceTestSuite } from '../../../../model/packageableElements/service/V1_ServiceTestSuite';
import { V1_AssertFail } from '../../../../model/test/assertion/status/V1_AssertFail';
import type { V1_AssertionStatus } from '../../../../model/test/assertion/status/V1_AssertionStatus';
import { V1_AssertPass } from '../../../../model/test/assertion/status/V1_AssertPass';
import { V1_EqualToJsonAssertFail } from '../../../../model/test/assertion/status/V1_EqualToJsonAssertFail';
import { V1_EqualTo } from '../../../../model/test/assertion/V1_EqualTo';
import { V1_EqualToJson } from '../../../../model/test/assertion/V1_EqualToJson';
import type { V1_TestAssertion } from '../../../../model/test/assertion/V1_TestAssertion';
import type { V1_TestError } from '../../../../model/test/result/V1_TestError';
import type { V1_TestFailed } from '../../../../model/test/result/V1_TestFailed';
import type { V1_TestPassed } from '../../../../model/test/result/V1_TestPassed';
import type { V1_TestResult } from '../../../../model/test/result/V1_TestResult';
import type { V1_AtomicTest } from '../../../../model/test/V1_AtomicTest';
import type { V1_AtomicTestId } from '../../../../model/test/V1_AtomicTestId';
import type { V1_TestSuite } from '../../../../model/test/V1_TestSuite';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';
import { V1_ProtocolToMetaModelEmbeddedDataBuilder } from './V1_DataElementBuilderHelper';
import {
  V1_buildServiceTest,
  V1_buildServiceTestSuite,
} from './V1_ServiceBuilderHelper';

const buildAtomicTestId = (element: V1_AtomicTestId): AtomicTestId => {
  const atomicTestId = new AtomicTestId();
  atomicTestId.atomicTestId = element.atomicTestId;
  atomicTestId.testSuiteId = element.testSuiteId;
  return atomicTestId;
};

const buildAssertFail = (element: V1_AssertFail): AssertFail => {
  const assertFail = new AssertFail();
  assertFail.id = element.id;
  assertFail.message = element.message;
  return assertFail;
};

const buildAssertPass = (element: V1_AssertPass): AssertPass => {
  const assertPass = new AssertPass();
  assertPass.id = element.id;
  return assertPass;
};

const buildEqualToJsonAssertFail = (
  element: V1_EqualToJsonAssertFail,
): EqualToJsonAssertFail => {
  const equalToJsonAssertFail = new EqualToJsonAssertFail();
  equalToJsonAssertFail.id = element.id;
  equalToJsonAssertFail.message = element.message;
  equalToJsonAssertFail.actual = element.actual;
  equalToJsonAssertFail.expected = element.expected;
  return equalToJsonAssertFail;
};

const buildAssertionStatus = (value: V1_AssertionStatus): AssertionStatus => {
  if (value instanceof V1_EqualToJsonAssertFail) {
    return buildEqualToJsonAssertFail(value);
  } else if (value instanceof V1_AssertFail) {
    return buildAssertFail(value);
  } else if (value instanceof V1_AssertPass) {
    return buildAssertPass(value);
  }
  throw new UnsupportedOperationError(`Can't build assertion status`, value);
};

const buildEqualTo = (element: V1_EqualTo): EqualTo => {
  const equalTo = new EqualTo();
  equalTo.id = element.id;
  equalTo.expected = element.expected;
  return equalTo;
};

const buildEqualToJson = (
  element: V1_EqualToJson,
  context: V1_GraphBuilderContext,
): EqualToJson => {
  const equalToJson = new EqualToJson();
  equalToJson.id = element.id;
  equalToJson.expected = guaranteeType(
    element.expected.accept_EmbeddedDataVisitor(
      new V1_ProtocolToMetaModelEmbeddedDataBuilder(context),
    ),
    ExternalFormatData,
  );
  return equalToJson;
};

export const V1_buildTestError = (element: V1_TestError): TestError => {
  const testError = new TestError();
  testError.testable = element.testable;
  testError.error = element.error;
  testError.atomicTestId = buildAtomicTestId(element.atomicTestId);
  return testError;
};

export const V1_buildTestFailed = (element: V1_TestFailed): TestFailed => {
  const testFailed = new TestFailed();
  testFailed.testable = element.testable;
  testFailed.atomicTestId = buildAtomicTestId(element.atomicTestId);
  testFailed.assertStatuses = element.assertStatuses.map((assertStatus) =>
    buildAssertionStatus(assertStatus),
  );
  return testFailed;
};

export const V1_buildTestPassed = (element: V1_TestPassed): TestPassed => {
  const testPassed = new TestPassed();
  testPassed.testable = element.testable;
  testPassed.atomicTestId = buildAtomicTestId(element.atomicTestId);
  return testPassed;
};

export const V1_buildTestResult = (element: V1_TestResult): TestResult => {
  const testResult = new TestResult();
  testResult.testable = element.testable;
  testResult.atomicTestId = buildAtomicTestId(element.atomicTestId);
  return testResult;
};

export const V1_buildAtomicTest = (
  value: V1_AtomicTest,
  context: V1_GraphBuilderContext,
): AtomicTest => {
  if (value instanceof V1_ServiceTest) {
    return V1_buildServiceTest(value, context);
  }
  throw new UnsupportedOperationError(`Can't build atomic test`, value);
};

export const V1_buildTestAssertion = (
  value: V1_TestAssertion,
  context: V1_GraphBuilderContext,
): TestAssertion => {
  if (value instanceof V1_EqualTo) {
    return buildEqualTo(value);
  } else if (value instanceof V1_EqualToJson) {
    return buildEqualToJson(value, context);
  }
  throw new UnsupportedOperationError(`Can't build test assertion`, value);
};

export const V1_buildTestSuite = (
  value: V1_TestSuite,
  context: V1_GraphBuilderContext,
): TestSuite => {
  if (value instanceof V1_ServiceTestSuite) {
    return V1_buildServiceTestSuite(value, context);
  }
  throw new UnsupportedOperationError(`Can't build test suite`, value);
};
