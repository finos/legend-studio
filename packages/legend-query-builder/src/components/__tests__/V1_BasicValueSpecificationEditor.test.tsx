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
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  type V1_CBoolean,
  type V1_CDateTime,
  type V1_CStrictDate,
  type V1_ValueSpecification,
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CEnumValue,
  V1_CFloat,
  V1_CInteger,
  V1_CLatestDate,
  V1_Collection,
  V1_CString,
  V1_Enumeration,
  V1_EnumValue,
  V1_Multiplicity,
  V1_observe_ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { TEST__setUpV1BasicValueSpecificationEditor } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST__LegendApplicationPluginManager } from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { V1_PrimitiveValue_setValue } from '../../stores/shared/V1_ValueSpecificationModifierHelper.js';
import { CUSTOM_DATE_PICKER_OPTION } from '../shared/CustomDatePickerHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import {
  _collection,
  _defaultPrimitiveTypeValue,
  _elementPtr,
  _enumValue,
  _primitiveValue,
  _property,
  _type,
} from '@finos/legend-data-cube';
import { integrationTest } from '@finos/legend-shared/test';

function _packageableEnumeration(
  enumerationPackage: string,
  enumerationName: string,
  values: V1_EnumValue[],
): V1_Enumeration {
  const enumeration = new V1_Enumeration();
  enumeration.package = enumerationPackage;
  enumeration.name = enumerationName;
  enumeration.values = values;
  return enumeration;
}

function _packageableEnumValue(value: string): V1_EnumValue {
  const enumValue = new V1_EnumValue();
  enumValue.value = value;
  return enumValue;
}

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor reset button calls reset callback',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = V1_observe_ValueSpecification(
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
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
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
    expect(inputElement.classList).toContain('input--with-validation--error');
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor allows empty value if not required',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = V1_observe_ValueSpecification(
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
      multiplicity: V1_Multiplicity.ZERO_ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
        match: false,
      },
      resetValue: resetValue,
    });

    const inputElement = await screen.findByDisplayValue('initial value');
    expect(inputElement).not.toBeNull();

    // Reset value
    fireEvent.click(screen.getByTitle('Reset'));
    await screen.findByPlaceholderText('(empty)');
    expect((stringValueSpec as V1_CString).value).toBe('');

    // Verify no error styling
    expect(inputElement.classList).not.toContain(
      'input--with-validation--error',
    );
  },
);

