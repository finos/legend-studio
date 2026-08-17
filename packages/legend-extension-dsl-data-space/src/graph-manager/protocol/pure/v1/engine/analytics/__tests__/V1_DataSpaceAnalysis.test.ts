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

import { beforeAll, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { V1_PackageableType } from '@finos/legend-graph';
import {
  TEST__GraphManagerPluginManager,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import type { PlainObject } from '@finos/legend-shared';
import { serialize } from 'serializr';
import { DSL_DataSpace_GraphManagerPreset } from '../../../../../../DSL_DataSpace_GraphManagerPreset.js';
import {
  type V1_DataSpaceAnalysisResult,
  V1_dataSpaceAnalysisResultModelSchema,
  V1_DataSpaceMultiExecutionServiceExecutableInfo,
  V1_deserializeDataSpaceAnalysisResult,
} from '../V1_DataSpaceAnalysis.js';
import {
  TEST_DATA__analysisResult_contextWithoutMappingOrRuntime,
  TEST_DATA__analysisResult_executableWithoutResult,
  TEST_DATA__analysisResult_multiExecutionExecutable,
  TEST_DATA__analysisResult_noDefaultExecutionContext,
  TEST_DATA__analysisResult_roundtrip,
} from '../../../../../../__tests__/TEST_DATA__DSL_DataSpace_AnalysisResult.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();
const plugins = pluginManager.getPureProtocolProcessorPlugins();

beforeAll(async () => {
  await TEST__getTestGraphManagerState(pluginManager).graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
});

const deserialize = (json: object): V1_DataSpaceAnalysisResult =>
  V1_deserializeDataSpaceAnalysisResult(
    json as PlainObject<V1_DataSpaceAnalysisResult>,
    plugins,
  );

const serializeAnalysisResult = (
  analysisResult: V1_DataSpaceAnalysisResult,
): PlainObject<V1_DataSpaceAnalysisResult> =>
  serialize(V1_dataSpaceAnalysisResultModelSchema(plugins), analysisResult);

test(unitTest('round-trips an analysis result'), () => {
  const roundtripped = serializeAnalysisResult(
    deserialize(TEST_DATA__analysisResult_roundtrip),
  );
  expect(roundtripped).toEqual(TEST_DATA__analysisResult_roundtrip);
});

test(
  unitTest('deserializes an execution context backed by a mapping provider'),
  () => {
    const result = deserialize(TEST_DATA__analysisResult_roundtrip);

    const mappingBased = result.executionContexts.find(
      (ctx) => ctx.name === 'mappingBased',
    );
    expect(mappingBased?.mapping).toBe('test::product::mapping::TestMapping');
    expect(mappingBased?.defaultRuntime).toBe(
      'test::product::runtime::TestRuntime',
    );
    expect(mappingBased?.mappingProvider).toBeUndefined();

    const providerBased = result.executionContexts.find(
      (ctx) => ctx.name === 'providerBased',
    );
    expect(providerBased?.mapping).toBeUndefined();
    expect(providerBased?.defaultRuntime).toBeUndefined();
    expect(providerBased?.mappingProvider?.element).toBe(
      'test::product::TestDataProduct',
    );
    expect(providerBased?.mappingProvider?.keys).toEqual([
      'modelAccessGroupPointId',
    ]);
  },
);

test(
  unitTest('tolerates an execution context with no mapping and no runtime'),
  () => {
    const result = deserialize(
      TEST_DATA__analysisResult_contextWithoutMappingOrRuntime,
    );
    const context = result.executionContexts[0];
    expect(context?.name).toBe('bareContext');
    expect(context?.mapping).toBeUndefined();
    expect(context?.defaultRuntime).toBeUndefined();
    expect(context?.mappingProvider).toBeUndefined();
  },
);

test(unitTest('tolerates a missing default execution context'), () => {
  const result = deserialize(
    TEST_DATA__analysisResult_noDefaultExecutionContext,
  );
  expect(result.defaultExecutionContext).toBeUndefined();
  expect(result.executionContexts).toHaveLength(1);
});

test(unitTest('tolerates an executable with a missing or null result'), () => {
  const result = deserialize(TEST_DATA__analysisResult_executableWithoutResult);
  expect(result.executables).toHaveLength(2);
  expect(result.executables[0]?.result).toBeUndefined();
  expect(result.executables[1]?.result).toBeUndefined();
});

test(
  unitTest('deserializes multi-execution service keyed executable infos'),
  () => {
    const result = deserialize(
      TEST_DATA__analysisResult_multiExecutionExecutable,
    );
    const info = result.executables[0]?.info;
    expect(info).toBeInstanceOf(
      V1_DataSpaceMultiExecutionServiceExecutableInfo,
    );
    const multiExecInfo =
      info as V1_DataSpaceMultiExecutionServiceExecutableInfo;
    expect(multiExecInfo.keyedExecutableInfos).toHaveLength(2);
    expect(multiExecInfo.keyedExecutableInfos.map((each) => each.key)).toEqual([
      'UAT',
      'PROD',
    ]);
    expect(multiExecInfo.keyedExecutableInfos[0]?.mapping).toBe(
      'test::product::mapping::TestMapping',
    );
    expect(multiExecInfo.keyedExecutableInfos[0]?.runtime).toBe(
      'test::product::runtime::TestRuntime',
    );
    expect(multiExecInfo.executionContextKey).toBeUndefined();
  },
);

test(unitTest('deserializes an executable return type'), () => {
  const result = deserialize(TEST_DATA__analysisResult_roundtrip);
  const returnType = result.executables[0]?.executableReturnType;
  expect(returnType).toBeDefined();
  expect(returnType?.rawType).toBeInstanceOf(V1_PackageableType);
  expect((returnType?.rawType as V1_PackageableType).fullPath).toBe('String');
});
