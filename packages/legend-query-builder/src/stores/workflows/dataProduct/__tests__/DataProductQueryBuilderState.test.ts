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
import { ApplicationStore } from '@finos/legend-application';
import {
  CORE_PURE_PATH,
  Core_GraphManagerPreset,
  DataProductAccessor,
  LakehouseAccessPoint,
  ModelAccessPointGroup,
  Multiplicity,
  PrecisePrimitiveType,
  PrimitiveInstanceValue,
  PrimitiveType,
  RelationTypeColumnMetadata,
  RelationTypeMetadata,
  RuntimePointer,
  SimpleFunctionExpression,
  V1_DataProductArtifact,
  V1_PureGraphManager,
  V1_RemoteEngine,
  type PackageableRuntime,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../../../__test-utils__/QueryBuilderStateTestUtils.js';
import { QueryBuilder_GraphManagerPreset } from '../../../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
} from '../../../query-workflow/QueryBuilderWorkFlowState.js';
import {
  DataProductQueryBuilderState,
  LakehouseDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
  resolveDataProductAccessor,
} from '../DataProductQueryBuilderState.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { buildLambdaFunction } from '../../../QueryBuilderValueSpecificationBuilder.js';

/**
 * Minimal entity set: a data product with two LakehouseAccessPoints in the
 * same group, plus two LakehouseRuntimes so the runtime selector has more
 * than one option to pick from.
 */
const TEST_DATA__LakehouseEntities: Entity[] = [
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
    path: 'model::LakehouseRuntime1',
    content: {
      _type: 'runtime',
      name: 'LakehouseRuntime1',
      package: 'model',
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [{ path: 'model::TestMapping', type: 'MAPPING' }],
        environment: 'Production',
        warehouse: 'WH_1',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::LakehouseRuntime2',
    content: {
      _type: 'runtime',
      name: 'LakehouseRuntime2',
      package: 'model',
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [{ path: 'model::TestMapping', type: 'MAPPING' }],
        environment: 'Production',
        warehouse: 'WH_2',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
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
              title: 'Lakehouse AP 1',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
            {
              _type: 'lakehouseAccessPoint',
              id: 'lhAP2',
              title: 'Lakehouse AP 2',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 2 }],
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

const buildLakehouseDataProductState = async (withArtifact = true) => {
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
    TEST_DATA__LakehouseEntities,
  );

  const dataProduct =
    graphManagerState.graph.getDataProduct('model::LakehouseDP');
  const accessPoints = dataProduct.accessPointGroups
    .flatMap((group) => group.accessPoints)
    .filter(
      (ap): ap is LakehouseAccessPoint => ap instanceof LakehouseAccessPoint,
    );
  const ap1 = guaranteeNonNullable(
    accessPoints.find((ap) => ap.id === 'lhAP1'),
  );
  const ap2 = guaranteeNonNullable(
    accessPoints.find((ap) => ap.id === 'lhAP2'),
  );

  // By default, pass an empty artifact so `changeExecutionState` skips the
  // `getLambdaResolvedRelationType` engine call and `resolveDataProductAccessor`
  // falls back to the in-graph access point group lookup.
  const artifact = withArtifact ? new V1_DataProductArtifact() : undefined;

  const state = new DataProductQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    dataProduct,
    artifact,
    QueryBuilderActionConfig.INSTANCE,
    ap1,
    undefined,
    async () => {
      /* no-op */
    },
  );
  return { state, ap1, ap2, graphManagerState };
};