test(
  integrationTest('V1_BasicValueSpecificationEditor readOnly disables input'),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = V1_observe_ValueSpecification(
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
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
        match: false,
      },
      resetValue: resetValue,
      readOnly: true,
    });

    const inputElement = await screen.findByDisplayValue('initial value');
    expect(inputElement).not.toBeNull();
    expect(inputElement.hasAttribute('disabled')).toBe(true);

    const resetButton = screen.getByTitle('Reset');
    expect(resetButton).not.toBeNull();
    expect(resetButton.hasAttribute('disabled')).toBe(true);
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates string primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringValueSpec = V1_observe_ValueSpecification(
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
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
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

    // Test that empty string is not allowed
    fireEvent.change(inputElement, { target: { value: '' } });
    fireEvent.blur(inputElement);

    await screen.findByPlaceholderText('(empty)');
    expect((stringValueSpec as V1_CString).value).toBe('');
    expect(inputElement.classList).toContain('input--with-validation--error');
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates integer primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let integerValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.INTEGER, 42),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      integerValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: integerValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.INTEGER),
        match: false,
      },
      resetValue: () => {},
    });

    const inputElement = await screen.findByDisplayValue('42');
    expect(inputElement).not.toBeNull();

    fireEvent.change(inputElement, { target: { value: '123.45' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('123');

    expect((integerValueSpec as V1_CInteger).value).toBe(123);
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates float primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let floatValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.FLOAT, 10.5),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      floatValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: floatValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.FLOAT),
        match: false,
      },
      resetValue: () => {},
    });

    const inputElement = await screen.findByDisplayValue('10.5');
    expect(inputElement).not.toBeNull();

    // Test that trailing zeros are removed
    fireEvent.change(inputElement, { target: { value: '10.0' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('10');

    expect((floatValueSpec as V1_CFloat).value).toBe(10);

    // Test that expressions are evaluated correctly
    fireEvent.change(inputElement, { target: { value: '5.2 * 2' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('10.4');

    expect((floatValueSpec as V1_CFloat).value).toBe(10.4);

    // Test that invalid input resets to previous value
    fireEvent.change(inputElement, { target: { value: 'invalid' } });
    fireEvent.blur(inputElement);

    await screen.findByDisplayValue('10.4');

    expect((floatValueSpec as V1_CFloat).value).toBe(10.4);
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates boolean primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let boolValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.BOOLEAN, false),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      boolValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: boolValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.BOOLEAN),
        match: false,
      },
      resetValue: () => {},
    });

    const toggleElement = await screen.findByRole('checkbox');
    expect(toggleElement).not.toBeNull();

    expect((boolValueSpec as V1_CBoolean).value).toBe(false);

    fireEvent.click(toggleElement);

    await waitFor(() => {
      expect((boolValueSpec as V1_CBoolean).value).toBe(true);
    });
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates date primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let dateValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.DATE, '2025-03-28'),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      dateValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: dateValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.DATE),
        match: false,
      },
      resetValue: () => {},
    });

    const customDatePickerButton = await screen.findByTitle(
      'Click to edit and pick from more date options',
    );
    expect(customDatePickerButton).not.toBeNull();

    expect((dateValueSpec as V1_CStrictDate).value).toBe('2025-03-28');

    // Test changing to custom date
    fireEvent.click(customDatePickerButton);
    fireEvent.click(
      await screen.findByText(CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE),
    );
    const customDateDurationInput = await screen.findByDisplayValue('0');
    fireEvent.click(customDateDurationInput);
    fireEvent.change(customDateDurationInput, { target: { value: '03' } });

    // TODO: we should be able to enter Escape key here to close the modal
    // and check the updated value, but it seems to reset it for some reaspon.

    await screen.findByText('3 Day(s) Before Today');
    expect(dateValueSpec instanceof V1_AppliedFunction).toBeTruthy();
    if (dateValueSpec instanceof V1_AppliedFunction) {
      expect(dateValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
      );
      expect(dateValueSpec.parameters).toHaveLength(3);
      const referenceMomentValueSpec = guaranteeType(
        dateValueSpec.parameters[0],
        V1_AppliedFunction,
      );
      expect(referenceMomentValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
      );
      const directionValueSpec = guaranteeType(
        dateValueSpec.parameters[1],
        V1_AppliedFunction,
      );
      expect(directionValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
      );
      expect(
        directionValueSpec.parameters[0] instanceof V1_CInteger,
      ).toBeTruthy();
      expect((directionValueSpec.parameters[0] as V1_CInteger).value).toBe(3);
    }

    // Test changing to today
    fireEvent.keyDown(
      screen.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );
    fireEvent.click(customDatePickerButton);
    fireEvent.click(await screen.findByText(CUSTOM_DATE_PICKER_OPTION.TODAY));
    fireEvent.keyDown(
      screen.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    await screen.findByText('Today');
    expect(dateValueSpec instanceof V1_AppliedFunction).toBeTruthy();
    if (dateValueSpec instanceof V1_AppliedFunction) {
      expect(dateValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
      );
    }

    // Test that not selecting a valid value doesn't change the value
    fireEvent.click(customDatePickerButton);
    fireEvent.click(
      await screen.findByText(CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF),
    );
    fireEvent.keyDown(
      screen.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    await screen.findByText('Today');
    expect(dateValueSpec instanceof V1_AppliedFunction).toBeTruthy();
    if (dateValueSpec instanceof V1_AppliedFunction) {
      expect(dateValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
      );
    }

    // Test latest date
    fireEvent.click(customDatePickerButton);
    fireEvent.click(
      await screen.findByText(CUSTOM_DATE_PICKER_OPTION.LATEST_DATE),
    );
    fireEvent.keyDown(
      screen.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    await screen.findByText('Latest Date');
    expect(dateValueSpec instanceof V1_CLatestDate).toBeTruthy();

    // TODO: figure out why entering an Absolute Date updates the
    // value specification but not the rendered component (note:
    // the component works fine in practice, just not in the test)
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates datetime primitive values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let dateValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.DATETIME, '2025-03-28-T12:00:00'),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      dateValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: dateValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.DATETIME),
        match: true,
      },
      resetValue: () => {},
    });

    const customDatePickerButton = await screen.findByTitle(
      'Click to edit and pick from more date options',
    );
    expect(customDatePickerButton).not.toBeNull();

    expect((dateValueSpec as V1_CDateTime).value).toBe('2025-03-28-T12:00:00');

    // Test changing to now function
    fireEvent.click(customDatePickerButton);
    fireEvent.click(await screen.findByText(CUSTOM_DATE_PICKER_OPTION.NOW));
    fireEvent.keyDown(
      screen.getByText(CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );

    await screen.findByText('Now');
    expect(dateValueSpec instanceof V1_AppliedFunction).toBeTruthy();
    if (dateValueSpec instanceof V1_AppliedFunction) {
      expect(dateValueSpec.function).toBe(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
      );
    }
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor does not support StrictTime value',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let strictTimeValueSpec = V1_observe_ValueSpecification(
      _primitiveValue(PRIMITIVE_TYPE.STRICTTIME, '2025-03-28'),
    );

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      strictTimeValueSpec = newVal;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: strictTimeValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRICTTIME),
        match: false,
      },
      resetValue: () => {},
    });

    await screen.findByText('Unsupported V1 type: StrictTime');
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates enum values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let enumValueSpec = V1_observe_ValueSpecification(
      _enumValue('Mr', 'test::myEnum'),
    ) as V1_CEnumValue;
    const enumeration = _packageableEnumeration('test', 'myEnum', [
      _packageableEnumValue('Mr'),
      _packageableEnumValue('Mrs'),
      _packageableEnumValue('Ms'),
      _packageableEnumValue('Dr'),
    ]);

    const setValueSpecification = (newVal: V1_ValueSpecification): void => {
      enumValueSpec = guaranteeType(newVal, V1_CEnumValue);
    };

    const resetValue = (): void => {
      V1_PrimitiveValue_setValue(enumValueSpec as V1_CEnumValue, '');
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: enumValueSpec,
      setValueSpecification: setValueSpecification,
      multiplicity: V1_Multiplicity.ONE,
      typeCheckOption: {
        expectedType: _type('test::myEnum'),
        match: false,
      },
      resetValue: resetValue,
      enumeration: enumeration,
    });

    const inputElement = guaranteeNonNullable(
      (await screen.findByText('Mr')).parentElement?.querySelector('input'),
    );
    expect(inputElement).not.toBeNull();

    // TODO: figure out how to test clicking on an enum option from
    // the dropdown

    // Test that typing in a value and blurring input updates value
    fireEvent.change(inputElement, { target: { value: 'Mrs' } });
    fireEvent.keyDown(inputElement, { key: 'Enter' });

    await screen.findByText('Mrs');

    expect(enumValueSpec instanceof V1_CEnumValue).toBeTruthy();
    expect(enumValueSpec.value).toBe('Mrs');
    expect(enumValueSpec.fullPath).toBe('test::myEnum');

    // Test that resetting value shows error styling
    fireEvent.click(screen.getByTitle('Reset'));
    await screen.findByDisplayValue('');
    expect(enumValueSpec.value).toBe('');
    expect(
      inputElement.parentElement?.parentElement?.parentElement?.parentElement
        ?.classList,
    ).toContain('selector-input--has-error');
  },
);

