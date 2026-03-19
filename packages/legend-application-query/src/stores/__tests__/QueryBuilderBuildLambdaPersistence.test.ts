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

/**
 * Verifies the contract between `buildQuery()` (execution/preview) and
 * `buildQueryForPersistence()` (saving to query store) for each query builder
 * workflow variant:
 *
 *  - DataProduct NATIVE  – buildQuery() embeds `from(query, mapping, runtime)`,
 *                          buildQueryForPersistence() emits a plain lambda.
 *  - DataProduct MODEL   – buildQuery() embeds `with(query, dataProduct)` + `from(…, runtime)`,
 *                          buildQueryForPersistence() emits a plain lambda.
 *  - DataSpace           – neither path embeds execution context in the lambda;
 *                          buildQuery() === buildQueryForPersistence().
 *  - Regular (mapping)   – same contract as DataSpace.
 */

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { filterByType, guaranteeNonNullable } from '@finos/legend-shared';
import { ApplicationStore } from '@finos/legend-application';
import {
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderActionConfig,
  DataProductQueryBuilderState,
  NativeModelDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
  INTERNAL__BasicQueryBuilderState,
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
  QueryBuilder_GraphManagerPreset,
} from '@finos/legend-query-builder';
import {
  Core_GraphManagerPreset,
  ModelAccessPointGroup,
  type NativeModelExecutionContext,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import TEST_DATA__DSL_DataSpace_Entities from '../../components/__tests__/TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import {
  DSL_DataSpace_GraphManagerPreset,
  getOwnDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import { DataSpaceQueryBuilderState } from '@finos/legend-extension-dsl-data-space/application';
import type { Entity } from '@finos/legend-storage';

// ---------------------------------------------------------------------------
// Shared inline entities
// ---------------------------------------------------------------------------

/**
 * Minimal entity set used by all DataProduct tests.
 * Contains a Person class, a Mapping, two PackageableRuntimes
 * (engineRuntime for NATIVE, LakehouseRuntime for MODEL), and two
 * DataProducts (one per access type).
 */
const TEST_DATA__DataProductEntities: Entity[] = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
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
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Creates an application store + graph manager suitable for DataProduct tests.
 * Does NOT include DSL_DataSpace_GraphManagerPreset.
 */
const buildDataProductTestSetup = async () => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__DataProductEntities,
  );
  return { applicationStore, graphManagerState };
};

/**
 * Creates a `DataProductQueryBuilderState` for a given execution value and
 * ensures the class is set to `model::Person`.
 */
const buildDataProductState = (
  applicationStore: InstanceType<typeof ApplicationStore>,
  graphManagerState: ReturnType<typeof TEST__getTestGraphManagerState>,
  executionValue: NativeModelExecutionContext | ModelAccessPointGroup,
  dataProductPath: string,
) => {
  const dataProduct = graphManagerState.graph.getDataProduct(dataProductPath);
  const state = new DataProductQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    dataProduct,
    undefined,
    QueryBuilderActionConfig.INSTANCE,
    executionValue,
    undefined,
    async () => {
      /* no-op */
    },
  );
  state.initWithDataProduct(dataProduct, executionValue);
  // Manually set the class — the empty test mapping has no compatible classes
  state.changeClass(graphManagerState.graph.getClass('model::Person'));
  return state;
};

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/**
 * Returns the function name of the outermost expression in a serialized lambda
 * body, e.g. "from", "getAll", "project", "with".
 */
