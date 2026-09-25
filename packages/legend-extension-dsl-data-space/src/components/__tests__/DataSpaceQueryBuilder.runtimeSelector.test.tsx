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
import { integrationTest } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  DataProduct,
  Mapping,
  ModelAccessPointGroup,
  PackageableElementExplicitReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  QueryBuilder_GraphManagerPreset,
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '@finos/legend-query-builder';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
  DSL_DataSpace_GraphManagerPreset,
} from '../../graph-manager/index.js';
import { DataSpaceQueryBuilderState } from '../../stores/query-builder/DataSpaceQueryBuilderState.js';
import { renderDataSpaceQueryBuilderSetupPanelContent } from '../query-builder/DataSpaceQueryBuilder.js';

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const buildMappingProvider = (
  mapping: Mapping,
  groupId: string,
  dataProductName: string,
): DataSpaceMappingProvider => {
  const group = new ModelAccessPointGroup();
  group.id = groupId;
  group.mapping = PackageableElementExplicitReference.create(mapping);
  const dataProduct = new DataProduct(dataProductName);
  dataProduct.accessPointGroups = [group];
  const provider = new DataSpaceMappingProvider();
  provider.element = PackageableElementExplicitReference.create(dataProduct);
  provider.keys = [groupId];
  return provider;
};

const buildContext = (
  name: string,
  mappingProvider: DataSpaceMappingProvider,
  defaultRuntime: PackageableRuntime | undefined,
): DataSpaceExecutionContext => {
  const ctx = new DataSpaceExecutionContext();
  ctx.name = name;
  ctx.mappingProvider = mappingProvider;
  ctx.defaultRuntime = defaultRuntime
    ? PackageableElementExplicitReference.create(defaultRuntime)
    : undefined;
  return ctx;
};

const buildState = (
  dataSpace: DataSpace,
  executionContext: DataSpaceExecutionContext,
): DataSpaceQueryBuilderState => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
    ])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  return new DataSpaceQueryBuilderState(
    applicationStore,
    TEST__getTestGraphManagerState(pluginManager),
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    QueryBuilderActionConfig.INSTANCE,
    dataSpace,
    executionContext,
    false,
    undefined,
    async () => {
      /* no-op */
    },
  );
};

const renderSetupPanel = async (
  state: DataSpaceQueryBuilderState,
): Promise<ReturnType<typeof render>> => {
  let renderResult!: ReturnType<typeof render>;
  await act(async () => {
    renderResult = render(
      <ApplicationStoreProvider store={state.applicationStore}>
        {renderDataSpaceQueryBuilderSetupPanelContent(state)}
      </ApplicationStoreProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return renderResult;
};

describe(
  integrationTest(
    'DataSpaceQueryBuilder setup panel - Runtime selector visibility',
  ),
  () => {
    test('runtime selector is hidden for a mappingProvider context that has a defaultRuntime, and shown for a mappingProvider context that does not', async () => {
      const mapping = new Mapping('model::UsageStatsMapping');
      const defaultRuntime = new PackageableRuntime(
        'model::LakehouseDefaultRuntime',
      );
      const mappingProviderWithRuntime = buildMappingProvider(
        mapping,
        'usageStatsGroup',
        'model::UsageStatsDataProduct',
      );
      const mappingProviderWithoutRuntime = buildMappingProvider(
        mapping,
        'usageStatsGroup',
        'model::UsageStatsDataProduct',
      );
      const ctxWithRuntime = buildContext(
        'lakehouseWithDefault',
        mappingProviderWithRuntime,
        defaultRuntime,
      );
      const ctxWithoutRuntime = buildContext(
        'lakehouseNoDefault',
        mappingProviderWithoutRuntime,
        undefined,
      );

      const dataSpace = new DataSpace('model::UsageStatsDataSpace');
      dataSpace.package = undefined;
      dataSpace.executionContexts = [ctxWithRuntime, ctxWithoutRuntime];
      dataSpace.defaultExecutionContext = ctxWithRuntime;

      const state = buildState(dataSpace, ctxWithRuntime);
      // Enable the runtime selector explicitly so we're only asserting the
      // per-context gating
      state.setShowRuntimeSelector(true);

      await renderSetupPanel(state);

      // The active context has a defaultRuntime -> the "Runtime" label
      // must NOT be rendered even when showRuntimeSelector is enabled.
      expect(screen.queryByText('Runtime')).toBeNull();

      // Switch to the context without a defaultRuntime.
      await act(async () => {
        state.setExecutionContext(ctxWithoutRuntime);
      });

      expect(state.executionContext).toBe(ctxWithoutRuntime);
      expect(state.executionContext.defaultRuntime).toBeUndefined();

      // Now the "Runtime" label must appear.
      expect(screen.getByText('Runtime')).toBeDefined();

      // Switch back to the context with a defaultRuntime; the label must
      // disappear again.
      await act(async () => {
        state.setExecutionContext(ctxWithRuntime);
      });

      expect(state.executionContext).toBe(ctxWithRuntime);
      expect(state.executionContext.defaultRuntime).toBeDefined();
      expect(screen.queryByText('Runtime')).toBeNull();
    });
  },
);
