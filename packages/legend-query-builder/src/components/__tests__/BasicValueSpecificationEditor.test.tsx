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
const integrationTest = (name: string): string => `[INTEGRATION] ${name}`;
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
  getEnumValue,
  Multiplicity,
} from '@finos/legend-graph';
import {
  TEST__setUpBasicValueSpecificationEditor,
  TEST__setUpGraphManagerState,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
const TEST_DATA__SimpleRelationalModel = require('../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json');
const TEST_DATA__QueryBuilder_Model_ComplexRelational = require('../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json');
import { buildPrimitiveInstanceValue } from '../../stores/shared/ValueSpecificationEditorHelper.js';
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

    const stringCollectionValue = new CollectionInstanceValue(
      new Multiplicity(0, null),
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );

    stringCollectionValue.values = [
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.STRING,
        'value1',
        observerContext,
      ),
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.STRING,
        'value2',
        observerContext,
      ),
    ];

    let updatedValue: ValueSpecification | undefined;
    const setValueSpecification = (val: ValueSpecification): void => {
      updatedValue = val;
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

    await waitFor(() => {
      const element = screen.getByText(
        (content) => content.includes('value1') && content.includes('value2'),
      );
      expect(element).not.toBeNull();
    });

    const editButton = screen.getByRole('button', { name: '' });
    fireEvent.click(editButton);

    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: 'value3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    expect(updatedValue).not.toBeUndefined();
    expect(updatedValue instanceof CollectionInstanceValue).toBe(true);
    if (updatedValue instanceof CollectionInstanceValue) {
      expect(updatedValue.values.length).toBe(3);
      const values = updatedValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values).toContain('value1');
      expect(values).toContain('value2');
      expect(values).toContain('value3');
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

    const integerCollectionValue = new CollectionInstanceValue(
      new Multiplicity(0, null),
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.INTEGER),
      ),
    );

    integerCollectionValue.values = [
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.INTEGER,
        1,
        observerContext,
      ),
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.INTEGER,
        2,
        observerContext,
      ),
    ];

    let updatedValue: ValueSpecification | undefined;
    const setValueSpecification = (val: ValueSpecification): void => {
      updatedValue = val;
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

    await waitFor(() => {
      const element = screen.getByText(
        (content) => content.includes('1') && content.includes('2'),
      );
      expect(element).not.toBeNull();
    });

    const editButton = screen.getByRole('button', { name: '' });
    fireEvent.click(editButton);

    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    expect(updatedValue).not.toBeUndefined();
    expect(updatedValue instanceof CollectionInstanceValue).toBe(true);
    if (updatedValue instanceof CollectionInstanceValue) {
      expect(updatedValue.values.length).toBe(3);
      const values = updatedValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain(3);
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

    const floatCollectionValue = new CollectionInstanceValue(
      new Multiplicity(0, null),
      GenericTypeExplicitReference.create(new GenericType(PrimitiveType.FLOAT)),
    );

    floatCollectionValue.values = [
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.FLOAT,
        1.1,
        observerContext,
      ),
      buildPrimitiveInstanceValue(
        graphManagerState.graph,
        PRIMITIVE_TYPE.FLOAT,
        2.2,
        observerContext,
      ),
    ];

    let updatedValue: ValueSpecification | undefined;
    const setValueSpecification = (val: ValueSpecification): void => {
      updatedValue = val;
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

    await waitFor(() => {
      const element = screen.getByText(
        (content) => content.includes('1.1') && content.includes('2.2'),
      );
      expect(element).not.toBeNull();
    });

    const editButton = screen.getByRole('button', { name: '' });
    fireEvent.click(editButton);

    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: '3.3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    expect(updatedValue).not.toBeUndefined();
    expect(updatedValue instanceof CollectionInstanceValue).toBe(true);
    if (updatedValue instanceof CollectionInstanceValue) {
      expect(updatedValue.values.length).toBe(3);
      const values = updatedValue.values.map(
        (v) => (v as PrimitiveInstanceValue).values[0],
      );
      expect(values).toContain(1.1);
      expect(values).toContain(2.2);
      expect(values).toContain(3.3);
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
      new Multiplicity(0, null),
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );

    const maleEnumValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );
    maleEnumValue.values = [
      EnumValueExplicitReference.create(
        genderTypeEnum.values.find((v) => v.name === 'MALE'),
      ),
    ];

    const femaleEnumValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(genderTypeEnum)),
    );
    femaleEnumValue.values = [
      EnumValueExplicitReference.create(
        genderTypeEnum.values.find((v) => v.name === 'FEMALE'),
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
