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

import { expect, jest, test } from '@jest/globals';
import { flowResult, runInAction } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import {
  MappingTest,
  MappingTestSuite,
  RawLambda,
  type TestResult,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../../../../../__test-utils__/EditorStoreTestUtils.js';
import { MappingEditorState } from '../../MappingEditorState.js';

const MAPPING_PATH = 'model::MyMapping';

const createLambda = (value: string): RawLambda =>
  new RawLambda([], [{ _type: 'string', value }]);

// runs the real regenerate flow of a real mapping testable state; only the engine is faked
const setUp = async (): Promise<{
  testableState: MappingEditorState['mappingTestableState'];
  suite: MappingTestSuite;
  runTests: jest.Mock<() => Promise<TestResult[]>>;
}> => {
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
  const mapping = editorStore.graphManagerState.graph.getMapping(MAPPING_PATH);
  const suite = new MappingTestSuite();
  suite.id = 'suite1';
  suite.func = createLambda('a');
  const mappingTest = new MappingTest();
  mappingTest.id = 'test1';
  mappingTest.storeTestData = [];
  suite.tests = [mappingTest];
  mapping.tests.push(suite);

  // the saved version of the mapping has the query as it was before any edit
  editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
    [
      {
        path: MAPPING_PATH,
        classifierPath: 'meta::pure::mapping::Mapping',
        content: {
          testSuites: [
            {
              id: 'suite1',
              func: { parameters: [], body: [{ _type: 'string', value: 'a' }] },
            },
          ],
        },
      },
    ],
  );
  const runTests = jest.fn<() => Promise<TestResult[]>>(async () => []);
  editorStore.graphManagerState.graphManager.runTests =
    runTests as unknown as typeof editorStore.graphManagerState.graphManager.runTests;

  return {
    testableState: new MappingEditorState(editorStore, mapping)
      .mappingTestableState,
    suite,
    runTests,
  };
};

test(
  unitTest(
    'regenerating clears the query warning, and a later edit brings it back',
  ),
  async () => {
    const { testableState, suite, runTests } = await setUp();
    expect(testableState.isQueryChangedSinceSaved).toBe(false);

    runInAction(() => {
      suite.func = createLambda('changed');
    });
    expect(testableState.isQueryChangedSinceSaved).toBe(true);

    // runs the real override; this is what threw "yield* ... is not iterable"
    await flowResult(testableState.regenerateAllExpectedResults());

    expect(runTests).toHaveBeenCalledTimes(1);
    expect(testableState.isRegeneratingExpectedResultsState.hasSucceeded).toBe(
      true,
    );
    expect(testableState.isQueryChangedSinceSaved).toBe(false);

    runInAction(() => {
      suite.func = createLambda('changed again');
    });
    expect(testableState.isQueryChangedSinceSaved).toBe(true);
  },
);

test(
  unitTest('a failed regenerate does not clear the query warning'),
  async () => {
    const { testableState, suite, runTests } = await setUp();
    runInAction(() => {
      suite.func = createLambda('changed');
    });
    expect(testableState.isQueryChangedSinceSaved).toBe(true);

    runTests.mockRejectedValueOnce(new Error('engine is down'));
    await flowResult(testableState.regenerateAllExpectedResults());

    expect(testableState.isRegeneratingExpectedResultsState.hasFailed).toBe(
      true,
    );
    expect(testableState.isQueryChangedSinceSaved).toBe(true);
  },
);
