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

import { expect, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  type GraphManagerState,
  type Testable,
  AssertFail,
  AssertPass,
  EqualTo,
  EqualToJson,
  EqualToJsonAssertFail,
  MultiExecutionServiceTestResult,
  ServiceTest,
  TestError,
  TestExecuted,
  TestExecutionStatus,
} from '@finos/legend-graph';
import {
  TEMPORARY__createRelationalDataFromCSV,
  createBareExternalFormat,
  generateExpectedForAssertion,
  regenerateExpectedResultsForTests,
} from '../TestableUtils.js';

const createEqualToJsonAssertion = (expected: string): EqualToJson => {
  const assertion = new EqualToJson();
  assertion.id = 'assertion_1';
  assertion.expected = createBareExternalFormat(undefined, expected);
  return assertion;
};

export const SINGLE_CSV =
  'default\nFirmTable\nLegal_name,id\ncf566,1\nf223f,2\n-----\n';
export const MULTI_TABLE_CSV =
  'default\nFirmTable\nLegal_name,id\ncf566,1\nf223f,2\n-----\ndefault\nPersonTable\nfirm_id,firstName,id\n1,53e,1\n-----\n';

test(unitTest('CreateRelationalDataFromCSV for single table'), () => {
  const single = TEMPORARY__createRelationalDataFromCSV(SINGLE_CSV);
  expect(single.tables.length).toBe(1);
  const table = guaranteeNonNullable(single.tables[0]);
  expect(table.table).toBe('FirmTable');
  expect(table.schema).toBe('default');
  expect(table.values).toBe('Legal_name,id\ncf566,1\nf223f,2\n');
});

test(unitTest('CreateRelationalDataFromCSV for multi table'), () => {
  const multi = TEMPORARY__createRelationalDataFromCSV(MULTI_TABLE_CSV);
  expect(multi.tables.length).toBe(2);
  const firmTable = guaranteeNonNullable(
    multi.tables.find((t) => t.table === 'FirmTable'),
  );
  expect(firmTable.table).toBe('FirmTable');
  expect(firmTable.schema).toBe('default');
  expect(firmTable.values).toBe('Legal_name,id\ncf566,1\nf223f,2\n');

  const personTable = guaranteeNonNullable(
    multi.tables.find((t) => t.table === 'PersonTable'),
  );
  expect(personTable.table).toBe('PersonTable');
  expect(personTable.schema).toBe('default');
  expect(personTable.values).toBe('firm_id,firstName,id\n1,53e,1\n');
});

test(
  unitTest(
    'generateExpectedForAssertion overwrites a failing EqualToJson assertion with the actual value',
  ),
  () => {
    const assertion = createEqualToJsonAssertion('{}');
    const status = new EqualToJsonAssertFail(assertion, 'mismatch');
    status.expected = '{}';
    status.actual = '{"id":1}';

    expect(generateExpectedForAssertion(assertion, status)).toBe(true);
    expect(assertion.expected.data).toBe('{"id":1}');
  },
);

test(
  unitTest(
    'generateExpectedForAssertion leaves assertion types that do not support generation untouched',
  ),
  () => {
    const assertion = new EqualTo();
    assertion.id = 'equalTo_1';
    assertion.expected = {};
    const status = new AssertFail(assertion, 'mismatch');

    expect(generateExpectedForAssertion(assertion, status)).toBe(false);
    expect(assertion.expected).toEqual({});
  },
);

const buildGraphManagerState = (
  results: (TestExecuted | TestError | MultiExecutionServiceTestResult)[],
): GraphManagerState =>
  ({
    graphManager: {
      runTests: async () => results,
    },
    graph: {},
  }) as unknown as GraphManagerState;

