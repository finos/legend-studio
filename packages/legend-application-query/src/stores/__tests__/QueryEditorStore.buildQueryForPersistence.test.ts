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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  Query,
  QueryDataProductLakehouseExecutionContext,
  QueryExplicitExecutionContext,
  RawLambda,
} from '@finos/legend-graph';
import {
  QueryBuilder_GraphManagerPreset,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const buildEditorStore = async (): Promise<ExistingQueryEditorStore> => {
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([new Core_LegendQueryApplicationPlugin()])
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ])
    .install();

  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );

  const depotServerClient = new DepotServerClient({
    serverUrl: applicationStore.config.depotServerUrl,
  });
  depotServerClient.setTracerService(applicationStore.tracerService);

  const editorStore = new ExistingQueryEditorStore(
    applicationStore as unknown as LegendQueryApplicationStore,
    depotServerClient,
    'test-query-id',
    undefined,
  );

  // Stub the graph manager method we depend on so we don't need a real graph.
  editorStore.graphManagerState.graphManager.lambdaToPureCode = (async () =>
    'test-pure-code') as unknown as typeof editorStore.graphManagerState.graphManager.lambdaToPureCode;

  return editorStore;
};

const makeQueryBuilderStateStub = (options: {
  requiresMappingForExecution: boolean;
  mapping?: unknown;
  executionContext?: unknown;
}): QueryBuilderState =>
  ({
    requiresMappingForExecution: options.requiresMappingForExecution,
    executionContextState: { mapping: options.mapping },
    getQueryExecutionContext: () =>
      options.executionContext ?? new QueryExplicitExecutionContext(),
  }) as unknown as QueryBuilderState;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(unitTest('QueryEditorStore.buildQueryForPersistence'), () => {
  test(
    unitTest(
      'rejects with mapping-required error when queryBuilderState requires a mapping but none is set',
    ),
    async () => {
      const editorStore = await buildEditorStore();
      editorStore.queryBuilderState = makeQueryBuilderStateStub({
        requiresMappingForExecution: true,
        mapping: undefined,
      });

      const query = new Query();
      await expect(
        editorStore.buildQueryForPersistence(
          query,
          new RawLambda(undefined, undefined),
          undefined,
          undefined,
        ),
      ).rejects.toThrow('Query required mapping to update');
    },
  );

  test(
    unitTest(
      'skips mapping assertion when queryBuilderState does not require a mapping (Lakehouse case)',
    ),
    async () => {
      const editorStore = await buildEditorStore();

      const lakehouseExecCtx = new QueryDataProductLakehouseExecutionContext();
      lakehouseExecCtx.dataProductPath = 'model::LakehouseDP';
      lakehouseExecCtx.accessPointId = 'lhAP1';
      lakehouseExecCtx.accessGroupId = 'lhGroup1';
      editorStore.queryBuilderState = makeQueryBuilderStateStub({
        requiresMappingForExecution: false,
        mapping: undefined,
        executionContext: lakehouseExecCtx,
      });

      const query = new Query();
      const result = await editorStore.buildQueryForPersistence(
        query,
        new RawLambda(undefined, undefined),
        undefined,
        undefined,
      );

      // The query should be populated even though no mapping was provided.
      expect(result).toBe(query);
      expect(result.executionContext).toBe(lakehouseExecCtx);
      expect(result.content).toBe('test-pure-code');
    },
  );

  test(
    unitTest(
      'populates query with mapping-based execution context when mapping is present',
    ),
    async () => {
      const editorStore = await buildEditorStore();

      const explicitCtx = new QueryExplicitExecutionContext();
      editorStore.queryBuilderState = makeQueryBuilderStateStub({
        requiresMappingForExecution: true,
        // a non-undefined mapping object is enough to satisfy assertNonNullable
        mapping: { path: 'model::TestMapping' },
        executionContext: explicitCtx,
      });

      const query = new Query();
      const result = await editorStore.buildQueryForPersistence(
        query,
        new RawLambda(undefined, undefined),
        undefined,
        undefined,
      );

      expect(result.executionContext).toBe(explicitCtx);
      expect(result.content).toBe('test-pure-code');
    },
  );
});