describe(
  unitTest(
    'DataProductQueryBuilderState - Lakehouse access point without artifact',
  ),
  () => {
    test(
      unitTest(
        'types the accessor from the engine, keeping nullability and Varchar(n), and an unknown type as Any',
      ),
      async () => {
        const { state, ap2, graphManagerState } =
          await buildLakehouseDataProductState(false);
        const spy = jest
          .spyOn(
            guaranteeType(
              guaranteeType(graphManagerState.graphManager, V1_PureGraphManager)
                .engine,
              V1_RemoteEngine,
            ).getEngineServerClient(),
            'lambdaRelationType',
          )
          .mockResolvedValue({
            _type: 'relationType',
            columns: [
              {
                name: 'CUSTOMER_ID',
                genericType: {
                  multiplicityArguments: [],
                  rawType: {
                    _type: 'packageableType',
                    fullPath: 'meta::pure::precisePrimitives::Varchar',
                  },
                  typeArguments: [],
                  typeVariableValues: [{ _type: 'integer', value: 5 }],
                },
                multiplicity: { lowerBound: 0, upperBound: 1 },
              },
              {
                name: 'ORDER_ID',
                genericType: {
                  multiplicityArguments: [],
                  rawType: {
                    _type: 'packageableType',
                    fullPath: 'meta::pure::precisePrimitives::Int',
                  },
                  typeArguments: [],
                  typeVariableValues: [],
                },
                multiplicity: { lowerBound: 1, upperBound: 1 },
              },
              {
                // an enum whose project isn't loaded
                name: 'STATUS',
                genericType: {
                  multiplicityArguments: [],
                  rawType: {
                    _type: 'packageableType',
                    fullPath: 'my::OrderStatus',
                  },
                  typeArguments: [],
                  typeVariableValues: [],
                },
                multiplicity: { lowerBound: 0, upperBound: 1 },
              },
            ],
          });

        try {
          await state.changeExecutionId({
            label: ap2.title ?? ap2.id,
            tag: 'LAKEHOUSE',
            value: ap2,
          });

          expect(spy).toHaveBeenCalledTimes(1);
          const accessor = guaranteeType(
            state.sourceAccessor,
            DataProductAccessor,
          );
          expect(accessor.accessor).toBe('lhAP2');
          expect(
            accessor.relationType.columns.map((column) => column.name),
          ).toEqual(['CUSTOMER_ID', 'ORDER_ID', 'STATUS']);

          const customerId = guaranteeNonNullable(
            accessor.relationType.columns[0],
          );
          // the nullable engine column stays [0..1] (it used to become [1])
          expect(customerId.multiplicity).toBe(Multiplicity.ZERO_ONE);
          // and Varchar(5) keeps its parameter
          const customerIdType = customerId.genericType.value;
          expect(customerIdType.rawType).toBe(PrecisePrimitiveType.VARCHAR);
          expect(
            guaranteeType(
              customerIdType.typeVariableValues?.[0],
              PrimitiveInstanceValue,
            ).values,
          ).toEqual([5]);

          const orderId = guaranteeNonNullable(
            accessor.relationType.columns[1],
          );
          expect(orderId.multiplicity).toBe(Multiplicity.ONE);
          expect(orderId.genericType.value.rawType).toBe(
            PrecisePrimitiveType.INT,
          );

          // a column whose type isn't in the graph is typed `Any` instead of
          // failing the accessor
          const status = guaranteeNonNullable(accessor.relationType.columns[2]);
          expect(status.genericType.value.rawType.path).toBe(
            CORE_PURE_PATH.ANY,
          );
          expect(status.multiplicity).toBe(Multiplicity.ZERO_ONE);
        } finally {
          spy.mockRestore();
        }
      },
    );

    test(
      unitTest(
        'resolveDataProductAccessor still accepts the deprecated RelationTypeMetadata',
      ),
      async () => {
        const { state, ap1, graphManagerState } =
          await buildLakehouseDataProductState(false);
        const metadata = new RelationTypeMetadata();
        metadata.columns = [
          new RelationTypeColumnMetadata(
            'meta::pure::precisePrimitives::Varchar',
            'CUSTOMER_ID',
            Multiplicity.ZERO_ONE,
          ),
          new RelationTypeColumnMetadata('String', 'NAME', Multiplicity.ONE),
        ];

        const accessor = resolveDataProductAccessor(
          state.dataProduct,
          ap1,
          graphManagerState.graph,
          undefined,
          metadata,
        );

        expect(accessor.accessor).toBe('lhAP1');
        expect(accessor.relationType.name).toBe('Lakehouse AP 1');
        expect(
          accessor.relationType.columns.map((column) => [
            column.name,
            column.genericType.value.rawType,
          ]),
        ).toEqual([
          ['CUSTOMER_ID', PrecisePrimitiveType.VARCHAR],
          ['NAME', PrimitiveType.STRING],
        ]);
        // unchanged: the metadata has no type parameters, and this path never
        // carried multiplicity
        expect(
          accessor.relationType.columns.map(
            (column) => column.genericType.value.typeVariableValues,
          ),
        ).toEqual([undefined, undefined]);
        expect(
          accessor.relationType.columns.map((column) => column.multiplicity),
        ).toEqual([Multiplicity.ONE, Multiplicity.ONE]);
      },
    );
  },
);