const getOuterFunctionName = (
  graphManagerState: ReturnType<typeof TEST__getTestGraphManagerState>,
  rawLambda: ReturnType<DataProductQueryBuilderState['buildQuery']>,
): string | undefined => {
  const json = graphManagerState.graphManager.serializeRawValueSpecification(
    rawLambda,
  ) as { body?: { function?: string }[] };
  return json.body?.[0]?.function;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(
  unitTest('DataProduct NATIVE – buildQuery vs buildQueryForPersistence'),
  () => {
    test(
      unitTest('buildQuery() wraps lambda with from(query, mapping, runtime)'),
      async () => {
        const { applicationStore, graphManagerState } =
          await buildDataProductTestSetup();

        const nativeAccess = guaranteeNonNullable(
          graphManagerState.graph.getDataProduct('model::NativeDP')
            .nativeModelAccess,
        );
        const execCtx = guaranteeNonNullable(
          nativeAccess.nativeModelExecutionContexts[0],
        );

        const state = buildDataProductState(
          applicationStore,
          graphManagerState,
          execCtx,
          'model::NativeDP',
        );

        expect(state.executionState).toBeInstanceOf(
          NativeModelDataProductExecutionState,
        );

        // buildQuery() must produce a lambda whose outermost expression is from()
        const outerFn = getOuterFunctionName(
          graphManagerState,
          state.buildQuery(),
        );
        expect(outerFn).toBe('from');
      },
    );

    test(
      unitTest(
        'buildQueryForPersistence() omits execution context from lambda',
      ),
      async () => {
        const { applicationStore, graphManagerState } =
          await buildDataProductTestSetup();

        const nativeAccess = guaranteeNonNullable(
          graphManagerState.graph.getDataProduct('model::NativeDP')
            .nativeModelAccess,
        );
        const execCtx = guaranteeNonNullable(
          nativeAccess.nativeModelExecutionContexts[0],
        );

        const state = buildDataProductState(
          applicationStore,
          graphManagerState,
          execCtx,
          'model::NativeDP',
        );

        // buildQueryForPersistence() must NOT wrap with from()
        const outerFn = getOuterFunctionName(
          graphManagerState,
          state.buildQueryForPersistence(),
        );
        expect(outerFn).not.toBe('from');
        expect(outerFn).not.toBe('with');

        // The two outputs must differ — persistence form is a subset of execution form
        const execJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQuery(),
          );
        const persistJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQueryForPersistence(),
          );
        expect(execJson).not.toEqual(persistJson);
      },
    );
  },
);

describe(
  unitTest('DataProduct MODEL – buildQuery vs buildQueryForPersistence'),
  () => {
    test(
      unitTest(
        'buildQuery() wraps lambda with with(query, dataProduct)->from(runtime)',
      ),
      async () => {
        const { applicationStore, graphManagerState } =
          await buildDataProductTestSetup();

        const dataProduct =
          graphManagerState.graph.getDataProduct('model::ModelDP');
        const modelGroup = guaranteeNonNullable(
          dataProduct.accessPointGroups.find(
            filterByType(ModelAccessPointGroup),
          ),
        );

        const state = buildDataProductState(
          applicationStore,
          graphManagerState,
          modelGroup,
          'model::ModelDP',
        );

        expect(state.executionState).toBeInstanceOf(
          ModelAccessPointDataProductExecutionState,
        );

        // Force-assign selectedRuntime so the with()->from() path is exercised
        const lakehouseRuntime = graphManagerState.graph.getRuntime(
          'model::TestLakehouseRuntime',
        );
        if (
          state.executionState instanceof
          ModelAccessPointDataProductExecutionState
        ) {
          state.executionState.selectedRuntime = lakehouseRuntime;
          state.changeRuntime(lakehouseRuntime);
        }

        // buildQuery() outermost expression is from()
        const outerFn = getOuterFunctionName(
          graphManagerState,
          state.buildQuery(),
        );
        expect(outerFn).toBe('from');

        // The first parameter to from() should be a with() call
        const execJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQuery(),
          ) as { body?: { parameters?: { function?: string }[] }[] };
        const fromFirstParam = execJson.body?.[0]?.parameters?.[0];
        expect(
          (fromFirstParam as { function?: string } | undefined)?.function,
        ).toBe('with');
      },
    );

    test(
      unitTest('buildQueryForPersistence() omits with()/from() wrapping'),
      async () => {
        const { applicationStore, graphManagerState } =
          await buildDataProductTestSetup();

        const dataProduct =
          graphManagerState.graph.getDataProduct('model::ModelDP');
        const modelGroup = guaranteeNonNullable(
          dataProduct.accessPointGroups.find(
            filterByType(ModelAccessPointGroup),
          ),
        );

        const state = buildDataProductState(
          applicationStore,
          graphManagerState,
          modelGroup,
          'model::ModelDP',
        );

        if (
          state.executionState instanceof
          ModelAccessPointDataProductExecutionState
        ) {
          const lakehouseRuntime = graphManagerState.graph.getRuntime(
            'model::TestLakehouseRuntime',
          );
          state.executionState.selectedRuntime = lakehouseRuntime;
          state.changeRuntime(lakehouseRuntime);
        }

        const outerFn = getOuterFunctionName(
          graphManagerState,
          state.buildQueryForPersistence(),
        );
        expect(outerFn).not.toBe('from');
        expect(outerFn).not.toBe('with');

        const execJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQuery(),
          );
        const persistJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQueryForPersistence(),
          );
        expect(execJson).not.toEqual(persistJson);
      },
    );
  },
);

