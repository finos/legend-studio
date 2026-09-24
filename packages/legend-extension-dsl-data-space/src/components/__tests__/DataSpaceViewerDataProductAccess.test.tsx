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

import { describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from '../../stores/DataSpaceViewerNavigation.js';
import {
  DataproductReferenceMetadata,
  LakehouseDataProductExecutableAccessorInfo,
} from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import type { DataSpaceViewerState } from '../../stores/DataSpaceViewerState.js';
import {
  type TEST__DataSpaceViewerActionOverrides,
  TEST__getDataSpaceViewerState,
} from '../__test-utils__/DataSpaceViewerTestUtils.js';
import type { V1_DataSpaceAnalysisResult } from '../../graph-manager/index.js';
import TEST_DATA__mappingProviderOnlyContext from './TEST_DATA__DataSpaceViewer__MappingProviderOnlyContext.json' with { type: 'json' };
import TEST_DATA__noContextsAccessorExecutables from './TEST_DATA__DataSpaceViewer__NoContextsAccessorExecutables.json' with { type: 'json' };
import TEST_DATA__mixedContexts from './TEST_DATA__DataSpaceViewer__MixedMappingProviderAndMappingContexts.json' with { type: 'json' };

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const renderDataSpaceViewer = async (
  V1_analysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
  overrides?: TEST__DataSpaceViewerActionOverrides,
): Promise<DataSpaceViewerState> => {
  const setup = await TEST__getDataSpaceViewerState(
    V1_analysisResult,
    overrides,
  );
  await act(async () => {
    render(
      <ApplicationStoreProvider store={setup.applicationStore}>
        <DataSpaceViewer dataSpaceViewerState={setup.viewerState} />
      </ApplicationStoreProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return setup.viewerState;
};

const getActivityBar = (): HTMLElement =>
  guaranteeNonNullable(
    document.querySelector<HTMLElement>(
      '.data-space__viewer__activity-bar__items',
    ),
  );

const getDataAccessSection = (): HTMLElement =>
  guaranteeNonNullable(
    document.querySelector<HTMLElement>('.data-space__viewer__data-access'),
  );

const setActivity = async (
  viewerState: DataSpaceViewerState,
  activity: DATA_SPACE_VIEWER_ACTIVITY_MODE,
): Promise<void> => {
  await act(async () => {
    viewerState.setCurrentActivity(activity);
  });
};

const openDataAccessTabOf = async (
  executableTitle: string,
): Promise<HTMLElement> => {
  const executableItem = guaranteeNonNullable(
    screen
      .getByText(executableTitle)
      .closest<HTMLElement>('.data-space__viewer__quickstart__item'),
    `Can't find quick start item for executable '${executableTitle}'`,
  );
  await act(async () => {
    fireEvent.click(within(executableItem).getByTitle('Data Access'));
  });
  return executableItem;
};

describe(
  integrationTest(
    'DataSpaceViewer Data Product access - single mappingProvider execution context',
  ),
  () => {
    test('builds the references metadata and exposes the mapping provider in the Data Access section', async () => {
      const viewDataProduct = jest.fn();
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
        { viewDataProduct },
      );

      const metadata =
        viewerState.dataSpaceAnalysisResult.dataSpaceReferencesMetadataInfo;
      expect(metadata).toHaveLength(1);
      const entry = guaranteeNonNullable(
        metadata[0],
      ) as DataproductReferenceMetadata;
      expect(entry).toBeInstanceOf(DataproductReferenceMetadata);
      expect(entry.dataproductPath).toBe('test::product::MyProduct');
      expect(entry.production).toBe('2');
      expect(entry.prodParallel).toBe('1');

      expect(
        viewerState.currentExecutionContext?.mappingProvider?.element,
      ).toBe('test::product::MyProduct');
      expect(
        within(getActivityBar()).queryByTitle('Data Access'),
      ).not.toBeNull();

      await setActivity(
        viewerState,
        DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
      );

      const dataAccessSection = getDataAccessSection();
      expect(
        within(dataAccessSection).getByText(
          /test::product::MyProduct\.modelAPG/,
        ),
      ).toBeDefined();
      fireEvent.click(
        within(dataAccessSection).getByRole('button', {
          name: /Open DataProduct/i,
        }),
      );
      expect(viewDataProduct).toHaveBeenCalledWith(
        'test::product::MyProduct',
        2,
      );
    });

    test("an executable served by the mappingProvider context falls back to that context's Data Product and model APG", async () => {
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
        { viewDataProduct: jest.fn() },
      );
      expect(
        viewerState.dataSpaceAnalysisResult.executables[0]
          ?.executableAccessorInfo,
      ).toEqual([]);

      await setActivity(
        viewerState,
        DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      );
      const executableItem = await openDataAccessTabOf(
        'Context Backed Executable',
      );

      expect(
        within(executableItem).getByText('Data Product Access'),
      ).toBeDefined();
      expect(within(executableItem).getByText('MyProduct')).toBeDefined();
      expect(within(executableItem).getByText('modelAPG')).toBeDefined();
      expect(
        within(executableItem).queryByText(
          /This executable is accessed through/,
        ),
      ).toBeNull();
      expect(
        within(executableItem).queryByText(
          'No data access information available',
        ),
      ).toBeNull();
    });
  },
);

describe(
  integrationTest(
    'DataSpaceViewer Data Product access - no execution contexts',
  ),
  () => {
    test('hides the Data Access activity and the Data Access wiki section', async () => {
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__noContextsAccessorExecutables as PlainObject<V1_DataSpaceAnalysisResult>,
      );

      expect(
        viewerState.dataSpaceAnalysisResult.executionContextsIndex.size,
      ).toBe(0);
      expect(viewerState.currentExecutionContext).toBeUndefined();
      expect(within(getActivityBar()).queryByTitle('Data Access')).toBeNull();
      expect(
        document.querySelector('.data-space__viewer__data-access'),
      ).toBeNull();
    });

    test("groups an executable's accessors by Data Product and lists each access point group", async () => {
      const viewDataProduct = jest.fn();
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__noContextsAccessorExecutables as PlainObject<V1_DataSpaceAnalysisResult>,
        { viewDataProduct },
      );

      const accessors = guaranteeNonNullable(
        viewerState.dataSpaceAnalysisResult.executables[0],
      ).executableAccessorInfo;
      expect(accessors).toHaveLength(2);
      accessors.forEach((accessor) => {
        expect(accessor).toBeInstanceOf(
          LakehouseDataProductExecutableAccessorInfo,
        );
      });

      await setActivity(
        viewerState,
        DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      );
      const executableItem = await openDataAccessTabOf('Data Product Accessor');

      expect(
        within(executableItem).getByText('Data Product Access'),
      ).toBeDefined();
      expect(within(executableItem).getByText('MyProduct')).toBeDefined();
      expect(within(executableItem).getByText('group')).toBeDefined();
      expect(within(executableItem).getByText('otherGroup')).toBeDefined();

      fireEvent.click(
        within(executableItem).getByRole('button', {
          name: /Open DataProduct/i,
        }),
      );
      expect(viewDataProduct).toHaveBeenCalledWith('test::acc::MyProduct', 111);
    });
  },
);

