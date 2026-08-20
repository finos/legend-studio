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
import {
  TEST__GraphManagerPluginManager,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import type { PlainObject } from '@finos/legend-shared';
import { DSL_DataSpace_GraphManagerPreset } from '../DSL_DataSpace_GraphManagerPreset.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import type { DataSpaceAnalysisResult } from '../action/analytics/DataSpaceAnalysis.js';
import type { V1_DataSpaceAnalysisResult } from '../protocol/pure/v1/engine/analytics/V1_DataSpaceAnalysis.js';
import {
  TEST_DATA__analysisResult_contextWithoutMappingOrRuntime,
  TEST_DATA__analysisResult_danglingDefaultExecutionContext,
  TEST_DATA__analysisResult_executableWithoutResult,
  TEST_DATA__analysisResult_noDefaultExecutionContext,
  TEST_DATA__analysisResult_roundtrip,
} from './TEST_DATA__DSL_DataSpace_AnalysisResult.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();

const buildAnalytics = async (
  json: object,
): Promise<DataSpaceAnalysisResult> => {
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem();
  return DSL_DataSpace_getGraphManagerExtension(
    graphManagerState.graphManager,
  ).buildDataSpaceAnalytics(
    json as PlainObject<V1_DataSpaceAnalysisResult>,
    pluginManager.getPureProtocolProcessorPlugins(),
  );
};

describe('build DataSpace analysis result', () => {
  test(
    unitTest('builds a data product with no default execution context'),
    async () => {
      const result = await buildAnalytics(
        TEST_DATA__analysisResult_noDefaultExecutionContext,
      );
      expect(result.defaultExecutionContext).toBeUndefined();
      expect(result.executionContextsIndex.size).toBe(1);
      expect(result.executionContextsIndex.get('onlyContext')).toBeDefined();
    },
  );

  test(
    unitTest(
      'throws when the default execution context names a context that does not exist',
    ),
    async () => {
      await expect(
        buildAnalytics(
          TEST_DATA__analysisResult_danglingDefaultExecutionContext,
        ),
      ).rejects.toThrow(
        `Can't find default execution context 'thisContextDoesNotExist'`,
      );
    },
  );

  test(
    unitTest('carries a mapping provider through to the metamodel'),
    async () => {
      const result = await buildAnalytics(TEST_DATA__analysisResult_roundtrip);

      const mappingBased = result.executionContextsIndex.get('mappingBased');
      expect(mappingBased?.mapping?.path).toBe(
        'test::product::mapping::TestMapping',
      );
      expect(mappingBased?.defaultRuntime?.path).toBe(
        'test::product::runtime::TestRuntime',
      );
      expect(mappingBased?.mappingProvider).toBeUndefined();

      const providerBased = result.executionContextsIndex.get('providerBased');
      expect(providerBased?.mapping).toBeUndefined();
      expect(providerBased?.defaultRuntime).toBeUndefined();
      expect(providerBased?.mappingProvider?.element).toBe(
        'test::product::TestDataProduct',
      );
      expect(providerBased?.mappingProvider?.keys).toEqual([
        'modelAccessGroupPointId',
      ]);
      const executable = result.executables[0];
      expect(executable?.executableReturnType).toBeDefined();
      expect(executable?.executableReturnType?.rawType.name).toBe('String');
    },
  );

  test(
    unitTest('builds a context that has neither mapping nor runtime'),
    async () => {
      const result = await buildAnalytics(
        TEST_DATA__analysisResult_contextWithoutMappingOrRuntime,
      );
      const context = result.executionContextsIndex.get('bareContext');
      expect(context).toBeDefined();
      expect(context?.mapping).toBeUndefined();
      expect(context?.defaultRuntime).toBeUndefined();
      expect(result.defaultExecutionContext).toBe(context);
    },
  );

  test(unitTest('builds an executable with no result'), async () => {
    const result = await buildAnalytics(
      TEST_DATA__analysisResult_executableWithoutResult,
    );
    expect(result.executables).toHaveLength(2);
    expect(result.executables[0]?.result).toBeUndefined();
    expect(result.executables[1]?.result).toBeUndefined();
  });
});
