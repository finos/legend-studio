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
import { TEST_DATA__DataProductArtifact } from './TEST_DATA__DataProductAnalysis.js';
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
    unitTest('builds minimal graph and coverage results for specified mapping'),
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

      // Coverage result built for the resolved mapping only
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult,
      ).toBeDefined();
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.size,
      ).toBe(1);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingA',
        ),
      ).toBe(true);

      // The graph should contain the elements from MappingA's model (PersonClass)
      // plus dummy mapping and dummy data product
      const graph = graphManagerState.graph;
      expect(
        graph.getNullableElement('test::PersonClass', false),
      ).toBeDefined();
      expect(graph.getNullableElement('test::MappingA', false)).toBeDefined();
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
        `Can't resolve mapping path for access point 'non-existent-group' (type: model) in data product 'test::MyDataProduct'`,
      );
    },
  );

  test(
    unitTest('builds graph with elements from specified mapping only'),
    async () => {
      // Use MappingB this time — the graph should contain FirmClass, not PersonClass
      const newGraphManagerState = TEST__getTestGraphManagerState();
      await newGraphManagerState.graphManager.initialize({
        env: 'test',
        tabSize: 2,
        clientConfig: {},
      });
      await newGraphManagerState.initializeSystem();

      const result =
        await newGraphManagerState.graphManager.analyzeDataProductAndBuildMinimalGraph(
          'test::MyDataProduct',
          () => Promise.resolve(TEST_DATA__DataProductArtifact),
          newGraphManagerState.graph,
          'group-b',
          DataProductAccessType.MODEL,
          {
            groupId: 'org.finos.test',
            artifactId: 'test-data-product',
            versionId: '1.0.0',
          },
        );

      const graph = newGraphManagerState.graph;

      // FirmClass should be in graph (from MappingB's model)
      expect(graph.getNullableElement('test::FirmClass', false)).toBeDefined();

      // PersonClass should NOT be in graph (it's only in MappingA's model)
      expect(
        graph.getNullableElement('test::PersonClass', false),
      ).toBeUndefined();

      // Dummy mapping and data product should be present
      expect(graph.getNullableElement('test::MappingB', false)).toBeDefined();
      expect(
        graph.getNullableElement('test::MyDataProduct', false),
      ).toBeDefined();

      // Coverage result built for the resolved mapping only
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.size,
      ).toBe(1);
      expect(
        result.dataProductAnalysis.mappingToMappingCoverageResult?.has(
          'test::MappingB',
        ),
      ).toBe(true);
    },
  );
});
