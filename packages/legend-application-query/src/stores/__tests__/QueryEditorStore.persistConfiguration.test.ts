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

import { describe, test, expect } from '@jest/globals';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import { StopWatch } from '@finos/legend-shared';
import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  LightQuery,
  Query,
  QueryExplicitExecutionContextInfo,
  type QueryInfo,
  stub_RawLambda,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import { generateExistingQueryEditorRoute } from '../../__lib__/LegendQueryNavigation.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';

const TEST_QUERY_ID = 'test-query-id';

const buildEditorStore = (
  revisionId?: string | undefined,
  projectVersionId?: string | undefined,
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
    projectVersionId,
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

// `lightQuery` always describes the latest (HEAD) query, whereas `queryInfo`
// describes the revision being viewed, which may have been saved with a
// different version. The graph/persist version must follow `queryInfo`.
const HEAD_VERSION = '2.0.0';
const REVISION_VERSION = '1.0.0';

const makeQueryInfo = (): QueryInfo => ({
  name: 'TestQuery',
  id: TEST_QUERY_ID,
  versionId: REVISION_VERSION,
  groupId: 'org.finos.test',
  artifactId: 'test-artifact',
  executionContext: new QueryExplicitExecutionContextInfo(),
  content: '|1',
  isCurrentUserQuery: true,
});

const buildLoadedEditorStore = (
  projectVersionId?: string | undefined,
): ExistingQueryEditorStore => {
  const store = buildEditorStore(undefined, projectVersionId);
  const headQuery = makeLightQuery();
  headQuery.versionId = HEAD_VERSION;
  store.setLightQuery(headQuery);
  store.setQueryInfo(makeQueryInfo());
  return store;
};

describe(unitTest('ExistingQueryEditorStore.getProjectInfo'), () => {
  test('prefers the project version override when one is provided', () => {
    expect(
      buildLoadedEditorStore('3.0.0-SNAPSHOT').getProjectInfo().versionId,
    ).toBe('3.0.0-SNAPSHOT');
  });

  test('uses the latest query version when there is no override', () => {
    expect(buildLoadedEditorStore().getProjectInfo()).toEqual({
      groupId: 'org.finos.test',
      artifactId: 'test-artifact',
      versionId: HEAD_VERSION,
    });
  });
});

describe(unitTest('ExistingQueryEditorStore persist configuration'), () => {
  const decorate = (projectVersionId?: string | undefined): Query => {
    const query = new Query();
    buildLoadedEditorStore(projectVersionId)
      .getPersistConfiguration(stub_RawLambda(), { update: true })
      .decorator?.(query);
    return query;
  };

  test('stores the latest query version when there is no override', () => {
    expect(decorate().versionId).toBe(HEAD_VERSION);
  });

  test('stores the project version override when one is provided', () => {
    expect(decorate('2.0.0-SNAPSHOT').versionId).toBe('2.0.0-SNAPSHOT');
  });
});

describe(unitTest('ExistingQueryEditorStore project version override'), () => {
  const otherQuery = (): LightQuery => {
    const query = makeLightQuery();
    query.id = 'another-query-id';
    query.groupId = 'org.finos.other';
    query.artifactId = 'other-artifact';
    return query;
  };

  test('carries the override to the query being edited', () => {
    const store = buildEditorStore(undefined, '2.0.0-SNAPSHOT');
    expect(store.getProjectVersionIdOverride(makeLightQuery())).toBe(
      '2.0.0-SNAPSHOT',
    );
  });

  test('does not carry the override to a different query', () => {
    const store = buildEditorStore(undefined, '2.0.0-SNAPSHOT');
    expect(store.getProjectVersionIdOverride(otherQuery())).toBeUndefined();
  });

  test('has no override to carry when none was provided', () => {
    const store = buildEditorStore();
    expect(store.getProjectVersionIdOverride(makeLightQuery())).toBeUndefined();
  });
});

describe(unitTest('ExistingQueryEditorStore.getEditorRoute'), () => {
  test('links to the query without revisionId or projectVersionId', () => {
    const store = buildEditorStore('rev-2', '3.0.0-SNAPSHOT');
    expect(store.getEditorRoute()).toBe(
      generateExistingQueryEditorRoute(TEST_QUERY_ID),
    );
    expect(store.getEditorRoute()).not.toContain('?');
  });
});

describe(
  unitTest('ExistingQueryEditorStore.initializeQueryBuilderState'),
  () => {
    test('does not fetch the query info again when it is already loaded', async () => {
      const store = buildLoadedEditorStore();
      const getQueryInfoSpy = createSpy(
        store.graphManagerState.graphManager,
        'getQueryInfo',
      );
      createSpy(store, 'initQueryBuildStateFromQuery').mockRejectedValue(
        new Error('stop'),
      );
      await expect(
        store.initializeQueryBuilderState(new StopWatch()),
      ).rejects.toThrow('stop');
      expect(getQueryInfoSpy).not.toHaveBeenCalled();
    });
  },
);