describe(
  unitTest('DataProductQueryBuilderState - changeExecutionId for Lakehouse'),
  () => {
    test(
      unitTest(
        'preserves selectedRuntime and adhocRuntime when switching between LakehouseAccessPoints',
      ),
      async () => {
        const { state, ap1, ap2, graphManagerState } =
          await buildLakehouseDataProductState();

        const initialExecState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(initialExecState.exectionValue).toBe(ap1);

        // Pick the second runtime (different from default which is index 0)
        // and flip the adhocRuntime flag so we can assert both are preserved.
        const runtime2 = guaranteeNonNullable(
          graphManagerState.graph.getRuntime('model::LakehouseRuntime2'),
        );
        const runtime1 = guaranteeNonNullable(
          graphManagerState.graph.getRuntime('model::LakehouseRuntime1'),
        );
        // sanity check: both runtimes are compatible
        expect(initialExecState.compatibleRuntimes).toEqual(
          expect.arrayContaining([runtime1, runtime2]),
        );

        initialExecState.selectedRuntime = runtime2;
        initialExecState.adhocRuntime = true;

        // switch to the second access point
        await state.changeExecutionId({
          label: ap2.title ?? ap2.id,
          tag: 'LAKEHOUSE',
          value: ap2,
        });

        // a new execution state should have been built for ap2
        const newExecState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(newExecState).not.toBe(initialExecState);
        expect(newExecState.exectionValue).toBe(ap2);

        // selectedRuntime and adhocRuntime should have been carried over
        // instead of being reset to the constructor defaults
        // (selectedRuntime would default to compatibleRuntimes[0] = runtime1
        // and adhocRuntime would default to false).
        expect(newExecState.selectedRuntime).toBe(runtime2);
        expect(newExecState.adhocRuntime).toBe(true);
      },
    );

    test(
      unitTest(
        'resets adhocRuntime to false when previous state had no preservable runtime info',
      ),
      async () => {
        const { state, ap2 } = await buildLakehouseDataProductState();

        // Without changing anything, switch access points. adhocRuntime starts
        // as false and should remain false; selectedRuntime defaults to the
        // first compatible runtime in both old and new states, so the result
        // is effectively unchanged but we verify the new state was wired up.
        await state.changeExecutionId({
          label: ap2.title ?? ap2.id,
          tag: 'LAKEHOUSE',
          value: ap2,
        });

        const newExecState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(newExecState.exectionValue).toBe(ap2);
        expect(newExecState.adhocRuntime).toBe(false);
        expect(newExecState.selectedRuntime).toBeDefined();
      },
    );
  },
);

describe(
  unitTest(
    'DataProductQueryBuilderState - changeSelectedRuntime for Lakehouse',
  ),
  () => {
    test(
      unitTest(
        'changeSelectedRuntime wraps the PackageableRuntime in a RuntimePointer on executionContextState',
      ),
      async () => {
        const { state, ap1, graphManagerState } =
          await buildLakehouseDataProductState();

        // initialize the source element / runtimeValue by entering ap1
        await state.changeExecutionState(ap1);

        const execState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        const runtime2 = guaranteeNonNullable(
          graphManagerState.graph.getRuntime('model::LakehouseRuntime2'),
        );

        execState.changeSelectedRuntime(runtime2);

        // selectedRuntime should be tracked on the execution state
        expect(execState.selectedRuntime).toBe(runtime2);

        // and propagated to the execution context as a RuntimePointer (not a
        // bare PackageableRuntime) so downstream lambda building works.
        const runtimeValue = state.executionContextState.runtimeValue;
        expect(runtimeValue).toBeInstanceOf(RuntimePointer);
        expect(
          guaranteeType(runtimeValue, RuntimePointer).packageableRuntime.value,
        ).toBe(runtime2);
      },
    );

    test(
      unitTest(
        'buildQuery() reflects the runtime selected via changeSelectedRuntime',
      ),
      async () => {
        const { state, ap1, graphManagerState } =
          await buildLakehouseDataProductState();

        await state.changeExecutionState(ap1);

        const execState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        const runtime1 = guaranteeNonNullable(
          graphManagerState.graph.getRuntime('model::LakehouseRuntime1'),
        );
        const runtime2 = guaranteeNonNullable(
          graphManagerState.graph.getRuntime('model::LakehouseRuntime2'),
        );

        // start with runtime1, then switch to runtime2
        execState.changeSelectedRuntime(runtime1);
        execState.changeSelectedRuntime(runtime2);

        // build the lambda function (rather than the RawLambda) so we can
        // inspect the resolved runtime reference inside the from() expression.
        const lambdaFunction = buildLambdaFunction(state);
        const fromExpression = guaranteeType(
          lambdaFunction.expressionSequence[0],
          SimpleFunctionExpression,
          'Expected top-level expression to be a from() function call',
        );
        expect(fromExpression.functionName).toContain('from');

        // the runtime parameter is the last param to from(); its first value
        // should be a reference to the runtime we just selected. Without the
        // fix the runtime would be missing from the from() expression because
        // executionContextState.runtimeValue would not be a RuntimePointer.
        const runtimeParam = guaranteeNonNullable(
          fromExpression.parametersValues[
            fromExpression.parametersValues.length - 1
          ],
          'Expected from() to receive a runtime parameter',
        );
        const runtimeRef = (
          runtimeParam as unknown as {
            values: { value: PackageableRuntime }[];
          }
        ).values[0];
        expect(guaranteeNonNullable(runtimeRef).value).toBe(runtime2);
      },
    );
  },
);

