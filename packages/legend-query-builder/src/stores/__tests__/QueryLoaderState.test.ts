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
import { flowResult } from 'mobx';
import { ApplicationStore } from '@finos/legend-application';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import { LightQuery, type V1_Query } from '@finos/legend-graph';
import { QueryLoaderState } from '../QueryLoaderState.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../__test-utils__/QueryBuilderStateTestUtils.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';

const TEST_QUERY_ID = 'test-query-id';

const buildQueryLoaderState = (
  loadQuery: (
    query: LightQuery,
    revisionId?: string | undefined,
  ) => void = () => {
    // no-op for testing
  },
): {
  queryLoaderState: QueryLoaderState;
  graphManager: ReturnType<
    typeof TEST__getTestGraphManagerState
  >['graphManager'];
} => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  const queryLoaderState = new QueryLoaderState(
    applicationStore,
    graphManagerState.graphManager,
    {
      loadQuery,
    },
  );
  return { queryLoaderState, graphManager: graphManagerState.graphManager };
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

describe(unitTest('QueryLoaderState query history'), () => {
  test(
    unitTest(
      'getQueryHistory fetches the revisions and opens the history viewer',
    ),
    async () => {
      const { queryLoaderState, graphManager } = buildQueryLoaderState();
      const query = makeLightQuery();
      const revisions = [
        { id: TEST_QUERY_ID, name: 'TestQuery', version: 'rev-2' },
        { id: TEST_QUERY_ID, name: 'TestQuery', version: 'rev-1' },
      ] as V1_Query[];
      let requestedQueryId: string | undefined;
      (
        graphManager as unknown as {
          getQueryHistory: (queryId: string) => Promise<V1_Query[]>;
        }
      ).getQueryHistory = async (queryId: string) => {
        requestedQueryId = queryId;
        return revisions;
      };

      expect(queryLoaderState.showHistoryViewer).toBe(false);

      await flowResult(queryLoaderState.getQueryHistory(query));

      expect(requestedQueryId).toBe(TEST_QUERY_ID);
      expect(queryLoaderState.historyQuery).toBe(query);
      expect(queryLoaderState.queryHistoryRevisions).toEqual(revisions);
      expect(queryLoaderState.showHistoryViewer).toBe(true);
      expect(queryLoaderState.queryHistoryState.hasCompleted).toBe(true);
    },
  );

  test(
    unitTest('getQueryHistory does not open the viewer when the fetch fails'),
    async () => {
      const { queryLoaderState, graphManager } = buildQueryLoaderState();
      (
        graphManager as unknown as {
          getQueryHistory: (queryId: string) => Promise<V1_Query[]>;
        }
      ).getQueryHistory = async () => {
        throw new Error('boom');
      };

      await flowResult(queryLoaderState.getQueryHistory(makeLightQuery()));

      expect(queryLoaderState.showHistoryViewer).toBe(false);
      expect(queryLoaderState.queryHistoryState.hasFailed).toBe(true);
    },
  );
});

