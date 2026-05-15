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
import {
  Core_GraphManagerPreset,
  DataProductAccessType,
  type QueryInfo,
  QueryDataProductLakehouseExecutionContextInfo,
  QueryDataProductModelAccessExecutionContextInfo,
  QueryDataProductNativeExecutionContextInfo,
  V1_DataProductArtifact,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';
import type { LegendQueryDataProductQueryBuilderState } from '../data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';

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

  return new ExistingQueryEditorStore(
    applicationStore as unknown as LegendQueryApplicationStore,
    depotServerClient,
    'test-query-id',
    undefined,
  );
};

const makeQueryInfo = (
  executionContext: QueryInfo['executionContext'],
): QueryInfo => ({
  name: 'TestQuery',
  id: 'test-query-id',
  versionId: '1.0.0',
  groupId: 'org.finos.test',
  artifactId: 'test-artifact',
  executionContext,
  content: '|1',
  isCurrentUserQuery: false,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(
  unitTest(
    'ExistingQueryEditorStore.buildGraph – data product execution contexts',
  ),
  () => {
    test(
      unitTest(
        'skips full graph build for QueryDataProductLakehouseExecutionContextInfo',
      ),
      async () => {
        const editorStore = await buildEditorStore();
        const exec = new QueryDataProductLakehouseExecutionContextInfo();
        exec.dataProductPath = 'model::LakehouseDP';
        exec.accessPointId = 'lhAP1';
        exec.accessGroupId = 'lhGroup1';
        editorStore.setQueryInfo(makeQueryInfo(exec));

        let buildFullGraphCalled = false;
        // Override the buildFullGraph generator to detect calls
        (
          editorStore as unknown as { buildFullGraph: () => Generator }
        ).buildFullGraph = function* () {
          buildFullGraphCalled = true;
        };

        await flowResult(editorStore.buildGraph());

        expect(buildFullGraphCalled).toBe(false);
      },
    );

    test(
      unitTest(
        'skips full graph build for native and model data product exec contexts',
      ),
      async () => {
        for (const exec of [
          Object.assign(new QueryDataProductNativeExecutionContextInfo(), {
            dataProductPath: 'model::NativeDP',
            executionKey: 'ctx1',
          }),
          Object.assign(new QueryDataProductModelAccessExecutionContextInfo(), {
            dataProductPath: 'model::ModelDP',
            accessPointGroupId: 'grp1',
          }),
        ]) {
          const editorStore = await buildEditorStore();
          editorStore.setQueryInfo(makeQueryInfo(exec));
          let buildFullGraphCalled = false;
          (
            editorStore as unknown as { buildFullGraph: () => Generator }
          ).buildFullGraph = function* () {
            buildFullGraphCalled = true;
          };
          await flowResult(editorStore.buildGraph());
          expect(buildFullGraphCalled).toBe(false);
        }
      },
    );
  },
);

describe(
  unitTest('ExistingQueryEditorStore.initQueryBuildStateFromQuery – Lakehouse'),
  () => {
    test(
      unitTest(
        'maps QueryDataProductLakehouseExecutionContextInfo → DataProductAccessType.LAKEHOUSE with accessPointId',
      ),
      async () => {
        const editorStore = await buildEditorStore();
        const exec = new QueryDataProductLakehouseExecutionContextInfo();
        exec.dataProductPath = 'model::LakehouseDP';
        exec.accessPointId = 'lhAP1';
        exec.accessGroupId = 'lhGroup1';
        const queryInfo = makeQueryInfo(exec);

        // Stub artifact fetching so no depot calls are made
        editorStore.fetchDataProductArtifact = async () =>
          new V1_DataProductArtifact();

        // Capture the args passed to the centralised builder, and return a
        // sentinel state to confirm propagation.
        let capturedAccessType: DataProductAccessType | undefined;
        let capturedAccessId: string | undefined;
        let capturedDataProductPath: string | undefined;
        const sentinelState = {
          marker: 'sentinel',
        } as unknown as LegendQueryDataProductQueryBuilderState;

        editorStore.buildDataProductQueryBuilderState = (async (
          _groupId: string,
          _artifactId: string,
          _versionId: string,
          dataProductPath: string,
          _artifact: V1_DataProductArtifact,
          accessId: string,
          accessType: DataProductAccessType,
        ) => {
          capturedDataProductPath = dataProductPath;
          capturedAccessId = accessId;
          capturedAccessType = accessType;
          return sentinelState;
        }) as unknown as typeof editorStore.buildDataProductQueryBuilderState;

        const result =
          await editorStore.initQueryBuildStateFromQuery(queryInfo);

        expect(result).toBe(sentinelState);
        expect(capturedDataProductPath).toBe('model::LakehouseDP');
        expect(capturedAccessId).toBe('lhAP1');
        expect(capturedAccessType).toBe(DataProductAccessType.LAKEHOUSE);
      },
    );

    test(
      unitTest(
        'maps QueryDataProductNativeExecutionContextInfo → DataProductAccessType.NATIVE with executionKey',
      ),
      async () => {
        const editorStore = await buildEditorStore();
        const exec = new QueryDataProductNativeExecutionContextInfo();
        exec.dataProductPath = 'model::NativeDP';
        exec.executionKey = 'ctx1';
        const queryInfo = makeQueryInfo(exec);

        editorStore.fetchDataProductArtifact = async () =>
          new V1_DataProductArtifact();

        let capturedAccessType: DataProductAccessType | undefined;
        let capturedAccessId: string | undefined;
        editorStore.buildDataProductQueryBuilderState = (async (
          _groupId: string,
          _artifactId: string,
          _versionId: string,
          _dataProductPath: string,
          _artifact: V1_DataProductArtifact,
          accessId: string,
          accessType: DataProductAccessType,
        ) => {
          capturedAccessId = accessId;
          capturedAccessType = accessType;
          return {} as LegendQueryDataProductQueryBuilderState;
        }) as unknown as typeof editorStore.buildDataProductQueryBuilderState;

        await editorStore.initQueryBuildStateFromQuery(queryInfo);

        expect(capturedAccessId).toBe('ctx1');
        expect(capturedAccessType).toBe(DataProductAccessType.NATIVE);
      },
    );

    test(
      unitTest(
        'maps QueryDataProductModelAccessExecutionContextInfo → DataProductAccessType.MODEL with accessPointGroupId',
      ),
      async () => {
        const editorStore = await buildEditorStore();
        const exec = new QueryDataProductModelAccessExecutionContextInfo();
        exec.dataProductPath = 'model::ModelDP';
        exec.accessPointGroupId = 'grp1';
        const queryInfo = makeQueryInfo(exec);

        editorStore.fetchDataProductArtifact = async () =>
          new V1_DataProductArtifact();

        let capturedAccessType: DataProductAccessType | undefined;
        let capturedAccessId: string | undefined;
        editorStore.buildDataProductQueryBuilderState = (async (
          _groupId: string,
          _artifactId: string,
          _versionId: string,
          _dataProductPath: string,
          _artifact: V1_DataProductArtifact,
          accessId: string,
          accessType: DataProductAccessType,
        ) => {
          capturedAccessId = accessId;
          capturedAccessType = accessType;
          return {} as LegendQueryDataProductQueryBuilderState;
        }) as unknown as typeof editorStore.buildDataProductQueryBuilderState;

        await editorStore.initQueryBuildStateFromQuery(queryInfo);

        expect(capturedAccessId).toBe('grp1');
        expect(capturedAccessType).toBe(DataProductAccessType.MODEL);
      },
    );
  },
);