describe(unitTest('DataSpace – buildQuery vs buildQueryForPersistence'), () => {
  test(
    unitTest(
      'buildQuery() and buildQueryForPersistence() produce identical lambdas',
    ),
    async () => {
      // DataSpace uses QueryBuilderExternalExecutionContextState, so execution
      // context is never embedded in the lambda body. Both methods should be
      // identical.
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      pluginManager
        .usePresets([
          new Core_GraphManagerPreset(),
          new QueryBuilder_GraphManagerPreset(),
          new DSL_DataSpace_GraphManagerPreset(),
        ])
        .install();
      const applicationStore = new ApplicationStore(
        TEST__getGenericApplicationConfig(),
        pluginManager,
      );
      const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
      await TEST__buildGraphWithEntities(
        graphManagerState,
        TEST_DATA__DSL_DataSpace_Entities as unknown as Entity[],
      );

      const dataSpace = getOwnDataSpace(
        'domain::COVIDDatapace',
        graphManagerState.graph,
      );
      const executionContext = guaranteeNonNullable(
        dataSpace.executionContexts.find((ctx) => ctx.name === 'dummyContext'),
        `Can't find execution context 'dummyContext'`,
      );

      const state = new DataSpaceQueryBuilderState(
        applicationStore,
        graphManagerState,
        QueryBuilderAdvancedWorkflowState.INSTANCE,
        QueryBuilderActionConfig.INSTANCE,
        dataSpace,
        executionContext,
        false,
        undefined,
        async () => {
          /* no-op */
        },
      );

      // Wire the execution context (mapping + runtime) into the query builder
      state.executionContextState.setMapping(executionContext.mapping.value);
      state.executionContextState.setRuntimeValue(
        new RuntimePointer(
          PackageableElementExplicitReference.create(
            executionContext.defaultRuntime.value,
          ),
        ),
      );

      // Set a class so buildQuery() has something to work with
      const covidClass = graphManagerState.graph.getClass('domain::COVIDData');
      state.changeClass(covidClass);

      // Neither path embeds from() in the lambda
      const execJson =
        graphManagerState.graphManager.serializeRawValueSpecification(
          state.buildQuery(),
        ) as { body?: { function?: string }[] };
      const persistJson =
        graphManagerState.graphManager.serializeRawValueSpecification(
          state.buildQueryForPersistence(),
        );

      expect(execJson.body?.[0]?.function).not.toBe('from');
      expect(execJson).toEqual(persistJson);
    },
  );
});

describe(
  unitTest('Regular (mapping) query – buildQuery vs buildQueryForPersistence'),
  () => {
    test(
      unitTest(
        'buildQuery() and buildQueryForPersistence() produce identical lambdas',
      ),
      async () => {
        // INTERNAL__BasicQueryBuilderState represents generic mapping/runtime based
        // queries (e.g. MappingQueryCreatorStore). No execution context is embedded
        // in the lambda body.
        const pluginManager = TEST__LegendApplicationPluginManager.create();
        pluginManager
          .usePresets([
            new Core_GraphManagerPreset(),
            new QueryBuilder_GraphManagerPreset(),
          ])
          .install();
        const applicationStore = new ApplicationStore(
          TEST__getGenericApplicationConfig(),
          pluginManager,
        );
        const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
        await TEST__buildGraphWithEntities(
          graphManagerState,
          TEST_DATA__DataProductEntities,
        );

        const state = new INTERNAL__BasicQueryBuilderState(
          applicationStore,
          graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          undefined,
        );

        state.executionContextState.setMapping(
          graphManagerState.graph.getMapping('model::TestMapping'),
        );
        state.changeClass(graphManagerState.graph.getClass('model::Person'));

        const execJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQuery(),
          );
        const persistJson =
          graphManagerState.graphManager.serializeRawValueSpecification(
            state.buildQueryForPersistence(),
          );

        expect(execJson).toEqual(persistJson);
      },
    );
  },
);
