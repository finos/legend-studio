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

import { test, expect } from '@jest/globals';
import { act, getByText, waitFor } from '@testing-library/react';
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
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Milestoning.js';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json';
import {
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../QueryEditorComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../stores/fetch-structure/projection/QueryBuilderProjectionColumnState.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import { QueryBuilderProjectionState } from '../../stores/fetch-structure/projection/QueryBuilderProjectionState.js';

test(
  integrationTest(
    'Query builder state is properly set after processing a lambda with Business Temporal source Processing Temporal target',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person1');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person1');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person1');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person1'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person2');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person2');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Person2');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Person2'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;

    const _personClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget.parameters,
          TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget.body,
        ),
      );
    });

    const projectionState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderProjectionState,
    );
    const projectionColumnState = guaranteeType(
      projectionState.columns[0],
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
