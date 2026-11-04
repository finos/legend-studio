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
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import {
  ExternalFormatData,
  Mapping,
  MappingTest,
  MappingTestSuite,
  RawLambda,
  StoreTestData,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { TEST__getTestEditorStore } from '../../../../../__test-utils__/EditorStoreTestUtils.js';
import {
  getSavedMappingSuiteQueryHashes,
  hasMappingSuiteQueryChanged,
  hasMappingTestDataChanged,
  mappingHasTests,
  snapshotMappingSuiteQueryHashes,
  snapshotMappingTestDataHashes,
} from '../MappingTestingHelper.js';

const MAPPING_PATH = 'model::MyMapping';

const createLambda = (value: string): RawLambda =>
  new RawLambda([], [{ _type: 'string', value }]);

const createSuite = (id: string, query = 'a'): MappingTestSuite => {
  const suite = new MappingTestSuite();
  suite.id = id;
  suite.func = createLambda(query);
  suite.tests = [];
  return suite;
};

const createStoreTestData = (data: string): StoreTestData => {
  const storeTestData = new StoreTestData();
  storeTestData.store = {
    valueForSerialization: 'model::MyStore',
  } as unknown as StoreTestData['store'];
  const embedded = new ExternalFormatData();
  embedded.contentType = 'application/json';
  embedded.data = data;
  storeTestData.data = embedded;
  return storeTestData;
};

const addTest = (suite: MappingTestSuite, data = '{"a":1}'): MappingTest => {
  const mappingTest = new MappingTest();
  mappingTest.id = `test${suite.tests.length + 1}`;
  mappingTest.storeTestData = [createStoreTestData(data)];
  suite.tests.push(mappingTest);
  return mappingTest;
};

const setData = (mappingTest: MappingTest, data: string): void => {
  (mappingTest.storeTestData[0]?.data as ExternalFormatData).data = data;
};

const createMapping = (...suites: MappingTestSuite[]): Mapping => {
  const mapping = new Mapping('MyMapping');
  mapping.tests = suites;
  return mapping;
};

const createMappingEntity = (suites: object[]): Entity => ({
  path: MAPPING_PATH,
  classifierPath: 'meta::pure::mapping::Mapping',
  content: { _type: 'mapping', name: 'MyMapping', testSuites: suites },
});

test(
  unitTest('mappingHasTests needs at least one test, not just a suite'),
  () => {
    expect(mappingHasTests(createMapping())).toBe(false);

    const emptySuite = createSuite('empty');
    const mapping = createMapping(emptySuite);
    expect(mappingHasTests(mapping)).toBe(false);

    const suiteWithTest = createSuite('withTest');
    addTest(suiteWithTest);
    mapping.tests.push(suiteWithTest);
    expect(mappingHasTests(mapping)).toBe(true);
  },
);

test(unitTest('saved suite query hashes are read per suite id'), () => {
  const entity = createMappingEntity([
    {
      id: 'suite1',
      func: { parameters: [], body: [{ _type: 'string', value: 'a' }] },
    },
    {
      id: 'suite2',
      func: {
        parameters: [],
        body: [
          {
            _type: 'string',
            value: 'b',
            sourceInformation: { startLine: 1, startColumn: 1 },
          },
        ],
      },
    },
    { id: 'noQuery' },
  ]);
  const hashes = getSavedMappingSuiteQueryHashes([entity], MAPPING_PATH);

  expect(hashes.get('suite1')).toBe(createLambda('a').hashCode);
  // source information does not affect the hash
  expect(hashes.get('suite2')).toBe(createLambda('b').hashCode);
  expect(hashes.has('noQuery')).toBe(false);
  expect(getSavedMappingSuiteQueryHashes([], MAPPING_PATH).size).toBe(0);
});

test(unitTest('legacy mapping tests are not mistaken for test suites'), () => {
  const entity = createMappingEntity([]);
  // legacy tests live under `tests` and carry no suite id or query
  (entity.content as { tests?: object[] }).tests = [
    {
      name: 'legacyTest',
      query: { _type: 'lambda', body: [], parameters: [] },
    },
  ];
  expect(getSavedMappingSuiteQueryHashes([entity], MAPPING_PATH).size).toBe(0);
});

test(
  unitTest('a changed suite query is detected, and reverting clears it'),
  () => {
    const suite = createSuite('suite1', 'a');
    const mapping = createMapping(suite);
    const saved = getSavedMappingSuiteQueryHashes(
      [
        createMappingEntity([
          {
            id: 'suite1',
            func: { parameters: [], body: [{ _type: 'string', value: 'a' }] },
          },
        ]),
      ],
      MAPPING_PATH,
    );
    const none = new Map<MappingTestSuite, string>();
    expect(hasMappingSuiteQueryChanged(mapping, saved, none)).toBe(false);

    suite.func = createLambda('changed');
    expect(hasMappingSuiteQueryChanged(mapping, saved, none)).toBe(true);

    suite.func = createLambda('a');
    expect(hasMappingSuiteQueryChanged(mapping, saved, none)).toBe(false);
  },
);

test(
  unitTest(
    'a query the tests were regenerated against no longer counts as changed',
  ),
  () => {
    const suite = createSuite('suite1', 'a');
    const mapping = createMapping(suite);
    const saved = new Map([['suite1', createLambda('a').hashCode]]);

    suite.func = createLambda('changed');
    expect(hasMappingSuiteQueryChanged(mapping, saved, new Map())).toBe(true);

    const regenerated = snapshotMappingSuiteQueryHashes(mapping);
    expect(hasMappingSuiteQueryChanged(mapping, saved, regenerated)).toBe(
      false,
    );

    // editing it again after the regenerate is a new change
    suite.func = createLambda('changed again');
    expect(hasMappingSuiteQueryChanged(mapping, saved, regenerated)).toBe(true);
  },
);

test(unitTest('a suite with no saved version is not flagged'), () => {
  const mapping = createMapping(createSuite('brandNew', 'a'));
  expect(hasMappingSuiteQueryChanged(mapping, new Map(), new Map())).toBe(
    false,
  );
});

test(
  unitTest('editing store test data is detected, and reverting clears it'),
  () => {
    const suite = createSuite('suite1');
    const mappingTest = addTest(suite, '{"a":1}');
    const mapping = createMapping(suite);
    const snapshot = snapshotMappingTestDataHashes(mapping);
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(false);

    setData(mappingTest, '{"a":2}');
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(true);

    setData(mappingTest, '{"a":1}');
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(false);
  },
);

test(unitTest('a fresh test data snapshot clears a detected change'), () => {
  const suite = createSuite('suite1');
  const mappingTest = addTest(suite, '{"a":1}');
  const mapping = createMapping(suite);
  setData(mappingTest, '{"a":2}');
  expect(
    hasMappingTestDataChanged(mapping, snapshotMappingTestDataHashes(mapping)),
  ).toBe(false);
});

test(
  unitTest('adding, deleting or renaming tests is not a test data change'),
  () => {
    const suite = createSuite('suite1');
    const kept = addTest(suite, '{"a":1}');
    const removed = addTest(suite, '{"b":1}');
    const mapping = createMapping(suite);
    const snapshot = snapshotMappingTestDataHashes(mapping);

    addTest(suite, '{"c":1}');
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(false);

    suite.tests = suite.tests.filter((t) => t !== removed);
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(false);

    kept.id = 'renamed';
    expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(false);
  },
);

test(unitTest('a data change in any one suite is detected'), () => {
  const suite1 = createSuite('suite1');
  addTest(suite1, '{"a":1}');
  const suite2 = createSuite('suite2');
  const test2 = addTest(suite2, '{"b":1}');
  const mapping = createMapping(suite1, suite2);
  const snapshot = snapshotMappingTestDataHashes(mapping);

  setData(test2, '{"b":2}');
  expect(hasMappingTestDataChanged(mapping, snapshot)).toBe(true);
});

test(
  unitTest('saved suite query hashes are found in a really serialized mapping'),
  async () => {
    // the saved JSON shape here comes from the actual serializer, not from this test
    const editorStore = TEST__getTestEditorStore();
    await TEST__buildGraphWithEntities(editorStore.graphManagerState, [
      {
        path: MAPPING_PATH,
        classifierPath: 'meta::pure::mapping::Mapping',
        content: {
          _type: 'mapping',
          name: 'MyMapping',
          package: 'model',
          classMappings: [],
          enumerationMappings: [],
          includedMappings: [],
          tests: [],
          testSuites: [],
        },
      },
    ]);
    const mapping =
      editorStore.graphManagerState.graph.getMapping(MAPPING_PATH);
    const suite = createSuite('suite1', 'a');
    mapping.tests.push(suite);

    const entity =
      editorStore.graphManagerState.graphManager.elementToEntity(mapping);
    const hashes = getSavedMappingSuiteQueryHashes([entity], MAPPING_PATH);

    expect(hashes.size).toBe(1);
    expect(hashes.get('suite1')).toBe(suite.func.hashCode);
  },
);

test(
  unitTest(
    'a mapping holding both legacy tests and test suites only exposes the suites',
  ),
  async () => {
    // real serializer output for a mapping with a legacy test AND a new test suite
    const editorStore = TEST__getTestEditorStore();
    await TEST__buildGraphWithEntities(editorStore.graphManagerState, [
      {
        path: 'model::Person',
        classifierPath: 'meta::pure::metamodel::type::Class',
        content: {
          _type: 'class',
          name: 'Person',
          package: 'model',
          properties: [],
        },
      },
      {
        path: MAPPING_PATH,
        classifierPath: 'meta::pure::mapping::Mapping',
        content: {
          _type: 'mapping',
          name: 'MyMapping',
          package: 'model',
          classMappings: [],
          enumerationMappings: [],
          includedMappings: [],
          tests: [
            {
              name: 'legacyTest',
              query: {
                _type: 'lambda',
                parameters: [],
                body: [{ _type: 'string', value: 'legacy' }],
              },
              inputData: [
                {
                  _type: 'object',
                  inputType: 'JSON',
                  sourceClass: 'model::Person',
                  data: '{}',
                },
              ],
              assert: {
                _type: 'expectedOutputMappingTestAssert',
                expectedOutput: '{}',
              },
            },
          ],
          testSuites: [],
        },
      },
    ]);
    const mapping =
      editorStore.graphManagerState.graph.getMapping(MAPPING_PATH);
    const suite = createSuite('suite1', 'a');
    mapping.tests.push(suite);
    expect(mapping.test).toHaveLength(1);
    expect(mapping.tests).toHaveLength(1);

    const entity =
      editorStore.graphManagerState.graphManager.elementToEntity(mapping);
    const content = entity.content as {
      tests?: object[];
      testSuites?: object[];
    };
    expect(content.tests).toHaveLength(1);
    expect(content.testSuites).toHaveLength(1);

    const hashes = getSavedMappingSuiteQueryHashes([entity], MAPPING_PATH);
    expect(Array.from(hashes.keys())).toEqual(['suite1']);
    expect(hashes.get('suite1')).toBe(suite.func.hashCode);
  },
);
