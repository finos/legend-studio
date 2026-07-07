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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  type IngestDefinition,
  LakehouseRuntime,
  LegendSDLC,
  PackageableRuntime,
  QueryIngestExecutionContext,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import {
  QueryBuilder_GraphManagerPreset,
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
  TEST_DATA__QueryBuilder_Accessors,
} from '@finos/legend-query-builder';
import { IngestLegendQueryBuilderState } from '../IngestLegendQueryBuilderState.js';

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const buildIngestState = async (options?: {
  swapIngest?: (path: string) => Promise<IngestDefinition>;
  allIngestPaths?: string[];
  setOrigin?: boolean;
}): Promise<{
  state: IngestLegendQueryBuilderState;
  ingest: IngestDefinition;
  applicationStore: InstanceType<typeof ApplicationStore>;
}> => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ])
    .install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__QueryBuilder_Accessors,
  );

  if (options?.setOrigin !== false) {
    // Simulate a query loaded against a specific project version — the
    // creator store's `buildGraph` normally sets this.
    graphManagerState.graph.setOrigin(
      new LegendSDLC('org.finos', 'my-artifact', '1.0.0'),
    );
  }

  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );

  const ingest = guaranteeNonNullable(graphManagerState.graph.ingests[0]);

  const adhocRuntime = new PackageableRuntime('AdhocLakehouseRuntime');
  adhocRuntime.runtimeValue = new LakehouseRuntime('DEV', 'WH');

  const state = new IngestLegendQueryBuilderState(
    applicationStore,
    undefined,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    QueryBuilderActionConfig.INSTANCE,
    ingest,
    options?.allIngestPaths ?? [ingest.path],
    options?.swapIngest ?? (async () => ingest),
    adhocRuntime,
    { groupId: 'org.finos', artifactId: 'my-artifact', versionId: '1.0.0' },
  );

  await state.changeAccessorOwner(ingest);
  return { state, ingest, applicationStore };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(unitTest('IngestLegendQueryBuilderState'), () => {
  test(
    unitTest(
      'accessorOwners returns only the current ingest; compatibleRuntimes is empty',
    ),
    async () => {
      const { state, ingest } = await buildIngestState();
      expect(state.accessorOwners).toEqual([ingest]);
      expect(state.compatibleRuntimes).toEqual([]);
    },
  );

  test(
    unitTest('floatingExecutionElements includes the adhoc runtime'),
    async () => {
      const { state } = await buildIngestState();
      expect(state.floatingExecutionElements).toEqual([state.adhocRuntime]);
    },
  );

  test(
    unitTest(
      'floatingExecutionElements is undefined when the graph has no origin',
    ),
    async () => {
      const { state } = await buildIngestState({ setOrigin: false });
      expect(state.floatingExecutionElements).toBeUndefined();
    },
  );

  test(
    unitTest('lakehouseRuntime exposes the underlying LakehouseRuntime'),
    async () => {
      const { state } = await buildIngestState();
      expect(state.lakehouseRuntime).toBeInstanceOf(LakehouseRuntime);
      expect(state.lakehouseRuntime?.environment).toBe('DEV');
      expect(state.lakehouseRuntime?.warehouse).toBe('WH');
    },
  );

  // -----------------------------------------------------------------------
  // Persistence round-trip: state → QueryIngestExecutionContext
  // -----------------------------------------------------------------------

  test(
    unitTest(
      'getQueryExecutionContext returns QueryIngestExecutionContext with the current ingest path + dataSet',
    ),
    async () => {
      const { state, ingest } = await buildIngestState();
      // Pick the first available data set on this ingest
      const firstAccessor = guaranteeNonNullable(state.accessors[0]);
      await state.changeAccessor(firstAccessor);

      const exec = state.getQueryExecutionContext();
      expect(exec).toBeInstanceOf(QueryIngestExecutionContext);
      const ingestExec = exec as QueryIngestExecutionContext;
      expect(ingestExec.ingestDefinitionPath).toBe(ingest.path);
      expect(ingestExec.dataSet).toBe(firstAccessor.tableName);
      expect(state.dataSet).toBe(firstAccessor.tableName);
    },
  );

  // -----------------------------------------------------------------------
  // changeIngestDefinition (a.k.a. swap)
  // -----------------------------------------------------------------------

  test(
    unitTest(
      'changeIngestDefinition delegates to swapIngest, updates ingestDefinition, and re-derives the accessor',
    ),
    async () => {
      // Lightweight stand-in for the swapped-in ingest. It only needs enough
      // surface for the assertions — the real `changeAccessorOwner` is stubbed
      // below so we don't need a fully-modeled ingest in the graph. Since the
      // fixture only has one real ingest, we can't easily add a second one
      // without doubling the fixture.
      const otherIngest = { path: 'model::OtherIngest' };
      const swapIngest = jest.fn(
        async () => otherIngest as unknown as IngestDefinition,
      );
      const { state, ingest } = await buildIngestState({
        swapIngest,
        allIngestPaths: [
          'ingestion::CARBON_DIOXIDE_EMISSIONS',
          'model::OtherIngest',
        ],
      });

      // Skip the base class' `changeAccessorOwner` implementation — it would
      // try to resolve `otherIngest` in the graph, which our stub isn't part
      // of. We only care that `changeIngestDefinition` calls it with the
      // right argument.
      const changeAccessorOwnerSpy = jest
        .spyOn(state, 'changeAccessorOwner')
        .mockResolvedValue();

      await state.changeIngestDefinition('model::OtherIngest');

      expect(swapIngest).toHaveBeenCalledWith('model::OtherIngest');
      expect(state.ingestDefinition.path).toBe('model::OtherIngest');
      expect(changeAccessorOwnerSpy).toHaveBeenCalledTimes(1);
      expect(
        (
          changeAccessorOwnerSpy.mock.calls[0]?.[0] as unknown as {
            path: string;
          }
        ).path,
      ).toBe('model::OtherIngest');
      expect(state.isSwappingIngest).toBe(false);

      // Sanity: original fixture ingest is not what the state points at now.
      expect(state.ingestDefinition.path).not.toBe(ingest.path);
    },
  );

  test(
    unitTest(
      'changeIngestDefinition is a no-op when the target path matches the current one',
    ),
    async () => {
      const swapIngest = jest.fn();
      const { state, ingest } = await buildIngestState({
        swapIngest: swapIngest as unknown as (
          p: string,
        ) => Promise<IngestDefinition>,
      });
      await state.changeIngestDefinition(ingest.path);
      expect(swapIngest).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'changeIngestDefinition is a no-op while another swap is in progress',
    ),
    async () => {
      const swapIngest = jest.fn();
      const { state } = await buildIngestState({
        swapIngest: swapIngest as unknown as (
          p: string,
        ) => Promise<IngestDefinition>,
      });
      state.isSwappingIngest = true;
      await state.changeIngestDefinition('model::AnyOtherPath');
      expect(swapIngest).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'changeIngestDefinition surfaces errors via notifyError and clears isSwappingIngest',
    ),
    async () => {
      const boom = new Error('swap failed');
      const swapIngest = jest
        .fn<(path: string) => Promise<IngestDefinition>>()
        .mockRejectedValue(boom);
      const { state, applicationStore } = await buildIngestState({
        swapIngest,
      });
      const notifyError = jest
        .spyOn(applicationStore.notificationService, 'notifyError')
        .mockImplementation(() => {
          /* no-op */
        });

      await state.changeIngestDefinition('model::AnyOtherPath');

      expect(swapIngest).toHaveBeenCalledWith('model::AnyOtherPath');
      expect(notifyError).toHaveBeenCalled();
      expect(state.isSwappingIngest).toBe(false);
    },
  );
});
