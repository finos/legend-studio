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

import { describe, expect, jest, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from '../../stores/DataSpaceViewerNavigation.js';
import { TEST__getDataSpaceViewerState } from '../__test-utils__/DataSpaceViewerTestUtils.js';
import type { V1_DataSpaceAnalysisResult } from '../../graph-manager/index.js';
import TEST_DATA__mappingProviderNoRuntime from './TEST_DATA__DataSpaceViewer__MappingProviderNoRuntime.json' with { type: 'json' };
import TEST_DATA__noExecutionContexts from './TEST_DATA__DataSpaceViewer__NoExecutionContexts.json' with { type: 'json' };
import TEST_DATA__relationExecutable from './TEST_DATA__DataSpaceViewer__RelationExecutable.json' with { type: 'json' };

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const renderDataSpaceViewer = async (
  V1_analysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
  overrides?: Parameters<typeof TEST__getDataSpaceViewerState>[1],
): Promise<
  Awaited<ReturnType<typeof TEST__getDataSpaceViewerState>> & {
    renderResult: ReturnType<typeof render>;
  }
> => {
  const setup = await TEST__getDataSpaceViewerState(
    V1_analysisResult,
    overrides,
  );
  let renderResult!: ReturnType<typeof render>;
  await act(async () => {
    renderResult = render(
      <ApplicationStoreProvider store={setup.applicationStore}>
        <DataSpaceViewer dataSpaceViewerState={setup.viewerState} />
      </ApplicationStoreProvider>,
    );
    // let async post-init effects settle
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { ...setup, renderResult };
};

describe(integrationTest('DataSpaceViewer'), () => {
  test('renders Open DataProduct button for exec context with mappingProvider and no runtime', async () => {
    const viewDataProduct = jest.fn();
    const { viewerState } = await renderDataSpaceViewer(
      TEST_DATA__mappingProviderNoRuntime as PlainObject<V1_DataSpaceAnalysisResult>,
      { viewDataProduct },
    );
    await act(async () => {
      viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT,
      );
    });

    // The "Open DataProduct" action wired to viewDataProduct should show
    expect(
      screen.getByRole('button', { name: /Open DataProduct/i }),
    ).toBeDefined();
    // The mapping provider path should appear in the exec context entry
    expect(
      screen.getByText(/test::product::UpstreamDataProduct/),
    ).toBeDefined();
    // No runtime dropdown / label should be visible for this exec context
    expect(screen.queryByText('Runtime')).toBeNull();
  });

  test('renders no execution-context UI when there are no execution contexts', async () => {
    const { viewerState } = await renderDataSpaceViewer(
      TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
    );

    // No default exec context and no available exec contexts => no current one
    expect(viewerState.currentExecutionContext).toBeUndefined();
    // Header's execution-context selector should be absent
    expect(screen.queryByText(/Current Execution Context/i)).toBeNull();

    // Even without exec contexts, executables (Quick Start) should still render
    await act(async () => {
      viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      );
    });
    expect(screen.getByText('Sample TDS Executable')).toBeDefined();
  });

  test('renders Relation label for executable with Relation return type', async () => {
    const { viewerState } = await renderDataSpaceViewer(
      TEST_DATA__relationExecutable as PlainObject<V1_DataSpaceAnalysisResult>,
    );
    await act(async () => {
      viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      );
    });

    expect(screen.getByText('Sample Relation Executable')).toBeDefined();
    // Executable header should surface "Relation" as its type label
    expect(screen.getByText('Relation')).toBeDefined();
  });
});
