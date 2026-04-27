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
import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  DataProductAccessType,
  LakehouseAccessPoint,
  LakehouseRuntime,
  ModelAccessPointGroup,
  PackageableRuntime,
  V1_DataProductArtifact,
  DataProductAnalysisQueryResult,
  DataProductAnalysis,
  MappingModelCoverageAnalysisResult,
} from '@finos/legend-graph';
import {
  QueryBuilder_GraphManagerPreset,
  NativeModelDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
  LakehouseDataProductExecutionState,
} from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import { ExistingQueryEditorStore } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';
import { LegendQueryDataProductQueryBuilderState } from '../data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';

// ---------------------------------------------------------------------------
// Test entities
// ---------------------------------------------------------------------------

/**
 * Contains:
 * - model::TestMapping (empty mapping)
 * - model::TestEngineRuntime (engine runtime)
 * - model::TestLakehouseRuntime (LakehouseRuntime)
 * - model::NativeDP (native-only data product)
 * - model::ModelDP (model access point group data product)
 * - model::LakehouseDP (lakehouse-only data product with LakehouseAccessPoint)
 * - model::MixedDP (model + lakehouse access points)
 */
const TEST_DATA__Entities: Entity[] = [
  {
    path: 'model::TestMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'TestMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::TestEngineRuntime',
    content: {
      _type: 'runtime',
      name: 'TestEngineRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [{ path: 'model::TestMapping', type: 'MAPPING' }],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::TestLakehouseRuntime',
    content: {
      _type: 'runtime',
      name: 'TestLakehouseRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [{ path: 'model::TestMapping', type: 'MAPPING' }],
        environment: 'Production',
        warehouse: 'TEST_WH',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::NativeDP',
    content: {
      _type: 'dataProduct',
      name: 'NativeDP',
      package: 'model',
      nativeModelAccess: {
        defaultExecutionContext: 'ctx1',
        nativeModelExecutionContexts: [
          {
            key: 'ctx1',
            mapping: { path: 'model::TestMapping' },
            runtime: { path: 'model::TestEngineRuntime' },
          },
        ],
        featuredElements: [],
        sampleQueries: [],
      },
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::ModelDP',
    content: {
      _type: 'dataProduct',
      name: 'ModelDP',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          id: 'grp1',
          mapping: { path: 'model::TestMapping' },
          accessPoints: [],
        },
      ],
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::LakehouseDP',
    content: {
      _type: 'dataProduct',
      name: 'LakehouseDP',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'accessPointGroup',
          id: 'lhGroup1',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'lhAP1',
              title: 'Lakehouse AP',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
        },
      ],
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
  {
    path: 'model::MixedDP',
    content: {
      _type: 'dataProduct',
      name: 'MixedDP',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          id: 'modelGrp',
          mapping: { path: 'model::TestMapping' },
          accessPoints: [],
        },
        {
          _type: 'accessPointGroup',
          id: 'lhGroup',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'lhAP2',
              title: 'Lake AP in Mixed',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
        },
      ],
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const buildTestSetup = async () => {
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

  const editorStore = new ExistingQueryEditorStore(
    applicationStore as unknown as LegendQueryApplicationStore,
    depotServerClient,
    'test-query-id',
    undefined,
  );

  // Build the graph with test entities on the editor store's graph manager
  const graphManagerState = editorStore.graphManagerState;
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    TEST_DATA__Entities,
    graphManagerState.graphBuildState,
  );

  return { editorStore, graphManagerState, applicationStore };
};

/**
 * Creates a mock `DataProductAnalysisQueryResult` for the given data product
 * path and mapping path.
 */
const createMockAnalysisResult = (
  dataProductPath: string,
  mappingPath?: string,
): DataProductAnalysisQueryResult => {
  const analysis = new DataProductAnalysis();
  analysis.path = dataProductPath;
  // Create a minimal analysis result with an empty exec state (it won't be used
  // since the store resolves it independently)
  return new DataProductAnalysisQueryResult(
    mappingPath,
    analysis,
    // targetExecState is unused by the method under test
    {} as unknown as LakehouseAccessPoint,
  );
};

/**
 * Creates a mock `V1_DataProductArtifact` for testing.
 */
const createMockArtifact = (): V1_DataProductArtifact => {
  const artifact = new V1_DataProductArtifact();
  artifact.accessPointGroups = [];
  return artifact;
};

/**
 * Creates a mock `PackageableRuntime` with a `LakehouseRuntime` inside.
 */
const createMockLakehousePackageableRuntime = (
  dataProductPath: string,
): PackageableRuntime => {
  const lakehouseRuntime = new LakehouseRuntime('test-env', 'TEST_WH');
  const packageableRuntime = new PackageableRuntime(
    `${dataProductPath}_LakehouseRuntime`,
  );
  packageableRuntime.runtimeValue = lakehouseRuntime;
  return packageableRuntime;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(
  unitTest(
    'buildDataProductQueryBuilderState – native data product (no LakehouseAccessPoint)',
  ),
  () => {
    test(
      unitTest(
        'creates NativeModelDataProductExecutionState for native access type',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::NativeDP';
        const artifact = createMockArtifact();

        // Mock buildGraphAndDataproductAnalyticsResult to skip graph building
        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath, 'model::TestMapping');

        // Mock createLakehousePackageableRuntime — should NOT be called for native
        let lakehouseRuntimeCalled = false;
        editorStore.createLakehousePackageableRuntime = async () => {
          lakehouseRuntimeCalled = true;
          return createMockLakehousePackageableRuntime(dataProductPath);
        };

        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'ctx1',
          DataProductAccessType.NATIVE,
          async () => {
            /* no-op */
          },
        );

        expect(result).toBeInstanceOf(LegendQueryDataProductQueryBuilderState);
        expect(result.executionState).toBeInstanceOf(
          NativeModelDataProductExecutionState,
        );
        // createLakehousePackageableRuntime should NOT be called for native access
        expect(lakehouseRuntimeCalled).toBe(false);
      },
    );
  },
);

describe(
  unitTest(
    'buildDataProductQueryBuilderState – model access point group data product',
  ),
  () => {
    test(
      unitTest(
        'creates ModelAccessPointDataProductExecutionState and calls createLakehousePackageableRuntime',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::ModelDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath, 'model::TestMapping');

        let lakehouseRuntimeCalled = false;
        editorStore.createLakehousePackageableRuntime = async () => {
          lakehouseRuntimeCalled = true;
          return createMockLakehousePackageableRuntime(dataProductPath);
        };

        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'grp1',
          DataProductAccessType.MODEL,
          async () => {
            /* no-op */
          },
        );

        expect(result).toBeInstanceOf(LegendQueryDataProductQueryBuilderState);
        expect(result.executionState).toBeInstanceOf(
          ModelAccessPointDataProductExecutionState,
        );
        // For model access, createLakehousePackageableRuntime SHOULD be called
        expect(lakehouseRuntimeCalled).toBe(true);
        // Verify adhoc runtime is set
        expect(
          (result.executionState as ModelAccessPointDataProductExecutionState)
            .adhocRuntime,
        ).toBe(true);
      },
    );
  },
);

