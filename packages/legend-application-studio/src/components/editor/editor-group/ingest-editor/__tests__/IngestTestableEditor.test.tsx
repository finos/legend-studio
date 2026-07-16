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

import { afterEach, test, expect, jest } from '@jest/globals';
import {
  findByPlaceholderText,
  findByRole,
  findByText,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import {
  BaseDataResolver,
  EqualToRelation,
  IngestMatViewTest,
  type IngestDefinition,
  RelationElementsData,
} from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import TEST_DATA__IngestTestable from './TEST_DATA__IngestTestable.json' with { type: 'json' };

jest.mock('@finos/legend-lego/code-editor', () => ({
  CodeEditor: () => null,
}));

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const setUpIngestTestingTab = async (): Promise<{
  editorGroup: HTMLElement;
  editorStore: ReturnType<typeof TEST__provideMockedEditorStore>;
  renderResult: Awaited<
    ReturnType<typeof TEST__setUpEditorWithDefaultSDLCData>
  >;
}> => {
  const editorStore = TEST__provideMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__IngestTestable,
  });

  await TEST__openElementFromExplorerTree(
    'ingest::MatViewIngest',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  fireEvent.click(await findByText(editorGroup, 'Testing'));
  await findByText(editorGroup, 'Add Test Suite');

  return {
    editorGroup,
    editorStore,
    renderResult,
  };
};

const createIngestSuite = async (
  editorGroup: HTMLElement,
  renderResult: Awaited<
    ReturnType<typeof TEST__setUpEditorWithDefaultSDLCData>
  >,
  testName: string,
): Promise<void> => {
  fireEvent.click(
    await findByRole(editorGroup, 'button', { name: 'Add Test Suite' }),
  );

  const dialog = await renderResult.findByRole('dialog');
  const testNameInput = await findByPlaceholderText(dialog, 'e.g. test_1');
  fireEvent.change(testNameInput, { target: { value: testName } });
  fireEvent.click(await findByText(dialog, 'Create'));
};

afterEach(() => {
  jest.restoreAllMocks();
});

const getIngestDefinition = (
  editorStore: ReturnType<typeof TEST__provideMockedEditorStore>,
): IngestDefinition =>
  editorStore.graphManagerState.graph.getNullableElement(
    'ingest::MatViewIngest',
  ) as IngestDefinition;

test(
  integrationTest(
    'Create ingest test suite from testing tab uses lambda/accessor metadata',
  ),
  async () => {
    const { editorStore, editorGroup, renderResult } =
      await setUpIngestTestingTab();

    const graphManager = editorStore.graphManagerState.graphManager;
    const ingest = getIngestDefinition(editorStore);
    expect(ingest).toBeDefined();

    const relationColumns = ['id', 'status'];
    jest.spyOn(graphManager, 'getLambdaRelationType').mockResolvedValue({
      columns: relationColumns.map((name) => ({ name })),
    } as never);

    jest.spyOn(graphManager, 'collectAccessorsInRawLambda').mockResolvedValue([
      {
        accessor: 'MATVIEW_DS',
        parentElement: ingest,
        relationType: {
          columns: relationColumns.map((name) => ({ name })),
        },
      },
      {
        accessor: 'SECONDARY_DS',
        parentElement: ingest,
        relationType: {
          columns: relationColumns.map((name) => ({ name })),
        },
      },
    ] as never);

    await createIngestSuite(editorGroup, renderResult, 'test_1');

    await waitFor(() => {
      expect(within(editorGroup).getByText('suite_1')).toBeDefined();
      expect(within(editorGroup).getByText('test_1')).toBeDefined();
    });

    const testSuite = ingest.tests[0];
    expect(testSuite).toBeDefined();
    if (!testSuite) {
      return;
    }
    expect(testSuite.id).toBe('suite_1');
    expect(testSuite.tests.length).toBe(1);

    const generatedTest = testSuite.tests.find(
      (candidate): candidate is IngestMatViewTest =>
        candidate instanceof IngestMatViewTest,
    );
    expect(generatedTest).toBeDefined();
    if (!generatedTest) {
      return;
    }
    expect(generatedTest.id).toBe('test_1');
    expect(generatedTest.datasetId).toBe('MATVIEW_DS');

    const relationAssertion = generatedTest.assertions.find(
      (assertion): assertion is EqualToRelation =>
        assertion instanceof EqualToRelation,
    );
    expect(relationAssertion).toBeDefined();
    if (!relationAssertion) {
      return;
    }
    expect(relationAssertion.expected.paths).toEqual(['MATVIEW_DS']);
    expect(relationAssertion.expected.columns).toEqual(relationColumns);

    const resolver = testSuite.testData.find(
      (testData): testData is BaseDataResolver =>
        testData instanceof BaseDataResolver,
    );
    const relationData =
      resolver?.data instanceof RelationElementsData
        ? resolver.data
        : undefined;
    expect(resolver).toBeDefined();
    expect(resolver?.element.value.path).toBe('ingest::MatViewIngest');
    const relationPaths = (relationData?.relationElements ?? [])
      .map((element) => element.paths[0])
      .sort();
    expect(relationPaths).toEqual(['MATVIEW_DS', 'SECONDARY_DS']);
    expect(relationData?.relationElements.length).toBe(2);
    expect(relationData?.relationElements[0]?.columns).toEqual(relationColumns);
  },
);

test(
  integrationTest(
    'Create ingest test suite from testing tab falls back to default resolver data',
  ),
  async () => {
    const { editorStore, editorGroup, renderResult } =
      await setUpIngestTestingTab();
    const graphManager = editorStore.graphManagerState.graphManager;
    const notifyWarningSpy = jest.spyOn(
      editorStore.applicationStore.notificationService,
      'notifyWarning',
    );

    jest
      .spyOn(graphManager, 'getLambdaRelationType')
      .mockRejectedValue(new Error('mock relation metadata failure'));
    jest
      .spyOn(graphManager, 'collectAccessorsInRawLambda')
      .mockResolvedValue([] as never);

    await createIngestSuite(editorGroup, renderResult, 'test_2');

    await waitFor(() => {
      const ingest = getIngestDefinition(editorStore);
      expect(ingest).toBeDefined();
      expect(ingest.tests[0]).toBeDefined();
      expect(ingest.tests[0]?.testData.length).toBeGreaterThan(0);
    });

    const ingest = getIngestDefinition(editorStore);
    const fallbackSuite = ingest.tests[0];
    expect(fallbackSuite).toBeDefined();
    if (!fallbackSuite) {
      return;
    }
    const fallbackResolver = fallbackSuite.testData.find(
      (testData): testData is BaseDataResolver =>
        testData instanceof BaseDataResolver,
    );
    const fallbackRelationData =
      fallbackResolver?.data instanceof RelationElementsData
        ? fallbackResolver.data
        : undefined;

    const fallbackTest = fallbackSuite.tests.find(
      (candidate): candidate is IngestMatViewTest =>
        candidate instanceof IngestMatViewTest,
    );

    expect(fallbackTest?.datasetId).toBe('MATVIEW_DS');
    expect(fallbackResolver).toBeDefined();
    expect(fallbackResolver?.element.value.path).toBe('ingest::MatViewIngest');
    expect(fallbackRelationData?.relationElements[0]?.paths).toEqual([
      'MATVIEW_DS',
    ]);
    expect(notifyWarningSpy).not.toHaveBeenCalled();
  },
);
