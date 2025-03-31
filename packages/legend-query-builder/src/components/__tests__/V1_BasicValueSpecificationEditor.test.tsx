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
import { fireEvent, screen } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  type V1_CString,
  type V1_ValueSpecification,
  observe_V1ValueSpecification,
  PRIMITIVE_TYPE,
  V1_Multiplicity,
} from '@finos/legend-graph';
import { TEST__setUpV1BasicValueSpecificationEditor } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST__LegendApplicationPluginManager } from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import {
  _defaultPrimitiveTypeValue,
  _primitiveValue,
  _type,
} from '@finos/legend-data-cube';
import { V1_PrimitiveValue_setValue } from '../../stores/shared/V1_ValueSpecificationModifierHelper.js';

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor reset button calls reset callback',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = observe_V1ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.STRING, 'initial value'),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      stringValueSpec = newVal;
    };

    const resetValue = (): void => {
      V1_PrimitiveValue_setValue(
        stringValueSpec as V1_CString,
        _defaultPrimitiveTypeValue(PRIMITIVE_TYPE.STRING),
      );
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringValueSpec,
      setValueSpecification: setValueSpecification,
      type: _type(PRIMITIVE_TYPE.STRING),
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: PRIMITIVE_TYPE.STRING,
        match: false,
      },
      resetValue: resetValue,
    });

    const inputElement = await screen.findByDisplayValue('initial value');
    expect(inputElement).not.toBeNull();

    // Test resetting value shows error styling
    fireEvent.click(screen.getByTitle('Reset'));
    await screen.findByPlaceholderText('(empty)');
    expect((stringValueSpec as V1_CString).value).toBe('');
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates string primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = observe_V1ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.STRING, 'initial value'),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      stringValueSpec = newVal;
    };

    const resetValue = (): void => {
      V1_PrimitiveValue_setValue(
        stringValueSpec as V1_CString,
        _defaultPrimitiveTypeValue(PRIMITIVE_TYPE.STRING),
      );
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringValueSpec,
      setValueSpecification: setValueSpecification,
      type: _type(PRIMITIVE_TYPE.STRING),
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: PRIMITIVE_TYPE.STRING,
        match: false,
      },
      resetValue: resetValue,
    });

    const inputElement = await screen.findByDisplayValue('initial value');
    expect(inputElement).not.toBeNull();

    // Test updating value
    fireEvent.change(inputElement, { target: { value: 'updated value' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('updated value');

    expect((stringValueSpec as V1_CString).value).toBe('updated value');

    // Test that empty string is allowed
    fireEvent.change(inputElement, { target: { value: '' } });
    fireEvent.blur(inputElement);

    await screen.findByPlaceholderText('(empty)');
    expect((stringValueSpec as V1_CString).value).toBe('');
    expect(inputElement.classList).not.toContain(
      'input--with-validation--error',
    );
  },
);
