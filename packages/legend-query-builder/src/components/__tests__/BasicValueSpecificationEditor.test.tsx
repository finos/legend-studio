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
import { waitFor, fireEvent, screen, render } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  type PrimitiveInstanceValue,
  type ValueSpecification,
  ObserverContext,
  PRIMITIVE_TYPE,
  PrimitiveType,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import {
  TEST__setUpBasicValueSpecificationEditor,
  TEST__setUpGraphManagerState,
  TEST__setUpQueryBuilder,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__SimpleRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import { buildPrimitiveInstanceValue } from '../../stores/shared/ValueSpecificationEditorHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { TEST__LegendApplicationPluginManager } from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates string primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__SimpleRelationalModel,
      pluginManager,
    );
    const observerContext = new ObserverContext(
      graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );

    let stringValueSpec: ValueSpecification = observe_ValueSpecification(
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.STRING,
        'initial value',
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (newVal: ValueSpecification): void => {
      stringValueSpec = newVal;
    };

    const typeCheckOption = {
      expectedType: (stringValueSpec as PrimitiveInstanceValue).genericType
        .value.rawType,
      match:
        (stringValueSpec as PrimitiveInstanceValue).genericType.value
          .rawType === PrimitiveType.DATETIME,
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringValueSpec,
      setValueSpecification: setValueSpecification,
      typeCheckOption: typeCheckOption,
      resetValue: () => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const inputElement = await screen.findByDisplayValue('initial value');
    expect(inputElement).not.toBeNull();

    fireEvent.change(inputElement, { target: { value: 'updated value' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('updated value');

    expect((stringValueSpec as PrimitiveInstanceValue).values[0]).toBe(
      'updated value',
    );
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates integer primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__SimpleRelationalModel,
      pluginManager,
    );
    const observerContext = new ObserverContext(
      graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );

    let integerValueSpec: ValueSpecification = observe_ValueSpecification(
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.INTEGER,
        42,
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (newVal: ValueSpecification): void => {
      integerValueSpec = newVal;
    };

    const typeCheckOption = {
      expectedType: (integerValueSpec as PrimitiveInstanceValue).genericType
        .value.rawType,
      match:
        (integerValueSpec as PrimitiveInstanceValue).genericType.value
          .rawType === PrimitiveType.DATETIME,
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: integerValueSpec,
      setValueSpecification: setValueSpecification,
      typeCheckOption: typeCheckOption,
      resetValue: () => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const inputElement = await screen.findByDisplayValue('42');
    expect(inputElement).not.toBeNull();

    fireEvent.change(inputElement, { target: { value: '123.45' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('123');

    expect((integerValueSpec as PrimitiveInstanceValue).values[0]).toBe(123);
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates float primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__SimpleRelationalModel,
      pluginManager,
    );
    const observerContext = new ObserverContext(
      graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );

    let floatValueSpec: ValueSpecification = observe_ValueSpecification(
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.FLOAT,
        10.5,
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (newVal: ValueSpecification): void => {
      floatValueSpec = newVal;
    };

    const typeCheckOption = {
      expectedType: (floatValueSpec as PrimitiveInstanceValue).genericType
        .value.rawType,
      match:
        (floatValueSpec as PrimitiveInstanceValue).genericType.value
          .rawType === PrimitiveType.DATETIME,
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: floatValueSpec,
      setValueSpecification: setValueSpecification,
      typeCheckOption: typeCheckOption,
      resetValue: () => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const inputElement = await screen.findByDisplayValue('10.5');
    expect(inputElement).not.toBeNull();

    fireEvent.change(inputElement, { target: { value: '10.0' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('10');

    expect((floatValueSpec as PrimitiveInstanceValue).values[0]).toBe(10);
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates boolean primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__SimpleRelationalModel,
      pluginManager,
    );
    const observerContext = new ObserverContext(
      graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );

    let boolValueSpec: ValueSpecification = observe_ValueSpecification(
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.BOOLEAN,
        false,
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (newVal: ValueSpecification): void => {
      boolValueSpec = newVal;
    };

    const typeCheckOption = {
      expectedType: (boolValueSpec as PrimitiveInstanceValue).genericType
        .value.rawType,
      match:
        (boolValueSpec as PrimitiveInstanceValue).genericType.value
          .rawType === PrimitiveType.DATETIME,
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: boolValueSpec,
      setValueSpecification: setValueSpecification,
      typeCheckOption: typeCheckOption,
      resetValue: () => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const toggleElement = await screen.findByRole('checkbox');
    expect(toggleElement).not.toBeNull();
    
    expect((boolValueSpec as PrimitiveInstanceValue).values[0]).toBe(false);
    
    fireEvent.click(toggleElement);
    
    await waitFor(() => expect((boolValueSpec as PrimitiveInstanceValue).values[0]).toBe(true));
  },
);