test(
  integrationTest(
    "V1_BasicValueSpecificationEditor doesn't allow empty collection if multiplicity lower bound is >= 1",
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringCollectionValue = V1_observe_ValueSpecification(_collection([]));

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      stringCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ONE_MANY,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
        match: false,
      },
      resetValue: (): void => {},
    });

    const listEditorElement = await screen.findByText('List(empty)');

    // Verify error styling
    expect(listEditorElement.classList).toContain(
      'value-spec-editor__list-editor__preview--error',
    );
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor allows empty collection if multiplicity lower bound is 0',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringCollectionValue = V1_observe_ValueSpecification(_collection([]));

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      stringCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ZERO_MANY,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
        match: false,
      },
      resetValue: (): void => {},
    });

    const listEditorElement = await screen.findByText('List(empty)');

    // Verify no error styling
    expect(listEditorElement.classList).not.toContain(
      'value-spec-editor__list-editor__preview--error',
    );
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates string collection values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let stringCollectionValue = V1_observe_ValueSpecification(
      _collection([
        _primitiveValue(PRIMITIVE_TYPE.STRING, 'value1'),
        _primitiveValue(PRIMITIVE_TYPE.STRING, 'value2'),
      ]),
    );

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      stringCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: stringCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ZERO_MANY,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.STRING),
        match: false,
      },
      resetValue: (): void => {},
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

    expect(stringCollectionValue instanceof V1_Collection).toBe(true);
    if (stringCollectionValue instanceof V1_Collection) {
      expect(stringCollectionValue.values.length).toBe(3);
      expect(
        stringCollectionValue.values.every((v) => v instanceof V1_CString),
      ).toBeTruthy();
      const values = stringCollectionValue.values.map(
        (v) => (v as V1_CString).value,
      );
      expect(values[0]).toBe('value1');
      expect(values[1]).toBe('value2');
      expect(values[2]).toBe('value3');
    }
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates integer collection values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let integerCollectionValue = V1_observe_ValueSpecification(
      _collection([
        _primitiveValue(PRIMITIVE_TYPE.INTEGER, 1),
        _primitiveValue(PRIMITIVE_TYPE.INTEGER, 2),
      ]),
    );

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      integerCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: integerCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ZERO_MANY,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.INTEGER),
        match: false,
      },
      resetValue: (): void => {},
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

    expect(integerCollectionValue instanceof V1_Collection).toBe(true);
    if (integerCollectionValue instanceof V1_Collection) {
      expect(integerCollectionValue.values.length).toBe(3);
      expect(
        integerCollectionValue.values.every((v) => v instanceof V1_CInteger),
      ).toBeTruthy();
      const values = integerCollectionValue.values.map(
        (v) => (v as V1_CInteger).value,
      );
      expect(values[0]).toBe(1);
      expect(values[1]).toBe(2);
      expect(values[2]).toBe(3);
    }
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates float collection values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let floatCollectionValue = V1_observe_ValueSpecification(
      _collection([
        _primitiveValue(PRIMITIVE_TYPE.FLOAT, 1.1),
        _primitiveValue(PRIMITIVE_TYPE.FLOAT, 2.2),
      ]),
    );

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      floatCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: floatCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ZERO_MANY,
      typeCheckOption: {
        expectedType: _type(PRIMITIVE_TYPE.FLOAT),
        match: false,
      },
      resetValue: (): void => {},
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

    expect(floatCollectionValue instanceof V1_Collection).toBe(true);
    if (floatCollectionValue instanceof V1_Collection) {
      expect(floatCollectionValue.values.length).toBe(3);
      expect(
        floatCollectionValue.values.every((v) => v instanceof V1_CFloat),
      ).toBeTruthy();
      const values = floatCollectionValue.values.map(
        (v) => (v as V1_CFloat).value,
      );
      expect(values[0]).toBe(1.1);
      expect(values[1]).toBe(2.2);
      expect(values[2]).toBe(3);
    }
  },
);

