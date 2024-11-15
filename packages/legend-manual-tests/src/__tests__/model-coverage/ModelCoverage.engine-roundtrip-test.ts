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
import { describe, expect, test } from '@jest/globals';
import { resolve } from 'path';
import {
  integrationTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared/test';
import {
  V1_MappingModelCoverageAnalysisInput,
  V1_MappingModelCoverageAnalysisResult,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { ActionState } from '@finos/legend-shared';
import {
  createGraphManagerStateFromGrammar,
  generateModelEntitesFromModelGrammar,
} from '../utils/testUtils.js';
import {
  ENGINE_TEST_SUPPORT__mappingCoverage,
  TEST__excludeSectionIndex,
} from '@finos/legend-graph/test';

type ModelCoverageTestCase = [
  string,
  {
    mappingPath: string;
    inputFileDir: string;
    inputFilePath: string;
    expectedFileDir: string;
    expectedFilePath: string;
  },
];

const MODEL_COVERAGE_CASES: ModelCoverageTestCase[] = [
  [
    'simple relational model',
    {
      mappingPath: 'my::map',
      inputFileDir: 'model',
      inputFilePath: 'TEST_DATA_Model-coverage',
      expectedFileDir: 'model',
      expectedFilePath: 'TEST_DATA_Model-coverage',
    },
  ],
];

describe(
  integrationTest('Build Graph From Mapping Analytics Coverage and round trip'),
  () => {
    test.each(MODEL_COVERAGE_CASES)(
      '%s',
      async (
        testName: ModelCoverageTestCase[0],
        testCase: ModelCoverageTestCase[1],
      ) => {
        const {
          mappingPath,
          inputFileDir,
          inputFilePath,
          expectedFileDir,
          expectedFilePath,
        } = testCase;
        const graphManagerState = await createGraphManagerStateFromGrammar(
          resolve(__dirname, inputFileDir),
          inputFilePath,
        );
        const pureGraphManager =
          graphManagerState.graphManager as V1_PureGraphManager;
        const mappingModelCoverageInput =
          new V1_MappingModelCoverageAnalysisInput();
        mappingModelCoverageInput.clientVersion =
          V1_PureGraphManager.DEV_PROTOCOL_VERSION;
        mappingModelCoverageInput.mapping = mappingPath;
        mappingModelCoverageInput.model =
          pureGraphManager.getFullGraphModelData(graphManagerState.graph);
        const mappingModelCoverageAnalysisResult =
          (await ENGINE_TEST_SUPPORT__mappingCoverage(
            mappingModelCoverageInput,
          )) as unknown as V1_MappingModelCoverageAnalysisResult;

        const minalGraphEntities =
          await pureGraphManager.buildEntityFromMappingAnalyticsResult(
            mappingModelCoverageAnalysisResult,
            graphManagerState.graph,
            ActionState.create(),
          );
        const expectedEntities = await generateModelEntitesFromModelGrammar(
          resolve(__dirname, expectedFileDir),
          expectedFilePath,
          undefined,
        );
        (
          expect(expectedEntities) as TEMPORARY__JestMatcher
        ).toIncludeSameMembers(TEST__excludeSectionIndex(expectedEntities));
      },
    );
  },
);