describe(
  integrationTest(
    'DataSpaceViewer Data Product access - mixed mappingProvider and mapping contexts',
  ),
  () => {
    test('keeps the Data Access activity and defaults to the mappingProvider context', async () => {
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      );

      expect(
        viewerState.dataSpaceAnalysisResult.executionContextsIndex.size,
      ).toBe(2);
      expect(viewerState.currentExecutionContext?.name).toBe('lakehouse');
      expect(
        viewerState.currentExecutionContext?.mappingProvider?.element,
      ).toBe('test::mix::DataProduct1');
      expect(
        viewerState.dataSpaceAnalysisResult.dataSpaceReferencesMetadataInfo,
      ).toHaveLength(2);
      expect(
        within(getActivityBar()).queryByTitle('Data Access'),
      ).not.toBeNull();
    });

    test('resolves each executable to its own Data Product - accessors for one, the mappingProvider context for the other', async () => {
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
        { viewDataProduct: jest.fn() },
      );
      await setActivity(
        viewerState,
        DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      );

      const accessorItem = await openDataAccessTabOf(
        'Accessor Backed Executable',
      );
      expect(
        within(accessorItem).getByText('Data Product Access'),
      ).toBeDefined();
      expect(within(accessorItem).getByText('DataProduct2')).toBeDefined();
      expect(within(accessorItem).getByText('group')).toBeDefined();

      expect(within(accessorItem).queryByText('DataProduct1')).toBeNull();

      const contextItem = await openDataAccessTabOf(
        'Context Backed Executable',
      );
      expect(
        within(contextItem).getByText('Data Product Access'),
      ).toBeDefined();
      expect(within(contextItem).getByText('DataProduct1')).toBeDefined();
      expect(within(contextItem).getByText('modelAPG')).toBeDefined();
      expect(within(contextItem).queryByText('DataProduct2')).toBeNull();
    });

    test('switching to the plain mapping context drops the mapping provider entry', async () => {
      const viewerState = await renderDataSpaceViewer(
        TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
        { viewDataProduct: jest.fn() },
      );
      const relationalContext = guaranteeNonNullable(
        viewerState.dataSpaceAnalysisResult.executionContextsIndex.get(
          'relational',
        ),
      );
      expect(relationalContext.mappingProvider).toBeUndefined();

      await setActivity(
        viewerState,
        DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
      );
      expect(
        within(getDataAccessSection()).queryByRole('button', {
          name: /Open DataProduct/i,
        }),
      ).not.toBeNull();

      await act(async () => {
        viewerState.setCurrentExecutionContext(relationalContext);
      });
      expect(
        within(getDataAccessSection()).queryByRole('button', {
          name: /Open DataProduct/i,
        }),
      ).toBeNull();
    });
  },
);
