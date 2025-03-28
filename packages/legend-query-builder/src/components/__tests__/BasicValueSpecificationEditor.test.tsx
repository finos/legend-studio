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
import { waitFor, fireEvent, screen } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  type PrimitiveInstanceValue,
  type ValueSpecification,
  ObserverContext,
  PRIMITIVE_TYPE,
  PrimitiveType,
  observe_ValueSpecification,
  CollectionInstanceValue,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
} from '@finos/legend-graph';
import {
  TEST__setUpBasicValueSpecificationEditor,
  TEST__setUpGraphManagerState,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__SimpleRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_ComplexRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import {
  buildPrimitiveCollectionInstanceValue,
  buildPrimitiveInstanceValue,
} from '../../stores/shared/ValueSpecificationEditorHelper.js';
import { TEST__LegendApplicationPluginManager } from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

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
      expectedType: (floatValueSpec as PrimitiveInstanceValue).genericType.value
        .rawType,
      match:
        (floatValueSpec as PrimitiveInstanceValue).genericType.value.rawType ===
        PrimitiveType.DATETIME,
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
      expectedType: (boolValueSpec as PrimitiveInstanceValue).genericType.value
        .rawType,
      match:
        (boolValueSpec as PrimitiveInstanceValue).genericType.value.rawType ===
        PrimitiveType.DATETIME,
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

    await waitFor(() => {
      expect((boolValueSpec as PrimitiveInstanceValue).values[0]).toBe(true);
    });
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates string collection values correctly',
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

    let stringCollectionValue = observe_ValueSpecification(
      buildPrimitiveCollectionInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.STRING,
        ['value1', 'value2'],
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (val: ValueSpecification): void => {
      stringCollectionValue = val;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringCollectionValue,
      setValueSpecification,
      typeCheckOption: {
        expectedType: PrimitiveType.STRING,
      },
      resetValue: (): void => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const listEditorElement = await screen.findByText('List(2): value1,value2');

    fireEvent.click(listEditorElement);

    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: 'value3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Test that duplicate values don't get added
    fireEvent.change(input, { target: { value: 'value3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByDisplayValue('value3')).not.toBeNull();

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await screen.findByText('List(3): value1,value2,value3');

    expect(stringCollectionValue instanceof CollectionInstanceValue).toBe(true);
    if (stringCollectionValue instanceof CollectionInstanceValue) {
      expect(stringCollectionValue.values.length).toBe(3);
      const values = stringCollectionValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values[0]).toBe('value1');
      expect(values[1]).toBe('value2');
      expect(values[2]).toBe('value3');
    }
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates integer collection values correctly',
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

    let integerCollectionValue = observe_ValueSpecification(
      buildPrimitiveCollectionInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.INTEGER,
        [1, 2],
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (val: ValueSpecification): void => {
      integerCollectionValue = val;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: integerCollectionValue,
      setValueSpecification,
      typeCheckOption: {
        expectedType: PrimitiveType.INTEGER,
      },
      resetValue: (): void => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const listEditorElement = await screen.findByText('List(2): 1,2');

    fireEvent.click(listEditorElement);

    // Test that float is converted to int
    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: '3.2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('3');

    // Test that duplicate values don't get added
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByDisplayValue('3')).not.toBeNull();

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await screen.findByText('List(3): 1,2,3');

    expect(integerCollectionValue instanceof CollectionInstanceValue).toBe(
      true,
    );
    if (integerCollectionValue instanceof CollectionInstanceValue) {
      expect(integerCollectionValue.values.length).toBe(3);
      const values = integerCollectionValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values[0]).toBe(1);
      expect(values[1]).toBe(2);
      expect(values[2]).toBe(3);
    }
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates float collection values correctly',
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

    let floatCollectionValue = observe_ValueSpecification(
      buildPrimitiveCollectionInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.INTEGER,
        [1.1, 2.2],
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (val: ValueSpecification): void => {
      floatCollectionValue = val;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: floatCollectionValue,
      setValueSpecification,
      typeCheckOption: {
        expectedType: PrimitiveType.FLOAT,
      },
      resetValue: (): void => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const listEditorElement = await screen.findByText('List(2): 1.1,2.2');

    fireEvent.click(listEditorElement);

    // Test that trailing zeros are removed
    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: '3.0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('3');

    // Test that duplicate values don't get added
    fireEvent.change(input, { target: { value: '3.0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByDisplayValue('3.0')).not.toBeNull();

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await screen.findByText('List(3): 1.1,2.2,3');

    expect(floatCollectionValue instanceof CollectionInstanceValue).toBe(true);
    if (floatCollectionValue instanceof CollectionInstanceValue) {
      expect(floatCollectionValue.values.length).toBe(3);
      const values = floatCollectionValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values[0]).toBe(1.1);
      expect(values[1]).toBe(2.2);
      expect(values[2]).toBe(3);
    }
  },
);

test(
  integrationTest(
    'BasicValueSpecificationEditor renders and updates enum collection values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__QueryBuilder_Model_ComplexRelational,
      pluginManager,
    );
    const observerContext = new ObserverContext(
      graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );

    const genderTypeEnum = graphManagerState.graph.getEnumeration(
      'model::owl::tests::model::GenderType',
    );
    expect(genderTypeEnum).not.toBeUndefined();

    const enumCollectionValue = new CollectionInstanceValue(
      new Multiplicity(0, undefined),
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );

    const maleEnumValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );
    maleEnumValue.values = [
      EnumValueExplicitReference.create(
        guaranteeNonNullable(
          genderTypeEnum.values.find((v) => v.name === 'MALE'),
        ),
      ),
    ];

    const femaleEnumValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );
    femaleEnumValue.values = [
      EnumValueExplicitReference.create(
        guaranteeNonNullable(
          genderTypeEnum.values.find((v) => v.name === 'FEMALE'),
        ),
      ),
    ];

    enumCollectionValue.values = [maleEnumValue, femaleEnumValue];

    let updatedValue: ValueSpecification | undefined;
    const setValueSpecification = (val: ValueSpecification): void => {
      updatedValue = val;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: enumCollectionValue,
      setValueSpecification,
      typeCheckOption: {
        expectedType: genderTypeEnum,
      },
      resetValue: (): void => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    await waitFor(() => {
      const element = screen.getByText(
        (content) => content.includes('MALE') && content.includes('FEMALE'),
      );
      expect(element).not.toBeNull();
    });

    const editButton = screen.getByRole('button', { name: '' });
    fireEvent.click(editButton);

    const input = await screen.findByRole('combobox');

    fireEvent.change(input, { target: { value: 'FEMALE' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    expect(updatedValue).not.toBeUndefined();
    expect(updatedValue instanceof CollectionInstanceValue).toBe(true);
    if (updatedValue instanceof CollectionInstanceValue) {
      expect(updatedValue.values.length).toBe(2);
      const enumNames = updatedValue.values
        .filter((v) => v instanceof EnumValueInstanceValue)
        .map((v) => (v as EnumValueInstanceValue).values[0]?.value.name);
      expect(enumNames).toContain('MALE');
      expect(enumNames).toContain('FEMALE');
    }
  },
);