describe(
  unitTest(
    'buildDataProductQueryBuilderState – lakehouse access point data product',
  ),
  () => {
    test(
      unitTest(
        'creates LakehouseDataProductExecutionState for a lakehouse-only data product',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::LakehouseDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath);

        let lakehouseRuntimeCalled = false;
        const mockRuntime =
          createMockLakehousePackageableRuntime(dataProductPath);
        editorStore.createLakehousePackageableRuntime = async () => {
          lakehouseRuntimeCalled = true;
          return mockRuntime;
        };

        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'lhAP1',
          DataProductAccessType.LAKEHOUSE,
          async () => {
            /* no-op */
          },
        );

        expect(result).toBeInstanceOf(LegendQueryDataProductQueryBuilderState);
        expect(result.executionState).toBeInstanceOf(
          LakehouseDataProductExecutionState,
        );
        // createLakehousePackageableRuntime SHOULD be called for lakehouse access
        expect(lakehouseRuntimeCalled).toBe(true);
        // Verify adhoc runtime is set
        const lhExecState =
          result.executionState as LakehouseDataProductExecutionState;
        expect(lhExecState.adhocRuntime).toBe(true);
        // Verify selectedRuntime is set to the mock lakehouse runtime
        expect(lhExecState.selectedRuntime).toBe(mockRuntime);
      },
    );

    test(
      unitTest(
        'falls back to ModelAccessPointGroup in mixed product even with lakehouse accessId',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::MixedDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath, 'model::TestMapping');

        const mockRuntime =
          createMockLakehousePackageableRuntime(dataProductPath);
        editorStore.createLakehousePackageableRuntime = async () => mockRuntime;

        // Pass a lakehouse access point ID in a mixed product.
        // The current implementation prioritizes the first ModelAccessPointGroup
        // fallback over searching lakehouse access points when the accessId
        // doesn't match any model group or native context.
        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'lhAP2',
          DataProductAccessType.LAKEHOUSE,
          async () => {
            /* no-op */
          },
        );

        // In a mixed product, the fallback to the first model access point
        // group takes priority over searching lakehouse access points by ID.
        expect(result.executionState).toBeInstanceOf(
          ModelAccessPointDataProductExecutionState,
        );
      },
    );

    test(
      unitTest(
        'falls back to ModelAccessPointGroup when accessId is undefined in mixed product',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::MixedDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath, 'model::TestMapping');

        const mockRuntime =
          createMockLakehousePackageableRuntime(dataProductPath);
        editorStore.createLakehousePackageableRuntime = async () => mockRuntime;

        // No accessId — should fall back to model access point group
        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          '', // empty accessId
          DataProductAccessType.MODEL,
          async () => {
            /* no-op */
          },
        );

        // With empty accessId and model groups available, should fall back to
        // first model access point group
        expect(result.executionState).toBeInstanceOf(
          ModelAccessPointDataProductExecutionState,
        );
      },
    );

    test(
      unitTest('adds packageableRuntime to graph for lakehouse access point'),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProductPath = 'model::LakehouseDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath);

        const mockRuntime =
          createMockLakehousePackageableRuntime(dataProductPath);
        editorStore.createLakehousePackageableRuntime = async () => mockRuntime;

        const graphElementCountBefore =
          graphManagerState.graph.allOwnElements.length;

        await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'lhAP1',
          DataProductAccessType.LAKEHOUSE,
          async () => {
            /* no-op */
          },
        );

        // The lakehouse runtime should have been added to the graph
        const graphElementCountAfter =
          graphManagerState.graph.allOwnElements.length;
        expect(graphElementCountAfter).toBeGreaterThan(graphElementCountBefore);
      },
    );

    test(
      unitTest(
        'wires lakehouse runtime into execution state for lakehouse data product',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::LakehouseDP';
        const artifact = createMockArtifact();

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          createMockAnalysisResult(dataProductPath);

        const mockRuntime =
          createMockLakehousePackageableRuntime(dataProductPath);
        editorStore.createLakehousePackageableRuntime = async () => mockRuntime;

        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'lhAP1',
          DataProductAccessType.LAKEHOUSE,
          async () => {
            /* no-op */
          },
        );

        const execState =
          result.executionState as LakehouseDataProductExecutionState;
        // Runtime should be set
        expect(execState.selectedRuntime).toBeDefined();
        expect(execState.selectedRuntime).toBe(mockRuntime);
        // Adhoc runtime should be enabled
        expect(execState.adhocRuntime).toBe(true);
        // The runtime value should be a LakehouseRuntime
        expect(execState.selectedRuntime?.runtimeValue).toBeInstanceOf(
          LakehouseRuntime,
        );
      },
    );
  },
);

