/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { unitTest } from '@finos/legend-shared/test';
import {
  ConnectionTestData,
  ExternalFormatData,
  Service,
  ServiceTest,
  ServiceTestSuite,
  TestData,
} from '@finos/legend-graph';
import {
  hasServiceTestDataChanged,
  serviceHasTests,
  snapshotServiceTestDataHashes,
} from '../ServiceTestableState.js';

const createSuite = (id: string, data?: string): ServiceTestSuite => {
  const suite = new ServiceTestSuite();
  suite.id = id;
  if (data !== undefined) {
    const embedded = new ExternalFormatData();
    embedded.contentType = 'application/json';
    embedded.data = data;
    const connectionTestData = new ConnectionTestData();
    connectionTestData.connectionId = 'connection';
    connectionTestData.testData = embedded;
    suite.testData = new TestData();
    suite.testData.connectionsTestData = [connectionTestData];
  }
  return suite;
};

const createService = (...suites: ServiceTestSuite[]): Service => {
  const service = new Service('MyService');
  service.tests = suites;
  return service;
};

const addTest = (suite: ServiceTestSuite): void => {
  const serviceTest = new ServiceTest();
  serviceTest.id = `test${suite.tests.length + 1}`;
  suite.tests.push(serviceTest);
};

const setData = (suite: ServiceTestSuite, data: string): void => {
  (
    suite.testData?.connectionsTestData[0]?.testData as ExternalFormatData
  ).data = data;
};

test(
  unitTest('test data is unchanged right after the snapshot is taken'),
  () => {
    const service = createService(createSuite('suite1', '{"a":1}'));
    const snapshot = snapshotServiceTestDataHashes(service);
    expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);
  },
);

test(unitTest('editing a suite test data is detected'), () => {
  const suite = createSuite('suite1', '{"a":1}');
  const service = createService(suite);
  const snapshot = snapshotServiceTestDataHashes(service);

  setData(suite, '{"a":2}');
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(true);

  // changing it back means the tests are no longer out of date
  setData(suite, '{"a":1}');
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);
});

test(unitTest('a fresh snapshot clears a detected change'), () => {
  const suite = createSuite('suite1', '{"a":1}');
  const service = createService(suite);
  setData(suite, '{"a":2}');
  expect(
    hasServiceTestDataChanged(service, snapshotServiceTestDataHashes(service)),
  ).toBe(false);
});

test(
  unitTest('adding a suite after the snapshot does not count as a change'),
  () => {
    const service = createService(createSuite('suite1', '{"a":1}'));
    const snapshot = snapshotServiceTestDataHashes(service);

    service.tests.push(createSuite('suite2', '{"b":1}'));
    expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);
  },
);

test(
  unitTest('deleting a suite does not count as a change for the others'),
  () => {
    const suite1 = createSuite('suite1', '{"a":1}');
    const suite2 = createSuite('suite2', '{"b":1}');
    const service = createService(suite1, suite2);
    const snapshot = snapshotServiceTestDataHashes(service);

    service.tests = [suite1];
    expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);
  },
);

test(unitTest('renaming a suite does not count as a change'), () => {
  const suite = createSuite('suite1', '{"a":1}');
  const service = createService(suite);
  const snapshot = snapshotServiceTestDataHashes(service);

  suite.id = 'renamed';
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);
});

test(unitTest('a change in any one suite is detected'), () => {
  const suite1 = createSuite('suite1', '{"a":1}');
  const suite2 = createSuite('suite2', '{"b":1}');
  const service = createService(suite1, suite2);
  const snapshot = snapshotServiceTestDataHashes(service);

  setData(suite2, '{"b":2}');
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(true);
});

test(unitTest('a suite with no test data is handled'), () => {
  const suite = createSuite('suite1');
  const service = createService(suite);
  const snapshot = snapshotServiceTestDataHashes(service);
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(false);

  // data being added to a suite that had none is a change
  suite.testData = createSuite('x', '{"a":1}').testData;
  expect(hasServiceTestDataChanged(service, snapshot)).toBe(true);
});

test(
  unitTest('serviceHasTests needs at least one test, not just a suite'),
  () => {
    // no suites at all
    expect(serviceHasTests(createService())).toBe(false);

    // a suite with no tests in it
    const emptySuite = createSuite('empty', '{"a":1}');
    const service = createService(emptySuite);
    expect(serviceHasTests(service)).toBe(false);

    // one suite with a test is enough, even if another suite is empty
    const suiteWithTest = createSuite('withTest');
    addTest(suiteWithTest);
    service.tests.push(suiteWithTest);
    expect(serviceHasTests(service)).toBe(true);
  },
);
