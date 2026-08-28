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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import {
  Query,
  QueryDataSpaceExecutionContext,
  RawLambda,
} from '@finos/legend-graph';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import {
  TEST_DATA_SPACE_PATH,
  buildContext,
  buildDataSpace,
  buildMapping,
  buildMappingProvider,
  buildRuntime,
  buildState,
} from '../__test-utils__/DataSpaceQueryBuilderStateTestUtils.js';
import type { DataSpaceQueryBuilderState } from '@finos/legend-extension-dsl-data-space/application';

const buildEditorStore = (): ExistingQueryEditorStore => {
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager.usePlugins([new Core_LegendQueryApplicationPlugin()]).install();
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

  editorStore.graphManagerState.graphManager.lambdaToPureCode = (async () =>
    'test-pure-code') as unknown as typeof editorStore.graphManagerState.graphManager.lambdaToPureCode;

  return editorStore;
};

const primeMappingState = (state: DataSpaceQueryBuilderState): void => {
  state.executionContextState.setMapping(buildMapping('CovidLakehouseMapping'));
};

const runPersistence = async (
  state: DataSpaceQueryBuilderState,
): Promise<Query> => {
  const editorStore = buildEditorStore();
  editorStore.queryBuilderState = state;
  primeMappingState(state);

  return editorStore.buildQueryForPersistence(
    new Query(),
    new RawLambda(undefined, undefined),
    undefined,
    undefined,
  );
};

describe(
  unitTest('DataSpaceQueryBuilderState persistence for MAPG contexts'),
  () => {
    test(
      unitTest(
        'a direct-mapping context persists a QueryDataSpaceExecutionContext keyed by the context name',
      ),
      async () => {
        const directContext = buildContext('lake', {
          mapping: buildMapping('CovidLakeMapping'),
          defaultRuntime: buildRuntime('LakeRuntime'),
        });
        const state = buildState(
          buildDataSpace(TEST_DATA_SPACE_PATH, [directContext], 'lake'),
          directContext,
        );

        const persisted = await runPersistence(state);
        const execContext = persisted.executionContext;

        expect(execContext).toBeInstanceOf(QueryDataSpaceExecutionContext);
        const dsExec = execContext as QueryDataSpaceExecutionContext;
        expect(dsExec.dataSpacePath).toBe(TEST_DATA_SPACE_PATH);
        expect(dsExec.executionKey).toBe('lake');
        expect(persisted.content).toBe('test-pure-code');
      },
    );

    test(
      unitTest(
        'a MAPG-backed context persists the same shape as a direct-mapping context - the provider is not carried in the payload',
      ),
      async () => {
        const usageStatsMapping = buildMapping('UsageStatsMapping');
        const mapgContext = buildContext('lakehouse', {
          mappingProvider: buildMappingProvider(usageStatsMapping),
          defaultRuntime: buildRuntime('LakehouseRuntime'),
        });
        const state = buildState(
          buildDataSpace(TEST_DATA_SPACE_PATH, [mapgContext], 'lakehouse'),
          mapgContext,
        );

        const persisted = await runPersistence(state);
        const dsExec =
          persisted.executionContext as QueryDataSpaceExecutionContext;

        expect(persisted.executionContext).toBeInstanceOf(
          QueryDataSpaceExecutionContext,
        );
        expect(dsExec.dataSpacePath).toBe(TEST_DATA_SPACE_PATH);
        expect(dsExec.executionKey).toBe('lakehouse');
        expect(Object.keys(dsExec).sort()).toEqual(
          ['dataSpacePath', 'executionKey'].sort(),
        );
      },
    );

    test(
      unitTest(
        'switching the selected context from MAPG to direct-mapping updates the persisted executionKey',
      ),
      async () => {
        const usageStatsMapping = buildMapping('UsageStatsMapping');
        const runtime = buildRuntime('LakehouseRuntime');
        const mapgContext = buildContext('lakehouse', {
          mappingProvider: buildMappingProvider(usageStatsMapping),
          defaultRuntime: runtime,
        });
        const directContext = buildContext('direct', {
          mapping: usageStatsMapping,
          defaultRuntime: runtime,
        });
        const state = buildState(
          buildDataSpace(
            TEST_DATA_SPACE_PATH,
            [mapgContext, directContext],
            'lakehouse',
          ),
          mapgContext,
        );

        const first = await runPersistence(state);
        expect(
          (first.executionContext as QueryDataSpaceExecutionContext)
            .executionKey,
        ).toBe('lakehouse');

        state.setExecutionContext(directContext);
        const editorStore = buildEditorStore();
        editorStore.queryBuilderState = state;
        const second = await editorStore.buildQueryForPersistence(
          new Query(),
          new RawLambda(undefined, undefined),
          undefined,
          undefined,
        );
        expect(
          (second.executionContext as QueryDataSpaceExecutionContext)
            .executionKey,
        ).toBe('direct');
      },
    );

    test(
      unitTest(
        'a MAPG context whose access-point group id is stale still persists the context name - the engine re-resolves at compile time',
      ),
      async () => {
        const usageStatsMapping = buildMapping('UsageStatsMapping');
        const provider = buildMappingProvider(usageStatsMapping);
        provider.keys = ['aGroupThatWasRenamed'];

        const staleMapgContext = buildContext('lakehouse', {
          mappingProvider: provider,
          defaultRuntime: buildRuntime('LakehouseRuntime'),
        });
        const state = buildState(
          buildDataSpace(TEST_DATA_SPACE_PATH, [staleMapgContext], 'lakehouse'),
          staleMapgContext,
        );

        const persisted = await runPersistence(state);
        const dsExec =
          persisted.executionContext as QueryDataSpaceExecutionContext;

        expect(dsExec.dataSpacePath).toBe(TEST_DATA_SPACE_PATH);
        expect(dsExec.executionKey).toBe('lakehouse');
      },
    );
  },
);
