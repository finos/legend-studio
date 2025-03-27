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
import {
  waitFor,
  fireEvent,
  getByText,
  getByRole,
  getByDisplayValue,
  render,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import {
  TEST__setUpQueryBuilder,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__SimpleRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import { stub_RawLambda } from '@finos/legend-graph';
import { buildPrimitiveInstanceValue } from '../../stores/shared/ValueSpecificationEditorHelper.js';
import { BasicValueSpecificationEditor } from '../shared/BasicValueSpecificationEditor.js';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { guaranteeNonNullable } from '@finos/legend-shared';

const TestEditorWrapper = observer((props: {
  valueSpecification: PrimitiveInstanceValue;
  setValueSpecification: (val: PrimitiveInstanceValue) => void;
  graph: any;
  observerContext: any;
}) => {
  const { valueSpecification, setValueSpecification, graph, observerContext } = props;
  
  return (
    <BasicValueSpecificationEditor
      valueSpecification={valueSpecification}
      graph={graph}
      observerContext={observerContext}
      typeCheckOption={{
        expectedType: valueSpecification.genericType.value.rawType,
        disableTimeZone: false,
      }}
      setValueSpecification={setValueSpecification}
      resetValue={() => {
      }}
    />
  );
});

test(
  integrationTest('BasicValueSpecificationEditor renders and updates string primitive values correctly'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__SimpleRelationalModel,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational,
    );

    let stringValueSpec = buildPrimitiveInstanceValue(
      queryBuilderState.graphManagerState.graph,
      PRIMITIVE_TYPE.STRING,
      'initial value',
      queryBuilderState.observerContext,
    );
    
    const setValueSpecification = (newVal: PrimitiveInstanceValue): void => {
      stringValueSpec = newVal;
    };
    
    const { getByDisplayValue: getByDisplayValueInEditor } = render(
      <TestEditorWrapper
        valueSpecification={stringValueSpec}
        setValueSpecification={setValueSpecification}
        graph={queryBuilderState.graphManagerState.graph}
        observerContext={queryBuilderState.observerContext}
      />
    );

    const inputElement = getByDisplayValueInEditor('initial value');
    expect(inputElement).not.toBeNull();
    
    fireEvent.change(inputElement, { target: { value: 'updated value' } });
    fireEvent.blur(inputElement);
    
    await waitFor(() => getByDisplayValueInEditor('updated value'));
    
    expect(stringValueSpec.values[0]).toBe('updated value');
  }
);

test(
  integrationTest('BasicValueSpecificationEditor renders and updates number primitive values correctly'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__SimpleRelationalModel,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational,
    );

    let numberValueSpec = buildPrimitiveInstanceValue(
      queryBuilderState.graphManagerState.graph,
      PRIMITIVE_TYPE.INTEGER,
      42,
      queryBuilderState.observerContext,
    );
    
    const setValueSpecification = (newVal: PrimitiveInstanceValue): void => {
      numberValueSpec = newVal;
    };
    
    const { getByDisplayValue: getByDisplayValueInEditor } = render(
      <TestEditorWrapper
        valueSpecification={numberValueSpec}
        setValueSpecification={setValueSpecification}
        graph={queryBuilderState.graphManagerState.graph}
        observerContext={queryBuilderState.observerContext}
      />
    );

    const inputElement = getByDisplayValueInEditor('42');
    expect(inputElement).not.toBeNull();
    
    fireEvent.change(inputElement, { target: { value: '123' } });
    fireEvent.blur(inputElement);
    
    await waitFor(() => getByDisplayValueInEditor('123'));
    
    expect(numberValueSpec.values[0]).toBe(123);
  }
);

test(
  integrationTest('BasicValueSpecificationEditor renders and updates boolean primitive values correctly'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__SimpleRelationalModel,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational,
    );

    let boolValueSpec = buildPrimitiveInstanceValue(
      queryBuilderState.graphManagerState.graph,
      PRIMITIVE_TYPE.BOOLEAN,
      false,
      queryBuilderState.observerContext,
    );
    
    const setValueSpecification = (newVal: PrimitiveInstanceValue): void => {
      boolValueSpec = newVal;
    };
    
    const component = render(
      <TestEditorWrapper
        valueSpecification={boolValueSpec}
        setValueSpecification={setValueSpecification}
        graph={queryBuilderState.graphManagerState.graph}
        observerContext={queryBuilderState.observerContext}
      />
    );

    const toggleElement = guaranteeNonNullable(
      component.container.querySelector('.toggle-switch__slider')
    );
    
    expect(boolValueSpec.values[0]).toBe(false);
    
    fireEvent.click(toggleElement);
    
    await waitFor(() => expect(boolValueSpec.values[0]).toBe(true));
  }
);