/**
 * Entities matching the Lakehouse data product above but with NO
 * LakehouseRuntime defined. Used to reproduce the "relation explorer does not
 * load" bug: prior to the fix `initWithDataProduct` skipped
 * `setSourceElement(accessor)` when the graph had no compatible LakehouseRuntime
 * because both actions shared the same conjoined guard.
 */
const TEST_DATA__LakehouseEntitiesWithoutRuntime: Entity[] =
  TEST_DATA__LakehouseEntities.filter(
    (entity) =>
      entity.path !== 'model::LakehouseRuntime1' &&
      entity.path !== 'model::LakehouseRuntime2',
  );

const buildLakehouseDataProductStateFrom = async (entities: Entity[]) => {
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
  await TEST__buildGraphWithEntities(graphManagerState, entities);

  const dataProduct =
    graphManagerState.graph.getDataProduct('model::LakehouseDP');
  const ap1 = guaranteeNonNullable(
    dataProduct.accessPointGroups
      .flatMap((group) => group.accessPoints)
      .filter(
        (ap): ap is LakehouseAccessPoint => ap instanceof LakehouseAccessPoint,
      )
      .find((ap) => ap.id === 'lhAP1'),
  );
  const artifact = new V1_DataProductArtifact();
  const state = new DataProductQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    dataProduct,
    artifact,
    QueryBuilderActionConfig.INSTANCE,
    ap1,
    undefined,
    async () => {
      /* no-op */
    },
  );
  return { state, dataProduct, ap1, graphManagerState };
};

describe(
  unitTest('DataProductQueryBuilderState - initWithDataProduct for Lakehouse'),
  () => {
    test(
      unitTest(
        'sets sourceElement to the accessor even when no compatible LakehouseRuntime exists',
      ),
      async () => {
        const { state, dataProduct, ap1, graphManagerState } =
          await buildLakehouseDataProductStateFrom(
            TEST_DATA__LakehouseEntitiesWithoutRuntime,
          );

        // sanity check: precondition of the bug — no compatible runtime
        const execState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(execState.compatibleRuntimes).toEqual([]);
        expect(execState.selectedRuntime).toBeUndefined();

        const accessor = resolveDataProductAccessor(
          dataProduct,
          ap1,
          graphManagerState.graph,
          undefined,
          undefined,
        );

        state.initWithDataProduct(dataProduct, accessor, ap1);

        // Regression: the relation explorer relies on `sourceAccessor` being
        // populated so `QueryBuilderExplorerPanel` can render
        // `QueryBuilderRelationExplorerPanel` instead of the class explorer.
        expect(state.sourceAccessor).toBe(accessor);
        expect(state.sourceElement).toBeInstanceOf(DataProductAccessor);
        // sourceClass must remain undefined because the source is an accessor
        expect(state.sourceClass).toBeUndefined();
      },
    );

    test(
      unitTest(
        'sets sourceElement AND runtime when a compatible LakehouseRuntime exists',
      ),
      async () => {
        const { state, dataProduct, ap1, graphManagerState } =
          await buildLakehouseDataProductStateFrom(
            TEST_DATA__LakehouseEntities,
          );

        const execState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        // default selectedRuntime is compatibleRuntimes[0]
        const defaultRuntime = guaranteeNonNullable(execState.selectedRuntime);

        const accessor = resolveDataProductAccessor(
          dataProduct,
          ap1,
          graphManagerState.graph,
          undefined,
          undefined,
        );

        state.initWithDataProduct(dataProduct, accessor, ap1);

        expect(state.sourceAccessor).toBe(accessor);
        const runtimeValue = state.executionContextState.runtimeValue;
        expect(runtimeValue).toBeInstanceOf(RuntimePointer);
        expect(
          guaranteeType(runtimeValue, RuntimePointer).packageableRuntime.value,
        ).toBe(defaultRuntime);
      },
    );

    test(
      unitTest('does not wire source element when no accessor is provided'),
      async () => {
        const { state, dataProduct, ap1 } =
          await buildLakehouseDataProductStateFrom(
            TEST_DATA__LakehouseEntitiesWithoutRuntime,
          );

        state.initWithDataProduct(dataProduct, undefined, ap1);

        expect(state.sourceAccessor).toBeUndefined();
        expect(state.sourceElement).toBeUndefined();
      },
    );
  },
);