describe(
  unitTest(
    'buildDataProductQueryBuilderState – resolveDataProductExecutionState',
  ),
  () => {
    test(
      unitTest(
        'resolveDataProductExecutionState returns LakehouseAccessPoint when accessId matches',
      ),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProduct =
          graphManagerState.graph.getDataProduct('model::LakehouseDP');

        const result = editorStore.resolveDataProductExecutionState(
          dataProduct,
          'lhAP1',
        );

        expect(result).toBeInstanceOf(LakehouseAccessPoint);
        expect((result as LakehouseAccessPoint).id).toBe('lhAP1');
      },
    );

    test(
      unitTest(
        'resolveDataProductExecutionState returns ModelAccessPointGroup over LakehouseAccessPoint when no accessId',
      ),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProduct =
          graphManagerState.graph.getDataProduct('model::MixedDP');

        const result = editorStore.resolveDataProductExecutionState(
          dataProduct,
          undefined,
        );

        // Should prefer ModelAccessPointGroup
        expect(result).toBeInstanceOf(ModelAccessPointGroup);
        expect((result as ModelAccessPointGroup).id).toBe('modelGrp');
      },
    );

    test(
      unitTest(
        'resolveDataProductExecutionState returns LakehouseAccessPoint for lakehouse-only product with matching accessId',
      ),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProduct =
          graphManagerState.graph.getDataProduct('model::LakehouseDP');

        const result = editorStore.resolveDataProductExecutionState(
          dataProduct,
          'lhAP1',
        );

        expect(result).toBeInstanceOf(LakehouseAccessPoint);
        expect((result as LakehouseAccessPoint).id).toBe('lhAP1');
        expect((result as LakehouseAccessPoint).targetEnvironment).toBe(
          'Snowflake',
        );
      },
    );

    test(
      unitTest(
        'resolveDataProductExecutionState returns NativeModelExecutionContext for native product',
      ),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProduct =
          graphManagerState.graph.getDataProduct('model::NativeDP');

        const result = editorStore.resolveDataProductExecutionState(
          dataProduct,
          'ctx1',
        );

        expect(result).not.toBeInstanceOf(LakehouseAccessPoint);
        expect(result).not.toBeInstanceOf(ModelAccessPointGroup);
      },
    );

    test(
      unitTest(
        'resolveDataProductExecutionState falls back to ModelAccessPointGroup in mixed product even with lakehouse accessId',
      ),
      async () => {
        const { editorStore, graphManagerState } = await buildTestSetup();
        const dataProduct =
          graphManagerState.graph.getDataProduct('model::MixedDP');

        // In a mixed product, the first ModelAccessPointGroup fallback
        // takes priority over searching lakehouse access points by ID.
        const result = editorStore.resolveDataProductExecutionState(
          dataProduct,
          'lhAP2',
        );

        expect(result).toBeInstanceOf(ModelAccessPointGroup);
        expect((result as ModelAccessPointGroup).id).toBe('modelGrp');
      },
    );
  },
);

