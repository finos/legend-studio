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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__getTestGraphManagerState } from '../__test-utils__/GraphManagerTestUtils.js';
import {
  TEST_DATA__DataProductArtifact,
  TEST_DATA__DataProductArtifactContainingModelAPGAndNativeModelAccess,
} from './TEST_DATA__DataProductAnalysis.js';
import { DataProductAccessType } from '../../graph/metamodel/pure/dataProduct/DataProduct.js';

const setupGraphManagerState = async () => {
  const state = TEST__getTestGraphManagerState();
  await state.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await state.initializeSystem();
  return state;
};

describe('analyzeDataProductAndBuildMinimalGraph', () => {
  test(
    unitTest(`builds graph and coverage results for all modelAPG's mappings`),
    async () => {
      const graphManagerState = await setupGraphManagerState();
      const result =
        await graphManagerState.graphManager.analyzeDataProductAndBuildMinimalGraph(
          'test::MyDataProduct',
          () => Promise.resolve(TEST_DATA__DataProductArtifact),
          graphManagerState.graph,
          'group-a',
          DataProductAccessType.MODEL,
          {
            groupId: 'org.finos.test',
            artifactId: 'test-data-product',
            versionId: '1.0.0',
          },
        );

      // Basic result properties
      expect(result.dataProductAnalysis.path).toBe('test::MyDataProduct');
      expect(result.dataProductAnalysis.title).toBe('My Test Data Product');
      expect(result.dataProductAnalysis.description).toBe(
        'A data product for testing',
      );

      // Coverage result built for all modelAPG's mappings
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult,
      ).toBeDefined();
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.size,
      ).toBe(2);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingA',
        ),
      ).toBe(true);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingB',
        ),
      ).toBe(true);

      // The graph should contain only elements from the resolved mapping's model (MappingA -> PersonClass)
      // plus a stub for the resolved mapping only.
      const graph = graphManagerState.graph;
      expect(
        graph.getNullableElement('test::PersonClass', false),
      ).toBeDefined();
      // Only the resolved mapping stub is in the graph
      expect(graph.getNullableElement('test::MappingA', false)).toBeDefined();
      expect(graph.getNullableElement('test::MappingB', false)).toBeUndefined();
      expect(
        graph.getNullableElement('test::MyDataProduct', false),
      ).toBeDefined();

      // MappingA coverage result should have mapped entities
      const coverageA =
        result.dataProductAnalysis.mappingToMappingCoverageResult?.get(
          'test::MappingA',
        );
      expect(coverageA).toBeDefined();
      expect(coverageA?.mappedEntities.length).toBe(1);
      expect(coverageA?.mappedEntities[0]?.path).toBe('test::PersonClass');

      // MappingB coverage result should have mapped entities
      const coverageB =
        result.dataProductAnalysis.mappingToMappingCoverageResult?.get(
          'test::MappingB',
        );
      expect(coverageB).toBeDefined();
      expect(coverageB?.mappedEntities.length).toBe(1);
      expect(coverageB?.mappedEntities[0]?.path).toBe('test::FirmClass');
    },
  );

  test(
    unitTest('throws error when mapping path is not found in artifact'),
    async () => {
      const newGraphManagerState = TEST__getTestGraphManagerState();
      await newGraphManagerState.graphManager.initialize({
        env: 'test',
        tabSize: 2,
        clientConfig: {},
      });
      await newGraphManagerState.initializeSystem();

      await expect(
        newGraphManagerState.graphManager.analyzeDataProductAndBuildMinimalGraph(
          'test::MyDataProduct',
          () => Promise.resolve(TEST_DATA__DataProductArtifact),
          newGraphManagerState.graph,
          'non-existent-group',
          DataProductAccessType.MODEL,
          {
            groupId: 'org.finos.test',
            artifactId: 'test-data-product',
            versionId: '1.0.0',
          },
        ),
      ).rejects.toThrow(
        `Can't resolve access point 'non-existent-group' (type: model) in data product 'test::MyDataProduct'`,
      );
    },
  );

  test(
    unitTest(
      'builds graph from DataProduct artifact containing both model and native model access',
    ),
    async () => {
      const graphManagerState = await setupGraphManagerState();
      const result =
        await graphManagerState.graphManager.analyzeDataProductAndBuildMinimalGraph(
          'test::MyDataProduct',
          () =>
            Promise.resolve(
              TEST_DATA__DataProductArtifactContainingModelAPGAndNativeModelAccess,
            ),
          graphManagerState.graph,
          'native-ctx-2',
          DataProductAccessType.NATIVE,
          {
            groupId: 'org.finos.test',
            artifactId: 'test-data-product',
            versionId: '1.0.0',
          },
        );

      // Basic result properties
      expect(result.dataProductAnalysis.path).toBe('test::MyDataProduct');
      expect(result.dataProductAnalysis.title).toBe('My Test Data Product');
      expect(result.dataProductAnalysis.description).toBe(
        'A data product for testing',
      );

      // Coverage result built for all modelAPG's and native model access mappings
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult,
      ).toBeDefined();
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.size,
      ).toBe(3);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingA',
        ),
      ).toBe(true);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingB',
        ),
      ).toBe(true);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingC',
        ),
      ).toBe(true);

      // The graph should contain only elements for the resolved mapping (native-ctx-2 -> MappingC -> EmployeeClass)
      // plus a stub for the resolved mapping and runtime only.
      const graph = graphManagerState.graph;
      expect(
        graph.getNullableElement('test::EmployeeClass', false),
      ).toBeDefined();
      // Only the resolved mapping (MappingC) stub is in the graph
      expect(graph.getNullableElement('test::MappingA', false)).toBeUndefined();
      expect(graph.getNullableElement('test::MappingB', false)).toBeUndefined();
      expect(graph.getNullableElement('test::MappingC', false)).toBeDefined();
      expect(
        graph.getNullableElement('test::MyDataProduct', false),
      ).toBeDefined();

      // MappingA coverage result should have mapped entities
      const coverageA =
        result.dataProductAnalysis.mappingToMappingCoverageResult?.get(
          'test::MappingA',
        );
      expect(coverageA).toBeDefined();
      expect(coverageA?.mappedEntities.length).toBe(1);
      expect(coverageA?.mappedEntities[0]?.path).toBe('test::PersonClass');

      // MappingB coverage result should have mapped entities
      const coverageB =
        result.dataProductAnalysis.mappingToMappingCoverageResult?.get(
          'test::MappingB',
        );
      expect(coverageB).toBeDefined();
      expect(coverageB?.mappedEntities.length).toBe(1);
      expect(coverageB?.mappedEntities[0]?.path).toBe('test::FirmClass');

      // MappingC coverage result should have mapped entities
      const coverageC =
        result.dataProductAnalysis.mappingToMappingCoverageResult?.get(
          'test::MappingC',
        );
      expect(coverageC).toBeDefined();
      expect(coverageC?.mappedEntities.length).toBe(1);
      expect(coverageC?.mappedEntities[0]?.path).toBe('test::EmployeeClass');
    },
  );
});
