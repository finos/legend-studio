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
import { act, render, screen } from '@testing-library/react';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from '../../stores/DataSpaceViewerNavigation.js';
import type { DataSpaceViewerState } from '../../stores/DataSpaceViewerState.js';
import {
  type TEST__DataSpaceViewerActionOverrides,
  TEST__getDataSpaceViewerState,
} from '../__test-utils__/DataSpaceViewerTestUtils.js';
import type { V1_DataSpaceAnalysisResult } from '../../graph-manager/index.js';
import TEST_DATA__mappingProviderOnlyContext from './TEST_DATA__DataSpaceViewer__MappingProviderOnlyContext.json' with { type: 'json' };
import TEST_DATA__noContextsAccessorExecutables from './TEST_DATA__DataSpaceViewer__NoContextsAccessorExecutables.json' with { type: 'json' };
import TEST_DATA__mixedContexts from './TEST_DATA__DataSpaceViewer__MixedMappingProviderAndMappingContexts.json' with { type: 'json' };
import TEST_DATA__noExecutionContexts from './TEST_DATA__DataSpaceViewer__NoExecutionContexts.json' with { type: 'json' };

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

const buildViewerState = async (
  V1_analysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
): Promise<DataSpaceViewerState> => {
  const setup = await TEST__getDataSpaceViewerState(V1_analysisResult);
  return setup.viewerState;
};

describe(
  integrationTest('DataSpaceViewerState referencedDataProductPaths'),
  () => {
    test('returns an empty list when analytics has no dataSpaceReferencesMetadataInfo', async () => {
      const viewerState = await buildViewerState(
        TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      expect(
        viewerState.dataSpaceAnalysisResult.dataSpaceReferencesMetadataInfo,
      ).toEqual([]);
      expect(viewerState.referencedDataProductPaths).toEqual([]);
    });

    test('returns a single Data Product path when analytics references one', async () => {
      const viewerState = await buildViewerState(
        TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      expect(viewerState.referencedDataProductPaths).toEqual([
        'test::product::MyProduct',
      ]);
    });

    test('returns all Data Product paths preserving order for multiple references', async () => {
      const viewerState = await buildViewerState(
        TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      expect(viewerState.referencedDataProductPaths).toEqual([
        'test::mix::DataProduct1',
        'test::mix::DataProduct2',
      ]);
    });
  },
);

describe(
  integrationTest('DataSpaceViewerState wikiPageSectionsToRender'),
  () => {
    test('excludes the DataSpace Lakehouse Access section when no Data Products are referenced', async () => {
      const viewerState = await buildViewerState(
        TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      expect(viewerState.referencedDataProductPaths).toHaveLength(0);
      expect(viewerState.wikiPageSectionsToRender).not.toContain(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.DATASPACE_LAKEHOUSE_ACCESS,
      );
    });

    test('includes the DataSpace Lakehouse Access section when at least one Data Product is referenced', async () => {
      const viewerState = await buildViewerState(
        TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      expect(viewerState.referencedDataProductPaths.length).toBeGreaterThan(0);
      expect(viewerState.wikiPageSectionsToRender).toContain(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.DATASPACE_LAKEHOUSE_ACCESS,
      );
    });

    test('drives the layout state valid anchors', async () => {
      const withRefs = await buildViewerState(
        TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      const withoutRefs = await buildViewerState(
        TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      );
      const withRefsAnchors = (
        withRefs.layoutState as unknown as {
          getValidAnchors: () => string[];
        }
      ).getValidAnchors();
      const withoutRefsAnchors = (
        withoutRefs.layoutState as unknown as {
          getValidAnchors: () => string[];
        }
      ).getValidAnchors();
      expect(withRefsAnchors).toContain('dataspace-lakehouse-access');
      expect(withoutRefsAnchors).not.toContain('dataspace-lakehouse-access');
    });
  },
);

describe(integrationTest('DataSpaceLakehouseAccess wiki section'), () => {
  test('renders the section header and description when Data Products are referenced', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__mappingProviderOnlyContext as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    const sectionHeader = guaranteeNonNullable(
      document.querySelector<HTMLElement>(
        '.data-space__viewer__lakehouse-access__header',
      ),
      'DataSpace Lakehouse Access section header should render',
    );
    expect(sectionHeader.textContent).toContain('Data Product Access');
    expect(
      document.querySelector(
        '.data-space__viewer__lakehouse-access__description',
      ),
    ).not.toBeNull();
  });

  test('does not render the section when analytics has no Data Product references', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    expect(
      document.querySelector('.data-space__viewer__lakehouse-access'),
    ).toBeNull();
    expect(
      document.querySelector(
        '.data-space__viewer__lakehouse-access__description',
      ),
    ).toBeNull();
  });

  test('lists each referenced Data Product by its short name', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    const groups = document.querySelectorAll(
      '.data-space__viewer__lakehouse-access__group',
    );
    expect(groups.length).toBe(2);
    const labels = Array.from(
      document.querySelectorAll(
        '.data-space__viewer__lakehouse-access__group__label',
      ),
    ).map((element) => element.textContent);
    expect(labels).toEqual(['DataProduct1', 'DataProduct2']);
  });

  test('starts every group collapsed', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__mixedContexts as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    const carets = document.querySelectorAll(
      '.data-space__viewer__lakehouse-access__group__caret',
    );
    expect(carets.length).toBe(2);
    carets.forEach((caret) => {
      expect(caret.getAttribute('class') ?? '').toContain(
        'data-space__viewer__lakehouse-access__group__caret--collapsed',
      );
    });
    expect(
      document.querySelectorAll(
        '.data-space__viewer__lakehouse-access__group__rows',
      ).length,
    ).toBe(0);
  });

  test('renders in read-only preview mode when no mapping provider access config is wired', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__noContextsAccessorExecutables as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    const actions = document.querySelectorAll(
      '.data-space__viewer__lakehouse-access__group__actions',
    );
    expect(actions.length).toBe(0);
    expect(
      screen.queryByRole('button', { name: /Request Access/i }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Access Granted/i }),
    ).toBeNull();
  });
});
