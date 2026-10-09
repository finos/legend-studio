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
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import {
  type PlainObject,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-shared';
import { type DepotServerClient } from '@finos/legend-server-depot';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from '../../stores/DataSpaceViewerNavigation.js';
import {
  DATA_SPACE_QUALITY_LEVEL,
  type DataSpaceQualityResult,
} from '../../stores/DataSpaceQualityState.js';
import { TEST__getDataSpaceViewerState } from '../__test-utils__/DataSpaceViewerTestUtils.js';
import type { V1_DataSpaceAnalysisResult } from '../../graph-manager/index.js';
import TEST_DATA__mappingProviderNoRuntime from './TEST_DATA__DataSpaceViewer__MappingProviderNoRuntime.json' with { type: 'json' };
import TEST_DATA__noExecutionContexts from './TEST_DATA__DataSpaceViewer__NoExecutionContexts.json' with { type: 'json' };
import TEST_DATA__relationExecutable from './TEST_DATA__DataSpaceViewer__RelationExecutable.json' with { type: 'json' };
import TEST_DATA__relatedDataSpaces from './TEST_DATA__DataSpaceViewer__RelatedDataSpaces.json' with { type: 'json' };

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
  test('renders clickable Data Product label for exec context with mappingProvider and no runtime', async () => {
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

    expect(screen.getByTitle('Open Data Product')).toBeDefined();
    expect(
      screen.getByText(/test::product::UpstreamDataProduct/),
    ).toBeDefined();
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

  test('renders the quality badge and AI-Ready stamp when fetchDataSpaceQuality is wired up', async () => {
    const qualityResult: DataSpaceQualityResult = {
      qualityLevel: DATA_SPACE_QUALITY_LEVEL.DIAMOND,
      qualityBreakdown: {
        isDescriptionDocumented: true,
        isExecutablesPresent: true,
        isModelsDocumentationPresent: true,
        isEveryServiceDocumented: true,
        attributeCoverage: 1,
        documentedAttributeCount: 10,
        totalAttributeCount: 10,
      },
    };
    await renderDataSpaceViewer(
      TEST_DATA__mappingProviderNoRuntime as PlainObject<V1_DataSpaceAnalysisResult>,
      { fetchDataSpaceQuality: async () => qualityResult },
    );

    await waitFor(() => {
      expect(screen.getByText(/AI Readiness Badge:/)).toBeDefined();
    });
    expect(screen.getByText('AI-Ready')).toBeDefined();
  });

  test('renders no quality badge when fetchDataSpaceQuality is not wired up', async () => {
    await renderDataSpaceViewer(
      TEST_DATA__mappingProviderNoRuntime as PlainObject<V1_DataSpaceAnalysisResult>,
    );

    expect(screen.queryByText(/AI Readiness Badge:/)).toBeNull();
  });

  test('parses an encoded relatedDataSpaces entry and navigates to the Marketplace legacy DataProduct URL on click', async () => {
    const viewDataSpace = jest.fn();
    const setup = await renderDataSpaceViewer(
      TEST_DATA__relatedDataSpaces as PlainObject<V1_DataSpaceAnalysisResult>,
      { viewDataSpace },
    );
    await act(async () => {
      setup.viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES,
      );
    });

    const button = screen.getByRole('button', {
      name: 'ProgrammaticNewsDataspace',
    });
    expect(button).toBeDefined();

    fireEvent.click(button);

    expect(viewDataSpace).toHaveBeenCalledTimes(1);
    expect(viewDataSpace).toHaveBeenCalledWith(
      'com.gs.vdp:vendor-data-programmatic-news:latest/ProgrammaticNews::dataspace::ProgrammaticNewsDataspace',
    );
  });

  test('renders the resolved DataSpace title (not the path name) for a related DataSpace', async () => {
    const getVersionEntity = jest
      .fn<DepotServerClient['getVersionEntity']>()
      .mockResolvedValue({
        path: 'ProgrammaticNews::dataspace::ProgrammaticNewsDataspace',
        content: { title: 'Programmatic News' },
      });
    const depotServerClient = {
      getVersionEntity,
    } as unknown as DepotServerClient;
    const setup = await renderDataSpaceViewer(
      TEST_DATA__relatedDataSpaces as PlainObject<V1_DataSpaceAnalysisResult>,
      { depotServerClient },
    );
    await act(async () => {
      setup.viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES,
      );
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Programmatic News' }),
      ).toBeDefined(),
    );
    expect(getVersionEntity).toHaveBeenCalledWith(
      'com.gs.vdp',
      'vendor-data-programmatic-news',
      '3.0.0',
      'ProgrammaticNews::dataspace::ProgrammaticNewsDataspace',
    );
    expect(
      screen.queryByRole('button', { name: 'ProgrammaticNewsDataspace' }),
    ).toBeNull();
  });

  test('falls back to the path when a related DataSpace has no title', async () => {
    const getVersionEntity = jest
      .fn<DepotServerClient['getVersionEntity']>()
      .mockResolvedValue({
        path: 'ProgrammaticNews::dataspace::ProgrammaticNewsDataspace',
        content: {},
      });
    const depotServerClient = {
      getVersionEntity,
    } as unknown as DepotServerClient;
    const setup = await renderDataSpaceViewer(
      TEST_DATA__relatedDataSpaces as PlainObject<V1_DataSpaceAnalysisResult>,
      { depotServerClient },
    );
    await act(async () => {
      setup.viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES,
      );
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'ProgrammaticNewsDataspace',
        }),
      ).toBeDefined(),
    );
  });

  test('renders an unresolvable related DataSpace as a disabled button without warning', async () => {
    const getVersionEntity = jest
      .fn<DepotServerClient['getVersionEntity']>()
      .mockRejectedValue(
        new NetworkClientError(
          { status: HttpStatus.NOT_FOUND } as Response,
          undefined,
        ),
      );
    const depotServerClient = {
      getVersionEntity,
    } as unknown as DepotServerClient;
    const setup = await TEST__getDataSpaceViewerState(
      TEST_DATA__relatedDataSpaces as PlainObject<V1_DataSpaceAnalysisResult>,
      { depotServerClient },
    );
    const notifyWarning = jest.spyOn(
      setup.applicationStore.notificationService,
      'notifyWarning',
    );
    await act(async () => {
      render(
        <ApplicationStoreProvider store={setup.applicationStore}>
          <DataSpaceViewer dataSpaceViewerState={setup.viewerState} />
        </ApplicationStoreProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      setup.viewerState.setCurrentActivity(
        DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES,
      );
    });

    const button = await waitFor(() =>
      screen.getByRole('button', { name: 'ProgrammaticNewsDataspace' }),
    );
    expect(button).toHaveProperty('disabled', true);
    expect(notifyWarning).not.toHaveBeenCalled();
  });
});
