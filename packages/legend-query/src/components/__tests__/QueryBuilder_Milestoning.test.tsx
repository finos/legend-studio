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

import { getByText } from '@testing-library/react';
import {
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Milestoning';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { waitFor } from '@testing-library/dom';
import { RawLambda } from '@finos/legend-graph';
import {
  TEST__provideMockedLegendQueryStore,
  TEST__setUpQueryEditor,
} from '../QueryComponentTestUtils';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID';
import { QueryBuilderSimpleProjectionColumnState } from '../../stores/QueryBuilderProjectionState';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager';
import { Query_GraphPreset } from '../../models/Query_GraphPreset';

const getRawLambda = (jsonRawLambda: {
  parameters?: object;
  body?: object;
}): RawLambda => new RawLambda(jsonRawLambda.parameters, jsonRawLambda.body);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Business Temporal source Processing Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Business Temporal source Business Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Business Temporal source BiTemporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(3);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with BiTemporal source BiTemporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person1');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated.
    expect(parameterValues.length).toBe(3);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with BiTemporal source Business Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person1');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    //default milestoning date is propagated.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with BiTemporal source Processing Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person1');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    //default milestoning date is propagated.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Processing Temporal source BiTemporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person2');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(3);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Processing Temporal source Business Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person2');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Processing Temporal source Processing Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Person2');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is not propagated as date propagation is supported.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with non-temporal source Processing Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Firm');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with non-temporal source Business Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Firm');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(2);
  },
);

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with non-temporal source BiTemporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      mockedQueryStore,
      TEST_MilestoningModel,
      RawLambda.createStub(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = mockedQueryStore.queryBuilderState;

    const _personClass =
      mockedQueryStore.graphManagerState.graph.getClass('my::Firm');
    queryBuilderState.changeClass(_personClass);
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    queryBuilderState.initialize(
      getRawLambda(
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
      ),
    );
    const projectionColumnState = guaranteeType(
      queryBuilderState.fetchStructureState.projectionState.columns[0],
      QueryBuilderSimpleProjectionColumnState,
    );
    const derivedPropertyExpressionStates =
      projectionColumnState.propertyExpressionState
        .derivedPropertyExpressionStates;

    // property replaced with derived property as it is milestoned
    expect(derivedPropertyExpressionStates.length).toBe(1);
    const parameterValues = guaranteeNonNullable(
      derivedPropertyExpressionStates[0]?.propertyExpression.parametersValues,
    );

    // default milestoning date is propagated as date propagation is not supported.
    expect(parameterValues.length).toBe(3);
  },
);
