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
  DataProductAccessor,
  LakehouseAccessPoint,
  RuntimePointer,
  SimpleFunctionExpression,
  V1_DataProductArtifact,
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

const buildLakehouseDataProductState = async () => {
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

  // Pass an empty artifact so `changeExecutionState` skips the
  // `getLambdaRelationType` engine call and `resolveDataProductAccessor`
  // falls back to the in-graph access point group lookup.
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
  return { state, ap1, ap2, graphManagerState };
};

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
