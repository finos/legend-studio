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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  LightQuery,
  type QueryInfo,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';

const TEST_QUERY_ID = 'test-query-id';

const buildEditorStore = (
  revisionId?: string | undefined,
): ExistingQueryEditorStore => {
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

  return new ExistingQueryEditorStore(
    applicationStore as unknown as LegendQueryApplicationStore,
    depotServerClient,
    TEST_QUERY_ID,
    undefined,
    revisionId,
  );
};

const makeLightQuery = (): LightQuery => {
  const lightQuery = new LightQuery();
  lightQuery.name = 'TestQuery';
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '1.0.0';
  lightQuery.groupId = 'org.finos.test';
  lightQuery.artifactId = 'test-artifact';
  return lightQuery;
};

const makeQueryInfo = (): QueryInfo => ({
  name: 'TestQuery',
  id: TEST_QUERY_ID,
  versionId: '1.0.0',
  groupId: 'org.finos.test',
  artifactId: 'test-artifact',
  executionContext: {},
  content: '|1',
  isCurrentUserQuery: false,
});

describe(unitTest('ExistingQueryEditorStore query revision (history)'), () => {
  test(
    unitTest(
      'threads the revisionId into getQueryInfo when setting up the editor state',
    ),
    async () => {
      const revisionId = '1700000000000';
      const editorStore = buildEditorStore(revisionId);
      const graphManager = editorStore.graphManagerState.graphManager;

      const getQueryInfo = jest
        .fn<(queryId: string, revisionId?: string) => Promise<QueryInfo>>()
        .mockResolvedValue(makeQueryInfo());
      graphManager.getQueryInfo =
        getQueryInfo as unknown as typeof graphManager.getQueryInfo;
      graphManager.getLightQuery = (async () =>
        makeLightQuery()) as typeof graphManager.getLightQuery;

      await (
        editorStore as unknown as { setUpEditorState: () => Promise<void> }
      ).setUpEditorState();

      expect(editorStore.revisionId).toBe(revisionId);
      expect(getQueryInfo).toHaveBeenCalledWith(TEST_QUERY_ID, revisionId);
    },
  );

  test(
    unitTest('passes revisionId as undefined when loading the latest query'),
    async () => {
      const editorStore = buildEditorStore();
      const graphManager = editorStore.graphManagerState.graphManager;

      const getQueryInfo = jest
        .fn<(queryId: string, revisionId?: string) => Promise<QueryInfo>>()
        .mockResolvedValue(makeQueryInfo());
      graphManager.getQueryInfo =
        getQueryInfo as unknown as typeof graphManager.getQueryInfo;
      graphManager.getLightQuery = (async () =>
        makeLightQuery()) as typeof graphManager.getLightQuery;

      await (
        editorStore as unknown as { setUpEditorState: () => Promise<void> }
      ).setUpEditorState();

      expect(editorStore.revisionId).toBeUndefined();
      expect(getQueryInfo).toHaveBeenCalledWith(TEST_QUERY_ID, undefined);
    },
  );
});
