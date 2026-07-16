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
  type QueryInfo,
  QueryIngestExecutionContextInfo,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';

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

describe(
  unitTest('ExistingQueryEditorStore.buildGraph – ingest execution context'),
  () => {
    test(
      unitTest(
        'skips full graph build for QueryIngestExecutionContextInfo and routes through buildIngestGraph',
      ),
      async () => {
        const editorStore = await buildEditorStore();
        const exec = new QueryIngestExecutionContextInfo();
        exec.ingestDefinitionPath = 'model::TestIngest';
        exec.dataSet = 'orders';
        editorStore.setQueryInfo(makeQueryInfo(exec));

        let buildFullGraphCalled = false;
        let buildIngestGraphCalledWith:
          | {
              groupId: string;
              artifactId: string;
              versionId: string;
              path: string;
            }
          | undefined;

        // Stub out both possible buildGraph paths so this stays a pure unit
        // test (no depot or graph-manager interaction). We're only verifying
        // that `buildGraph` routes ingest execution contexts to
        // `buildIngestGraph` and bypasses `buildFullGraph`.
        (
          editorStore as unknown as { buildFullGraph: () => Generator }
        ).buildFullGraph = function* () {
          buildFullGraphCalled = true;
        };
        (
          editorStore as unknown as {
            buildIngestGraph: (
              groupId: string,
              artifactId: string,
              versionId: string,
              path: string,
            ) => Generator;
          }
        ).buildIngestGraph = function* (
          groupId: string,
          artifactId: string,
          versionId: string,
          path: string,
        ) {
          buildIngestGraphCalledWith = {
            groupId,
            artifactId,
            versionId,
            path,
          };
        };

        await flowResult(editorStore.buildGraph());

        expect(buildFullGraphCalled).toBe(false);
        expect(buildIngestGraphCalledWith).toEqual({
          groupId: 'org.finos.test',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
          path: 'model::TestIngest',
        });
      },
    );
  },
);