test(
  unitTest(
    'regenerateExpectedResultsForTests bulk-regenerates every failing, generatable assertion in a single engine call',
  ),
  async () => {
    // a passing test: nothing should change
    const passingTest = new ServiceTest();
    passingTest.id = 'passingTest';
    const passingAssertion = createEqualToJsonAssertion('{}');
    passingTest.assertions = [passingAssertion];
    const passingResult = new TestExecuted(undefined, passingTest);
    passingResult.testExecutionStatus = TestExecutionStatus.PASS;
    passingResult.assertStatuses = [new AssertPass(passingAssertion)];

    // a failing test with one generatable (EqualToJson) and one non-generatable
    // (EqualTo) assertion
    const failingTest = new ServiceTest();
    failingTest.id = 'failingTest';
    const failingResult = new TestExecuted(undefined, failingTest);
    failingResult.testExecutionStatus = TestExecutionStatus.FAIL;
    const jsonAssertion = createEqualToJsonAssertion('{}');
    const jsonFail = new EqualToJsonAssertFail(jsonAssertion, 'mismatch');
    jsonFail.expected = '{}';
    jsonFail.actual = '{"id":1}';
    const equalToAssertion = new EqualTo();
    equalToAssertion.id = 'equalTo_1';
    equalToAssertion.expected = {};
    const equalToFail = new AssertFail(equalToAssertion, 'mismatch');
    failingResult.assertStatuses = [jsonFail, equalToFail];

    // a test that errored outright before any of its assertions could run -
    // `errored` should count every one of its assertions, not just the test
    const erroredTest = new ServiceTest();
    erroredTest.id = 'erroredTest';
    erroredTest.assertions = [
      createEqualToJsonAssertion('{}'),
      createEqualToJsonAssertion('{}'),
      createEqualToJsonAssertion('{}'),
    ];
    const erroredResult = new TestError(undefined, erroredTest);
    erroredResult.error = 'boom';

    // a multi-execution service test with a single failing key
    const multiTest = new ServiceTest();
    multiTest.id = 'multiTest';
    const multiResult = new MultiExecutionServiceTestResult(
      undefined,
      multiTest,
    );
    const multiKeyedExecuted = new TestExecuted(undefined, multiTest);
    multiKeyedExecuted.testExecutionStatus = TestExecutionStatus.FAIL;
    const multiAssertion = createEqualToJsonAssertion('{}');
    const multiFail = new EqualToJsonAssertFail(multiAssertion, 'mismatch');
    multiFail.expected = '{}';
    multiFail.actual = '{"id":2}';
    multiKeyedExecuted.assertStatuses = [multiFail];
    multiResult.keyIndexedTestResults.set('env1', multiKeyedExecuted);

    const graphManagerState = buildGraphManagerState([
      passingResult,
      failingResult,
      erroredResult,
      multiResult,
    ]);
    const testable = { tests: [] } as unknown as Testable;

    const summary = await regenerateExpectedResultsForTests(
      testable,
      [],
      graphManagerState,
    );

    expect(summary.regenerated).toBe(2);
    expect(summary.unchanged).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.errored).toBe(3);
    expect(jsonAssertion.expected.data).toBe('{"id":1}');
    expect(multiAssertion.expected.data).toBe('{"id":2}');
  },
);

test(
  unitTest(
    'regenerateExpectedResultsForTests evaluates every multi-execution key independently',
  ),
  async () => {
    // a multi-execution service test with a passing key, a failing key, and an
    // errored key - the passing key must not hide the other two, and each must
    // be tallied on its own terms (regenerated / errored-by-assertion-count)
    const multiTest = new ServiceTest();
    multiTest.id = 'multiTest';
    const multiResult = new MultiExecutionServiceTestResult(
      undefined,
      multiTest,
    );

    // the passing key's test only has one assertion
    const passingKeyTest = new ServiceTest();
    passingKeyTest.id = 'passingKeyTest';
    const passingKeyExecuted = new TestExecuted(undefined, passingKeyTest);
    passingKeyExecuted.testExecutionStatus = TestExecutionStatus.PASS;
    const passingKeyAssertion = createEqualToJsonAssertion('{}');
    passingKeyTest.assertions = [passingKeyAssertion];
    passingKeyExecuted.assertStatuses = [new AssertPass(passingKeyAssertion)];

    const failingKeyExecuted = new TestExecuted(undefined, multiTest);
    failingKeyExecuted.testExecutionStatus = TestExecutionStatus.FAIL;
    const failingKeyAssertion = createEqualToJsonAssertion('{}');
    const failingKeyFail = new EqualToJsonAssertFail(
      failingKeyAssertion,
      'mismatch',
    );
    failingKeyFail.expected = '{}';
    failingKeyFail.actual = '{"env":"key2"}';
    failingKeyExecuted.assertStatuses = [failingKeyFail];

    // a third key that errored outright - its (2) assertions should count
    // toward `errored`, not just 1 for the key/test
    multiTest.assertions = [passingKeyAssertion, failingKeyAssertion];
    const erroredKeyResult = new TestError(undefined, multiTest);
    erroredKeyResult.error = 'boom';

    // insertion order matters for the bug this guards against: the passing key
    // is inserted (and therefore found) first
    multiResult.keyIndexedTestResults.set('key1', passingKeyExecuted);
    multiResult.keyIndexedTestResults.set('key2', failingKeyExecuted);
    multiResult.keyIndexedTestResults.set('key3', erroredKeyResult);

    const graphManagerState = buildGraphManagerState([multiResult]);
    const testable = { tests: [] } as unknown as Testable;

    const summary = await regenerateExpectedResultsForTests(
      testable,
      [],
      graphManagerState,
    );

    expect(summary.unchanged).toBe(1);
    expect(summary.regenerated).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.errored).toBe(2);
    expect(failingKeyAssertion.expected.data).toBe('{"env":"key2"}');
  },
);

test(
  unitTest(
    'regenerateExpectedResultsForTests counts unchanged from the canonical assertion list for passing tests',
  ),
  async () => {
    // the engine reports a passing test without per-assertion statuses, so
    // `unchanged` must come from the test's own assertion list
    const passingTest = new ServiceTest();
    passingTest.id = 'passingTest';
    passingTest.assertions = [
      createEqualToJsonAssertion('{}'),
      createEqualToJsonAssertion('{}'),
      createEqualToJsonAssertion('{}'),
    ];
    const passingResult = new TestExecuted(undefined, passingTest);
    passingResult.testExecutionStatus = TestExecutionStatus.PASS;
    passingResult.assertStatuses = [];

    const summary = await regenerateExpectedResultsForTests(
      { tests: [] } as unknown as Testable,
      [],
      buildGraphManagerState([passingResult]),
    );

    expect(summary.unchanged).toBe(3);
    expect(summary.regenerated).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.errored).toBe(0);
  },
);