describe(
  unitTest(
    'buildDataProductQueryBuilderState – mapping coverage result wiring',
  ),
  () => {
    test(
      unitTest(
        'sets mappingToMappingCoverageResult on query builder state when available in analysis',
      ),
      async () => {
        const { editorStore } = await buildTestSetup();
        const dataProductPath = 'model::ModelDP';
        const artifact = createMockArtifact();

        const analysisResult = createMockAnalysisResult(
          dataProductPath,
          'model::TestMapping',
        );
        // Add mapping coverage result
        const mapping =
          editorStore.graphManagerState.graph.getMapping('model::TestMapping');
        const mockCoverageResult = new MappingModelCoverageAnalysisResult(
          [],
          mapping,
        );
        const mockCoverageMap = new Map<
          string,
          MappingModelCoverageAnalysisResult
        >();
        mockCoverageMap.set('model::TestMapping', mockCoverageResult);
        analysisResult.dataProductAnalysis.mappingToMappingCoverageResult =
          mockCoverageMap;

        editorStore.buildGraphAndDataproductAnalyticsResult = async () =>
          analysisResult;

        editorStore.createLakehousePackageableRuntime = async () =>
          createMockLakehousePackageableRuntime(dataProductPath);

        const result = await editorStore.buildDataProductQueryBuilderState(
          'test.group',
          'test-artifact',
          '0.0.0',
          dataProductPath,
          artifact,
          'grp1',
          DataProductAccessType.MODEL,
          async () => {
            /* no-op */
          },
        );

        expect(result.mappingToMappingCoverageResult).toBeDefined();
        expect(result.mappingToMappingCoverageResult).toBe(mockCoverageMap);
      },
    );
  },
);