describe(unitTest('QueryLoaderState grammar diff'), () => {
  test(
    unitTest('toggleRevisionForDiff keeps only the two most recent selections'),
    () => {
      const { queryLoaderState } = buildQueryLoaderState();

      queryLoaderState.toggleRevisionForDiff('a');
      queryLoaderState.toggleRevisionForDiff('b');
      expect(queryLoaderState.selectedRevisionKeysForDiff).toEqual(['a', 'b']);

      // selecting a third drops the oldest
      queryLoaderState.toggleRevisionForDiff('c');
      expect(queryLoaderState.selectedRevisionKeysForDiff).toEqual(['b', 'c']);

      // toggling an already-selected key removes it
      queryLoaderState.toggleRevisionForDiff('b');
      expect(queryLoaderState.selectedRevisionKeysForDiff).toEqual(['c']);
    },
  );

  test(
    unitTest('computeHistoryDiff converts both revisions to grammar'),
    async () => {
      const { queryLoaderState, graphManager } = buildQueryLoaderState();
      (
        graphManager as unknown as {
          prettyLambdaContent: (lambda: string) => Promise<string>;
        }
      ).prettyLambdaContent = async (lambda: string) => `pretty(${lambda})`;

      await flowResult(
        queryLoaderState.computeHistoryDiff(
          { label: 'Revision 2', isLatest: false, content: 'lambda-2' },
          { label: 'Revision 1', isLatest: false, content: 'lambda-1' },
        ),
      );

      expect(queryLoaderState.historyDiffGrammars).toEqual({
        from: 'pretty(lambda-2)',
        to: 'pretty(lambda-1)',
      });
      expect(queryLoaderState.historyDiffLabels).toEqual({
        from: 'Revision 2',
        to: 'Revision 1',
      });
      expect(queryLoaderState.showHistoryDiff).toBe(true);
      expect(queryLoaderState.queryHistoryDiffState.hasCompleted).toBe(true);
    },
  );

  test(
    unitTest('computeHistoryDiff fetches the latest version content on demand'),
    async () => {
      const { queryLoaderState, graphManager } = buildQueryLoaderState();
      const query = makeLightQuery();
      let requestedQueryInfoId: string | undefined;
      (
        graphManager as unknown as {
          getQueryHistory: (queryId: string) => Promise<V1_Query[]>;
          getQueryInfo: (queryId: string) => Promise<{ content: string }>;
          prettyLambdaContent: (lambda: string) => Promise<string>;
        }
      ).getQueryHistory = async () => [];
      (
        graphManager as unknown as {
          getQueryInfo: (queryId: string) => Promise<{ content: string }>;
        }
      ).getQueryInfo = async (queryId: string) => {
        requestedQueryInfoId = queryId;
        return { content: 'latest-lambda' };
      };
      (
        graphManager as unknown as {
          prettyLambdaContent: (lambda: string) => Promise<string>;
        }
      ).prettyLambdaContent = async (lambda: string) => `pretty(${lambda})`;

      await flowResult(queryLoaderState.getQueryHistory(query));
      await flowResult(
        queryLoaderState.computeHistoryDiff(
          { label: 'Latest revision', isLatest: true, content: undefined },
          { label: 'Revision 1', isLatest: false, content: 'lambda-1' },
        ),
      );

      expect(requestedQueryInfoId).toBe(TEST_QUERY_ID);
      expect(queryLoaderState.historyDiffGrammars).toEqual({
        from: 'pretty(latest-lambda)',
        to: 'pretty(lambda-1)',
      });
      expect(queryLoaderState.showHistoryDiff).toBe(true);
    },
  );
});

describe(unitTest('QueryLoaderState revert to revision'), () => {
  test(
    unitTest(
      'revertToRevision saves the revision then loads the reverted query',
    ),
    async () => {
      let loadedQuery: LightQuery | undefined;
      const { queryLoaderState, graphManager } = buildQueryLoaderState((q) => {
        loadedQuery = q;
      });
      const query = makeLightQuery();
      let revertArgs: { queryId: string; revisionId: string } | undefined;
      let historyFetchCount = 0;
      (
        graphManager as unknown as {
          getQueryHistory: (queryId: string) => Promise<V1_Query[]>;
          searchQueries: () => Promise<LightQuery[]>;
          revertQueryToRevision: (
            queryId: string,
            revisionId: string,
          ) => Promise<LightQuery>;
        }
      ).getQueryHistory = async () => {
        historyFetchCount += 1;
        return [];
      };
      (
        graphManager as unknown as {
          searchQueries: () => Promise<LightQuery[]>;
        }
      ).searchQueries = async () => [];
      (
        graphManager as unknown as {
          revertQueryToRevision: (
            queryId: string,
            revisionId: string,
          ) => Promise<LightQuery>;
        }
      ).revertQueryToRevision = async (queryId, revisionId) => {
        revertArgs = { queryId, revisionId };
        return query;
      };

      // establish the history context (sets `historyQuery`)
      await flowResult(queryLoaderState.getQueryHistory(query));
      await flowResult(queryLoaderState.revertToRevision('rev-1'));

      expect(revertArgs).toEqual({
        queryId: TEST_QUERY_ID,
        revisionId: 'rev-1',
      });
      expect(queryLoaderState.revertQueryState.hasCompleted).toBe(true);
      // history is fetched once for the initial view; revert now loads the
      // reverted query (as the new head) rather than re-fetching the history
      expect(historyFetchCount).toBe(1);
      expect(loadedQuery).toBe(query);
      // the loader closes so the user lands directly in the reverted query
      expect(queryLoaderState.showHistoryViewer).toBe(false);
      expect(queryLoaderState.isQueryLoaderDialogOpen).toBe(false);
    },
  );
});
