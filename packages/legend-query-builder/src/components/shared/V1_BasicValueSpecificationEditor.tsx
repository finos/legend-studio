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

import { type SelectComponent } from '@finos/legend-art';
import {
  type Type,
  type V1_AppliedFunction,
  type V1_CDate,
  type V1_Enumeration,
  type V1_Multiplicity,
  type V1_ValueSpecification,
  PRIMITIVE_TYPE,
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CLatestDate,
  V1_Collection,
  V1_CStrictDate,
  V1_CString,
  V1_EnumValue,
  V1_observe_AppliedProperty,
  V1_observe_ValueSpecification,
  V1_PackageableType,
  V1_PrimitiveValueSpecification,
} from '@finos/legend-graph';
import {
  csvStringify,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import React, { forwardRef } from 'react';
import {
  type BasicValueSpecificationEditorSelectorConfig,
  BooleanPrimitiveInstanceValueEditor,
  CollectionValueInstanceValueEditor,
  DateInstanceValueEditor,
  EnumInstanceValueEditor,
  NumberPrimitiveInstanceValueEditor,
  StringPrimitiveInstanceValueEditor,
} from './BasicValueSpecificationEditor.js';
import {
  V1_AppliedProperty_setProperty,
  V1_Collection_setValues,
  V1_PrimitiveValue_setValue,
} from '../../stores/shared/V1_ValueSpecificationModifierHelper.js';
import {
  type CustomDatePickerUpdateValueSpecification,
  buildV1PureAdjustDateFunction,
  buildV1PureDateFunctionExpression,
  CustomDateOption,
  CustomFirstDayOfOption,
  CustomPreviousDayOfWeekOption,
  DatePickerOption,
} from './CustomDatePickerHelper.js';
import {
  _elementPtr,
  _primitiveValue,
  _property,
  isPrimitiveType,
} from '@finos/legend-data-cube';
import {
  getV1_ValueSpecificationStringValue,
  isValidV1_ValueSpecification,
} from '../../stores/shared/V1_ValueSpecificationEditorHelper.js';
import { useApplicationStore } from '@finos/legend-application';

export interface V1_TypeCheckOption {
  expectedType: V1_PackageableType;
  match?: boolean;
}

// Placeholder for unsupported value specifications
const V1_UnsupportedValueSpecificationEditor: React.FC<{ type: string }> = (
  props,
) => (
  <div className="value-spec-editor--unsupported">
    Unsupported V1 type: {props.type}
  </div>
);

// Helper functions for collection values
const V1_stringifyValue = (values: V1_ValueSpecification[]): string => {
  if (values.length === 0) {
    return '';
  }
  return csvStringify([
    values
      .map((val) => {
        if (val instanceof V1_PrimitiveValueSpecification) {
          if (!(val instanceof V1_CLatestDate)) {
            return (val as unknown as { value: unknown }).value;
          } else {
            return val;
          }
        } else if (val instanceof V1_EnumValue) {
          return val.value;
        } else if (val instanceof V1_AppliedProperty) {
          return val.property;
        }
        return undefined;
      })
      .filter(isNonNullable),
  ]).trim();
};

// Main component
export const V1_BasicValueSpecificationEditor = forwardRef<
  HTMLInputElement | null,
  {
    valueSpecification: V1_ValueSpecification;
    multiplicity: V1_Multiplicity;
    typeCheckOption: V1_TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    resetValue: () => void;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    handleBlur?: (() => void) | undefined;
    handleKeyDown?:
      | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
      | undefined;
    displayDateEditorAsEditableValue?: boolean | undefined;
    enumeration?: V1_Enumeration | undefined;
  }
>(function V1_BasicValueSpecificationEditor(props, ref) {
  const {
    className,
    valueSpecification,
    multiplicity,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    handleBlur,
    handleKeyDown,
    enumeration,
    selectorConfig,
  } = props;

  const applicationStore = useApplicationStore();
  const errorChecker = (_valueSpecification: V1_PrimitiveValueSpecification) =>
    !isValidV1_ValueSpecification(_valueSpecification);

  // Handle non-collection editors
  if (multiplicity.upperBound !== undefined) {
    if (typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.STRING) {
      return (
        <StringPrimitiveInstanceValueEditor<V1_CString>
          valueSpecification={guaranteeType(valueSpecification, V1_CString)}
          valueSelector={(val: V1_CString) => val.value}
          updateValueSpecification={(
            _valueSpecification: V1_CString,
            value: string | null,
          ) => {
            V1_PrimitiveValue_setValue(_valueSpecification, value ?? '');
            setValueSpecification(_valueSpecification);
          }}
          className={className}
          resetValue={resetValue}
          ref={
            ref as React.ForwardedRef<HTMLInputElement | SelectComponent | null>
          }
          handleBlur={handleBlur}
          handleKeyDown={handleKeyDown}
          errorChecker={errorChecker}
          selectorConfig={selectorConfig}
        />
      );
    } else if (
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.BOOLEAN
    ) {
      return (
        <BooleanPrimitiveInstanceValueEditor<V1_CBoolean>
          valueSpecification={guaranteeType(valueSpecification, V1_CBoolean)}
          valueSelector={(val: V1_CBoolean) => val.value}
          updateValueSpecification={(
            _valueSpecification: V1_CBoolean,
            value: boolean,
          ) => {
            V1_PrimitiveValue_setValue(_valueSpecification, value);
            setValueSpecification(_valueSpecification);
          }}
          className={className}
          resetValue={resetValue}
        />
      );
    } else if (
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.BINARY ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.BYTE ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.DECIMAL ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.FLOAT ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.INTEGER ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.NUMBER
    ) {
      const numericValueSpecification =
        typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.INTEGER
          ? guaranteeType(valueSpecification, V1_CInteger)
          : typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.DECIMAL
            ? guaranteeType(valueSpecification, V1_CDecimal)
            : guaranteeType(valueSpecification, V1_CFloat);
      return (
        <NumberPrimitiveInstanceValueEditor<
          V1_CInteger | V1_CDecimal | V1_CFloat
        >
          valueSpecification={numericValueSpecification}
          valueSelector={(val: V1_CInteger | V1_CDecimal | V1_CFloat) =>
            val.value
          }
          isInteger={valueSpecification instanceof V1_CInteger}
          updateValueSpecification={(
            _valueSpecification: V1_CInteger | V1_CDecimal | V1_CFloat,
            value: number | null,
          ) => {
            V1_PrimitiveValue_setValue(_valueSpecification, value);
            setValueSpecification(_valueSpecification);
          }}
          className={className}
          resetValue={resetValue}
          ref={ref}
          handleBlur={handleBlur}
          handleKeyDown={handleKeyDown}
          errorChecker={errorChecker}
        />
      );
    } else if (
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.DATE ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.STRICTDATE ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.DATETIME ||
      typeCheckOption.expectedType.fullPath === PRIMITIVE_TYPE.LATESTDATE
    ) {
      const dateValueSelector = (
        _valueSpecification: V1_CDate | V1_AppliedFunction | V1_CString,
      ) =>
        _valueSpecification instanceof V1_CDateTime ||
        _valueSpecification instanceof V1_CStrictDate ||
        _valueSpecification instanceof V1_CString
          ? _valueSpecification.value
          : '';
      const dateUpdateValueSpecification: CustomDatePickerUpdateValueSpecification<
        V1_CDateTime | V1_CStrictDate | V1_CLatestDate | undefined
      > = (_valueSpecification, value, options): void => {
        if (value instanceof CustomDateOption) {
          setValueSpecification(buildV1PureAdjustDateFunction(value));
        } else if (value instanceof CustomFirstDayOfOption) {
          setValueSpecification(buildV1PureDateFunctionExpression(value));
        } else if (value instanceof CustomPreviousDayOfWeekOption) {
          setValueSpecification(buildV1PureDateFunctionExpression(value));
        } else if (value instanceof DatePickerOption) {
          setValueSpecification(buildV1PureDateFunctionExpression(value));
        } else {
          const _type = guaranteeNonNullable(options?.primitiveTypeEnum);
          setValueSpecification(_primitiveValue(_type, value));
        }
      };
      return (
        <DateInstanceValueEditor<V1_CDate | V1_AppliedFunction | V1_CString>
          valueSpecification={
            valueSpecification as V1_CDate | V1_AppliedFunction | V1_CString
          }
          valueSelector={dateValueSelector}
          updateValueSpecification={dateUpdateValueSpecification}
          typeCheckOption={typeCheckOption}
          resetValue={resetValue}
          className={className}
          errorChecker={errorChecker}
        />
      );
    }
    // Enum editors should have enumeration passed in the props
    if (enumeration) {
      const options = enumeration.values.map((enumValue) => ({
        label: enumValue.value,
        value: enumValue.value,
      }));
      return (
        <EnumInstanceValueEditor<V1_AppliedProperty>
          valueSpecification={guaranteeType(
            valueSpecification,
            V1_AppliedProperty,
          )}
          valueSelector={(val: V1_AppliedProperty) => val.property}
          options={options}
          className={className}
          resetValue={resetValue}
          updateValueSpecification={(
            _valueSpecification: V1_AppliedProperty,
            value: string | null,
          ) => {
            V1_AppliedProperty_setProperty(
              _valueSpecification,
              guaranteeNonNullable(value),
            );
            setValueSpecification(_valueSpecification);
          }}
          handleBlur={handleBlur}
          errorChecker={errorChecker}
          selectorConfig={selectorConfig}
        />
      );
    }
  } else {
    // Handle collection editors
    const collectionValueSpecification = guaranteeType(
      valueSpecification,
      V1_Collection,
    );
    const updateValueSpecification = (
      _collectionValueSpecification: V1_Collection,
      valueSpecifications: V1_ValueSpecification[],
    ) => {
      V1_Collection_setValues(
        _collectionValueSpecification,
        valueSpecifications,
      );
      setValueSpecification(_collectionValueSpecification);
    };
    const stringifyCollectionValueSpecification = (
      _collectionValueSpecification: V1_Collection,
    ): string => {
      return V1_stringifyValue(_collectionValueSpecification.values);
    };
    const convertValueSpecificationToText = (
      _valueSpecification: V1_ValueSpecification,
    ): string | undefined => {
      return getV1_ValueSpecificationStringValue(
        _valueSpecification,
        applicationStore,
      );
    };
    const convertTextToValueSpecification = (
      _type: Type | V1_PackageableType,
      text: string,
    ): V1_ValueSpecification | null => {
      const packageableType = guaranteeType(
        _type,
        V1_PackageableType,
        'Cannot convert text to V1_ValueSpecification. Expected type to be a V1_PackageableType',
      );
      if (isPrimitiveType(packageableType.fullPath)) {
        const primitiveVal = _primitiveValue(
          packageableType.fullPath,
          text,
          true,
        );
        return V1_observe_ValueSpecification(primitiveVal);
      } else {
        // If not a primitive, assume it is an enum
        const typeParam = _elementPtr(packageableType.fullPath);
        return V1_observe_AppliedProperty(_property(text, [typeParam]));
      }
    };
    const enumOptions = enumeration?.values.map((enumValue) => ({
      label: enumValue.value,
      value: enumValue.value,
    }));

    return (
      <CollectionValueInstanceValueEditor<V1_ValueSpecification, V1_Collection>
        valueSpecification={collectionValueSpecification}
        updateValueSpecification={updateValueSpecification}
        expectedType={typeCheckOption.expectedType}
        stringifyCollectionValueSpecification={
          stringifyCollectionValueSpecification
        }
        convertValueSpecificationToText={convertValueSpecificationToText}
        convertTextToValueSpecification={convertTextToValueSpecification}
        enumOptions={enumOptions}
        errorChecker={errorChecker}
        className={className}
        selectorConfig={selectorConfig}
      />
    );
  }

  // Default case for unsupported value specifications
  return (
    <V1_UnsupportedValueSpecificationEditor
      type={typeCheckOption.expectedType.fullPath}
    />
  );
});
