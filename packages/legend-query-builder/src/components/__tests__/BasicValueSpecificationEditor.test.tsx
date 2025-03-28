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
  EnumValueInstanceValue,
} from '@finos/legend-graph';
import {
  TEST__setUpBasicValueSpecificationEditor,
  TEST__setUpGraphManagerState,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import TEST_DATA__SimpleRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_ComplexRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import {
  buildEnumCollectionInstanceValue,
  buildEnumInstanceValue,
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
    'BasicValueSpecificationEditor renders and updates enum values correctly',
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

    const enumType = graphManagerState.graph.getType(
      'model::pure::tests::model::simple::GeographicEntityType',
    );
    let enumValueSpec: ValueSpecification = observe_ValueSpecification(
      buildEnumInstanceValue(
        graphManagerState.graph,
        'model::pure::tests::model::simple::GeographicEntityType',
        'STATE',
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (newVal: ValueSpecification): void => {
      enumValueSpec = newVal;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: enumValueSpec,
      setValueSpecification: setValueSpecification,
      typeCheckOption: {
        expectedType: enumType,
      },
      resetValue: () => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const inputElement = guaranteeNonNullable(
      (await screen.findByText('STATE')).parentElement?.querySelector('input'),
    );
    expect(inputElement).not.toBeNull();

    // TODO: figure out how to test clicking on an enum option from
    // the dropdown

    // Test that typing in a value and blurring input updates value
    fireEvent.change(inputElement, { target: { value: 'REGION' } });
    fireEvent.keyDown(inputElement, { key: 'Enter' });

    await screen.findByText('REGION');

    expect(
      (enumValueSpec as EnumValueInstanceValue).values[0]?.value.name,
    ).toBe('REGION');
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

    const enumType = graphManagerState.graph.getType(
      'model::pure::tests::model::simple::GeographicEntityType',
    );
    let enumCollectionValue = observe_ValueSpecification(
      buildEnumCollectionInstanceValue(
        graphManagerState.graph,
        'model::pure::tests::model::simple::GeographicEntityType',
        ['CITY'],
        observerContext,
      ),
      observerContext,
    );

    const setValueSpecification = (val: ValueSpecification): void => {
      enumCollectionValue = val;
    };

    TEST__setUpBasicValueSpecificationEditor(pluginManager, {
      valueSpecification: enumCollectionValue,
      setValueSpecification,
      typeCheckOption: {
        expectedType: enumType,
      },
      resetValue: (): void => {},
      graph: graphManagerState.graph,
      observerContext: observerContext,
    });

    const listEditorElement = await screen.findByText('List(1): CITY');

    fireEvent.click(listEditorElement);

    const input = await screen.findByRole('combobox');

    // TODO: figure out how to test clicking on an enum option from
    // the dropdown

    // Test that typing in a value exactly adds it
    fireEvent.change(input, { target: { value: 'COUNTRY' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Test that typing in a value that doesn't exist doesn't add it
    fireEvent.change(input, { target: { value: 'REG' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByDisplayValue('REG')).not.toBeNull();

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await screen.findByText('List(2): CITY,COUNTRY');

    expect(enumCollectionValue).not.toBeUndefined();
    expect(enumCollectionValue instanceof CollectionInstanceValue).toBe(true);
    if (enumCollectionValue instanceof CollectionInstanceValue) {
      expect(enumCollectionValue.values.length).toBe(2);
      const enumNames = enumCollectionValue.values
        .filter((v) => v instanceof EnumValueInstanceValue)
        .map((v) => (v as EnumValueInstanceValue).values[0]?.value.name);
      expect(enumNames[0]).toBe('CITY');
      expect(enumNames[1]).toContain('COUNTRY');
    }
  },
);