describe(
  unitTest('DataProductQueryBuilderState - dataProductAccessInfo'),
  () => {
    test(
      unitTest(
        'resolves the access point group of the selected lakehouse access point',
      ),
      async () => {
        const { state, ap1 } = await buildLakehouseDataProductState();

        state.initWithDataProduct(
          state.dataProduct,
          resolveDataProductAccessor(
            state.dataProduct,
            ap1,
            state.graphManagerState.graph,
            undefined,
          ),
          ap1,
        );

        const info = state.dataProductAccessInfo;
        expect(info.dataProductLabel).toBe('LakehouseDP');
        expect(info.dataProductId).toBe('LakehouseDP');
        // access is granted on the group, not the individual access point
        expect(info.accessPointGroupId).toBe('lhGroup1');
        expect(info.accessPointGroupLabel).toBe('lhGroup1');
        expect(info.environment).toBe('Production');
        expect(info.warehouse).toBe('WH_1');
        expect(info.supportEmails).toEqual([]);
      },
    );

    test(
      unitTest('tolerates an artifact without deployment information'),
      async () => {
        const { state } = await buildLakehouseDataProductState();

        // the fixture passes a constructed (not deserialized) artifact, whose
        // `dataProduct` is unset despite being declared as definitely assigned
        expect(state.dataProductAccessInfo.deploymentId).toBeUndefined();
      },
    );
  },
);