test(
  integrationTest(
    'V1_BasicValueSpecificationEditor renders and updates enum collection values correctly',
  ),
  async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();

    let enumCollectionValue = V1_observe_ValueSpecification(
      _collection([_property('Mr', [_elementPtr('test::myEnum')])]),
    );
    const enumeration = _packageableEnumeration('test', 'myEnum', [
      _packageableEnumValue('Mr'),
      _packageableEnumValue('Mrs'),
      _packageableEnumValue('Ms'),
      _packageableEnumValue('Dr'),
    ]);

    const setValueSpecification = (val: V1_ValueSpecification): void => {
      enumCollectionValue = val;
    };

    TEST__setUpV1BasicValueSpecificationEditor(pluginManager, {
      valueSpecification: enumCollectionValue,
      setValueSpecification,
      multiplicity: V1_Multiplicity.ZERO_MANY,
      typeCheckOption: {
        expectedType: _type('test::myEnum'),
        match: false,
      },
      resetValue: (): void => {},
      enumeration: enumeration,
    });

    const listEditorElement = await screen.findByText('List(1): Mr');

    fireEvent.click(listEditorElement);

    const input = await screen.findByRole('combobox');

    // TODO: figure out how to test clicking on an enum option from
    // the dropdown

    // Test that typing in a value exactly adds it
    fireEvent.change(input, { target: { value: 'Mrs' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Test that typing in a value that doesn't exist doesn't add it
    fireEvent.change(input, { target: { value: 'Professor' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByDisplayValue('Professor')).not.toBeNull();

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await screen.findByText('List(2): Mr,Mrs');

    expect(enumCollectionValue).not.toBeUndefined();
    expect(enumCollectionValue instanceof V1_Collection).toBe(true);
    if (enumCollectionValue instanceof V1_Collection) {
      expect(enumCollectionValue.values.length).toBe(2);
      expect(
        enumCollectionValue.values.every(
          (v) => v instanceof V1_AppliedProperty,
        ),
      ).toBeTruthy();
      const enumNames = enumCollectionValue.values
        .filter((v) => v instanceof V1_AppliedProperty)
        .map((v) => v.property);
      expect(enumNames[0]).toBe('Mr');
      expect(enumNames[1]).toContain('Mrs');
    }
  },
);