const TEST_DATA__ClassAndMappingEntities: Entity[] = [
  {
    path: 'model::ClassA',
    content: {
      _type: 'class',
      name: 'ClassA',
      package: 'model',
      properties: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::ClassB',
    content: {
      _type: 'class',
      name: 'ClassB',
      package: 'model',
      properties: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::MappingA',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'operation',
          class: 'model::ClassA',
          id: 'mappingA_classA',
          operation: 'STORE_UNION',
          parameters: ['mappingA_classA'],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MappingA',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::MappingB',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'operation',
          class: 'model::ClassB',
          id: 'mappingB_classB',
          operation: 'STORE_UNION',
          parameters: ['mappingB_classB'],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MappingB',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

const TEST_DATA__ModelOnlyEntities: Entity[] = [
  ...TEST_DATA__ClassAndMappingEntities,
  {
    path: 'model::ModelOnlyDP',
    content: {
      _type: 'dataProduct',
      name: 'ModelOnlyDP',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          id: 'modelGrpA',
          title: 'Model Group A',
          mapping: { path: 'model::MappingA', type: 'MAPPING' },
          accessPoints: [],
        },
        {
          _type: 'modelAccessPointGroup',
          id: 'modelGrpB',
          title: 'Model Group B',
          mapping: { path: 'model::MappingB', type: 'MAPPING' },
          accessPoints: [],
        },
      ],
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
];

const TEST_DATA__MixedEntities: Entity[] = [
  ...TEST_DATA__ClassAndMappingEntities,
  {
    path: 'model::MixedModelAndLakehouseDP',
    content: {
      _type: 'dataProduct',
      name: 'MixedModelAndLakehouseDP',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'modelAccessPointGroup',
          id: 'modelGrpA',
          title: 'Model Group A',
          mapping: { path: 'model::MappingA', type: 'MAPPING' },
          accessPoints: [],
        },
        {
          _type: 'modelAccessPointGroup',
          id: 'modelGrpB',
          title: 'Model Group B',
          mapping: { path: 'model::MappingB', type: 'MAPPING' },
          accessPoints: [],
        },
        {
          _type: 'accessPointGroup',
          id: 'lhGroup',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'lhAP1',
              title: 'Lakehouse AP 1',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
            {
              _type: 'lakehouseAccessPoint',
              id: 'lhAP2',
              title: 'Lakehouse AP 2',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 2 }],
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

const buildModelOnlyDataProductState = async () => {
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
    TEST_DATA__ModelOnlyEntities,
  );

  const dataProduct =
    graphManagerState.graph.getDataProduct('model::ModelOnlyDP');
  const modelGroups = dataProduct.accessPointGroups.filter(
    (group): group is ModelAccessPointGroup =>
      group instanceof ModelAccessPointGroup,
  );
  const modelGrpA = guaranteeNonNullable(
    modelGroups.find((g) => g.id === 'modelGrpA'),
  );
  const modelGrpB = guaranteeNonNullable(
    modelGroups.find((g) => g.id === 'modelGrpB'),
  );

  const artifact = new V1_DataProductArtifact();
  const state = new DataProductQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    dataProduct,
    artifact,
    QueryBuilderActionConfig.INSTANCE,
    modelGrpA,
    undefined,
    async () => {
      /* no-op */
    },
  );
  return { state, modelGrpA, modelGrpB, graphManagerState };
};

const buildMixedDataProductState = async () => {
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
    TEST_DATA__MixedEntities,
  );

  const dataProduct = graphManagerState.graph.getDataProduct(
    'model::MixedModelAndLakehouseDP',
  );
  const modelGroups = dataProduct.accessPointGroups.filter(
    (group): group is ModelAccessPointGroup =>
      group instanceof ModelAccessPointGroup,
  );
  const modelGrpA = guaranteeNonNullable(
    modelGroups.find((g) => g.id === 'modelGrpA'),
  );
  const modelGrpB = guaranteeNonNullable(
    modelGroups.find((g) => g.id === 'modelGrpB'),
  );
  const lakehouseAccessPoints = dataProduct.accessPointGroups
    .flatMap((group) => group.accessPoints)
    .filter(
      (ap): ap is LakehouseAccessPoint => ap instanceof LakehouseAccessPoint,
    );
  const lhAP1 = guaranteeNonNullable(
    lakehouseAccessPoints.find((ap) => ap.id === 'lhAP1'),
  );
  const lhAP2 = guaranteeNonNullable(
    lakehouseAccessPoints.find((ap) => ap.id === 'lhAP2'),
  );

  const artifact = new V1_DataProductArtifact();
  const state = new DataProductQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    dataProduct,
    artifact,
    QueryBuilderActionConfig.INSTANCE,
    lhAP1,
    undefined,
    async () => {
      /* no-op */
    },
  );
  return { state, modelGrpA, modelGrpB, lhAP1, lhAP2, graphManagerState };
};

describe(
  unitTest('DataProductQueryBuilderState - changeExecutionId context switches'),
  () => {
    test(
      unitTest(
        'switches between ModelAccessPointGroups in a model-only data product',
      ),
      async () => {
        const { state, modelGrpA, modelGrpB, graphManagerState } =
          await buildModelOnlyDataProductState();
        const classA = graphManagerState.graph.getClass('model::ClassA');
        const classB = graphManagerState.graph.getClass('model::ClassB');

        const initialState = guaranteeType(
          state.executionState,
          ModelAccessPointDataProductExecutionState,
        );
        expect(initialState.exectionValue).toBe(modelGrpA);
        expect(state.usableClasses).toEqual([classA]);

        const options = state.executionIdOptions;
        expect(options).toHaveLength(2);
        expect(options.every((o) => o.tag === 'MODEL')).toBe(true);
        expect(options.map((o) => o.value)).toEqual(
          expect.arrayContaining([modelGrpA, modelGrpB]),
        );

        await state.changeExecutionId({
          label: modelGrpB.title ?? modelGrpB.id,
          tag: 'MODEL',
          value: modelGrpB,
        });

        const stateAfterFirstSwitch = guaranteeType(
          state.executionState,
          ModelAccessPointDataProductExecutionState,
        );
        expect(stateAfterFirstSwitch.exectionValue).toBe(modelGrpB);
        expect(stateAfterFirstSwitch.mapping).toBe(modelGrpB.mapping.value);
        expect(state.executionContextState.mapping).toBe(
          modelGrpB.mapping.value,
        );
        expect(state.usableClasses).toEqual([classB]);

        await state.changeExecutionId({
          label: modelGrpA.title ?? modelGrpA.id,
          tag: 'MODEL',
          value: modelGrpA,
        });

        const stateAfterSecondSwitch = guaranteeType(
          state.executionState,
          ModelAccessPointDataProductExecutionState,
        );
        expect(stateAfterSecondSwitch.exectionValue).toBe(modelGrpA);
        expect(stateAfterSecondSwitch.mapping).toBe(modelGrpA.mapping.value);
        expect(state.executionContextState.mapping).toBe(
          modelGrpA.mapping.value,
        );
        expect(state.usableClasses).toEqual([classA]);
      },
    );

    test(
      unitTest(
        'switches between ModelAccessPointGroups and LakehouseAccessPoints in a mixed data product',
      ),
      async () => {
        const { state, modelGrpA, modelGrpB, lhAP1, lhAP2, graphManagerState } =
          await buildMixedDataProductState();
        const classA = graphManagerState.graph.getClass('model::ClassA');
        const classB = graphManagerState.graph.getClass('model::ClassB');

        const initialState = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(initialState.exectionValue).toBe(lhAP1);
        expect(state.usableClasses).toEqual([]);

        const options = state.executionIdOptions;
        expect(options).toHaveLength(4);
        const modelOptions = options.filter((o) => o.tag === 'MODEL');
        const lakehouseOptions = options.filter((o) => o.tag === 'LAKEHOUSE');
        expect(modelOptions).toHaveLength(2);
        expect(lakehouseOptions).toHaveLength(2);
        expect(modelOptions.map((o) => o.value)).toEqual(
          expect.arrayContaining([modelGrpA, modelGrpB]),
        );
        expect(lakehouseOptions.map((o) => o.value)).toEqual(
          expect.arrayContaining([lhAP1, lhAP2]),
        );
        expect(lakehouseOptions.every((o) => o.groupId === 'lhGroup')).toBe(
          true,
        );

        await state.changeExecutionId({
          label: modelGrpA.title ?? modelGrpA.id,
          tag: 'MODEL',
          value: modelGrpA,
        });

        const stateAfterLakehouseToModel = guaranteeType(
          state.executionState,
          ModelAccessPointDataProductExecutionState,
        );
        expect(stateAfterLakehouseToModel.exectionValue).toBe(modelGrpA);
        expect(stateAfterLakehouseToModel.mapping).toBe(
          modelGrpA.mapping.value,
        );
        expect(state.usableClasses).toEqual([classA]);

        await state.changeExecutionId({
          label: modelGrpB.title ?? modelGrpB.id,
          tag: 'MODEL',
          value: modelGrpB,
        });

        const stateAfterModelToModel = guaranteeType(
          state.executionState,
          ModelAccessPointDataProductExecutionState,
        );
        expect(stateAfterModelToModel.exectionValue).toBe(modelGrpB);
        expect(stateAfterModelToModel.mapping).toBe(modelGrpB.mapping.value);
        expect(state.usableClasses).toEqual([classB]);

        await state.changeExecutionId({
          label: lhAP2.title ?? lhAP2.id,
          tag: 'LAKEHOUSE',
          groupId: 'lhGroup',
          value: lhAP2,
        });

        const stateAfterModelToLakehouse = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(stateAfterModelToLakehouse.exectionValue).toBe(lhAP2);
        expect(state.usableClasses).toEqual([]);

        await state.changeExecutionId({
          label: lhAP1.title ?? lhAP1.id,
          tag: 'LAKEHOUSE',
          groupId: 'lhGroup',
          value: lhAP1,
        });

        const stateAfterLakehouseToLakehouse = guaranteeType(
          state.executionState,
          LakehouseDataProductExecutionState,
        );
        expect(stateAfterLakehouseToLakehouse.exectionValue).toBe(lhAP1);
        expect(state.usableClasses).toEqual([]);
      },
    );
  },
);
