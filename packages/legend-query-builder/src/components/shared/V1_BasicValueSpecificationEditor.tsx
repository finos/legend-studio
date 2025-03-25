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

import { useApplicationStore } from '@finos/legend-application';
import {
  type SelectComponent,
  type TooltipPlacement,
  clsx,
  CustomSelectorInput,
  PencilIcon,
  RefreshIcon,
  Tooltip,
} from '@finos/legend-art';
import {
  type Enum,
  type Type,
  type V1_ValueSpecification,
  type V1_Variable,
  Enumeration,
  getMultiplicityDescription,
  PRIMITIVE_TYPE,
  PrimitiveType,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CDate,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CLatestDate,
  V1_Collection,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_Enumeration,
  V1_EnumValue,
  V1_Multiplicity,
  V1_PackageableElementPtr,
  V1_PackageableType,
  V1_PrimitiveValueSpecification,
} from '@finos/legend-graph';
import {
  type DebouncedFunc,
  type GeneratorFn,
  csvStringify,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import React, { forwardRef, useState } from 'react';
import {
  BooleanPrimitiveInstanceValueEditor,
  DateInstanceValueEditor,
  EnumInstanceValueEditor,
  NumberPrimitiveInstanceValueEditor,
  StringPrimitiveInstanceValueEditor,
} from './BasicValueSpecificationEditor.js';
import {
  V1_AppliedPropert_setProperty,
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
import { _primitiveValue } from '@finos/legend-data-cube';

// Constants and helper functions
export const V1_QUERY_BUILDER_VARIABLE_DND_TYPE = 'V1_VARIABLE';

export interface V1_QueryBuilderVariableDragSource {
  variable: V1_Variable;
}

interface V1_BasicValueSpecificationEditorSelectorConfig {
  values: string[] | undefined;
  isLoading: boolean;
  reloadValues:
    | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
    | undefined;
  cleanUpReloadValues?: () => void;
}

export interface V1_TypeCheckOption {
  expectedType: string;
  match?: boolean;
}

// Tooltip component for variable information
export const V1_VariableInfoTooltip: React.FC<{
  variable: V1_Variable;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { variable, children, placement } = props;
  const type = variable.genericType?.rawType;
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'value-spec-paramater__tooltip',
        arrow: 'value-spec-paramater__tooltip__arrow',
        tooltipPlacementRight: 'value-spec-paramater__tooltip--right',
      }}
      TransitionProps={{
        timeout: 0,
      }}
      title={
        <div className="value-spec-paramater__tooltip__content">
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Type
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {(type as unknown as string) ?? '(unknown)'}
            </div>
          </div>
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Var Name
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {variable.name}
            </div>
          </div>
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Multiplicity
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {getMultiplicityDescription(variable.multiplicity)}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

// Placeholder for unsupported value specifications
const V1_UnsupportedValueSpecificationEditor: React.FC<{ type: string }> = (
  props,
) => (
  <div className="value-spec-editor--unsupported">
    unsupported V1 type: {props.type}
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
        }
        return undefined;
      })
      .filter(isNonNullable),
  ]).trim();
};

const V1_getPlaceHolder = (expectedType: Type): string => {
  if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case 'Date':
      case 'StrictDate':
        return 'yyyy-mm-dd';
      case 'DateTime':
        return 'yyyy-mm-ddThh:mm:ss';
      default:
        return 'Add';
    }
  }
  return 'Add';
};

// Enum value editor
const V1_EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: V1_EnumValue;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: V1_EnumValue) => void;
    // observerContext: ObserverContext;
    handleBlur?: (() => void) | undefined;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      // observerContext,
      handleBlur,
    } = props;

    const applicationStore = useApplicationStore();
    const enumType = guaranteeType(valueSpecification.value, Enumeration);
    const enumValue = valueSpecification.value;
    const options = enumType.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const resetButtonName = `reset-${valueSpecification.value}`;
    const inputName = `input-${valueSpecification.value}`;

    const changeValue = (val: { value: Enum; label: string }): void => {
      // Using a similar pattern to the original implementation
      // Note: V1 protocol doesn't have EnumValueExplicitReference, so we use direct assignment
      // but follow the same pattern of updating and then calling setValueSpecification
      valueSpecification.value = val.value.name;
      setValueSpecification(valueSpecification);
      handleBlur?.();
    };

    const onBlur = (
      event: React.FocusEvent<HTMLInputElement, HTMLButtonElement>,
    ): void => {
      if (
        event.relatedTarget?.name !== resetButtonName &&
        event.relatedTarget?.name !== inputName
      ) {
        handleBlur?.();
      }
    };

    return (
      <div className={clsx('value-spec-editor', className)} onBlur={onBlur}>
        <CustomSelectorInput
          className="value-spec-editor__enum-selector"
          options={options}
          onChange={changeValue}
          value={
            enumValue
              ? { value: enumValue as unknown as Enum, label: enumValue }
              : null
          }
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          hasError={false}
          placeholder="Select value"
          autoFocus={true}
          inputName={inputName}
        />
        <button
          className="value-spec-editor__reset-btn"
          name={resetButtonName}
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

// Collection value editor
const V1_CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: V1_Collection;
    expectedType: Type;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    selectorConfig?: V1_BasicValueSpecificationEditorSelectorConfig | undefined;
    // observerContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      expectedType,
      className,
      setValueSpecification,
      selectorConfig,
      // observerContext,
    } = props;

    const [editable, setEditable] = useState(false);
    const valueText = V1_stringifyValue(valueSpecification.values ?? []);
    const COLLECTION_PREVIEW_CHAR_LIMIT = 50;
    const previewText = `List(${
      !valueSpecification.values || valueSpecification.values.length === 0
        ? 'empty'
        : valueSpecification.values.length
    })${
      !valueSpecification.values || valueSpecification.values.length === 0
        ? ''
        : `: ${
            valueText.length > COLLECTION_PREVIEW_CHAR_LIMIT
              ? `${valueText.substring(0, COLLECTION_PREVIEW_CHAR_LIMIT)}...`
              : valueText
          }`
    }`;
    const enableEdit = (): void => setEditable(true);
    const saveEdit = (): void => {
      if (editable) {
        setEditable(false);
        setValueSpecification(valueSpecification);
      }
    };

    if (editable) {
      return (
        <>
          <div className={clsx('value-spec-editor', className)}>
            {expectedType instanceof Enumeration ? (
              <div className="value-spec-editor--unsupported">
                V1 enum collection editor not yet implemented
              </div>
            ) : (
              <div className="value-spec-editor--unsupported">
                V1 primitive collection editor not yet implemented
              </div>
            )}
          </div>
        </>
      );
    }
    return (
      <div
        className={clsx('value-spec-editor', className)}
        onClick={enableEdit}
        title="Click to edit"
      >
        <div
          className={clsx('value-spec-editor__list-editor__preview', {
            'value-spec-editor__list-editor__preview--error': false,
          })}
        >
          {previewText}
        </div>
        <button className="value-spec-editor__list-editor__edit-icon">
          <PencilIcon />
        </button>
      </div>
    );
  },
);

// Main component
export const V1_BasicValueSpecificationEditor = forwardRef<
  HTMLInputElement | null,
  {
    valueSpecification: V1_ValueSpecification;
    type: V1_PackageableType;
    multiplicity: V1_Multiplicity;
    typeCheckOption: V1_TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    resetValue: () => void;
    isConstant?: boolean | undefined;
    selectorConfig?: V1_BasicValueSpecificationEditorSelectorConfig | undefined;
    handleBlur?: (() => void) | undefined;
    handleKeyDown?:
      | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
      | undefined;
    displayDateEditorAsEditableValue?: boolean | undefined;
    enumeration?: V1_Enumeration | undefined;
  }
>(function _V1_BasicValueSpecificationEditor(props, ref) {
  const {
    className,
    valueSpecification,
    type,
    multiplicity,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    handleBlur,
    handleKeyDown,
    enumeration,
  } = props;

  // Handle non-collection editors
  if (multiplicity.upperBound !== undefined) {
    switch (type.fullPath) {
      case PRIMITIVE_TYPE.STRING:
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
              ref as React.ForwardedRef<
                HTMLInputElement | SelectComponent | null
              >
            }
            handleBlur={handleBlur}
            handleKeyDown={handleKeyDown}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
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
      case PRIMITIVE_TYPE.BINARY:
      case PRIMITIVE_TYPE.BYTE:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.NUMBER:
        const numericValueSpecification =
          type.fullPath === PRIMITIVE_TYPE.INTEGER
            ? guaranteeType(valueSpecification, V1_CInteger)
            : type.fullPath === PRIMITIVE_TYPE.DECIMAL
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
              value: number,
            ) => {
              V1_PrimitiveValue_setValue(_valueSpecification, value);
              setValueSpecification(_valueSpecification);
            }}
            className={className}
            resetValue={resetValue}
            ref={ref}
            handleBlur={handleBlur}
            handleKeyDown={handleKeyDown}
          />
        );
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.STRICTTIME:
      case PRIMITIVE_TYPE.LATESTDATE:
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
          <DateInstanceValueEditor<
            V1_CDate | V1_CStrictTime | V1_AppliedFunction | V1_CString
          >
            valueSpecification={
              valueSpecification as
                | V1_CDate
                | V1_CStrictTime
                | V1_AppliedFunction
                | V1_CString
            }
            valueSelector={(_valueSpecification) =>
              _valueSpecification instanceof V1_CDateTime ||
              _valueSpecification instanceof V1_CStrictDate
                ? _valueSpecification.value
                : ''
            }
            updateValueSpecification={dateUpdateValueSpecification}
            typeCheckOption={typeCheckOption}
            resetValue={resetValue}
            className={className}
          />
        );
    }
    // Enum editors should have enumeration passed in the props
    if (enumeration) {
      const options =
        enumeration?.values.map((enumValue) => ({
          label: enumValue.value,
          value: enumValue.value,
        })) ?? [];
      return (
        <EnumInstanceValueEditor<V1_AppliedProperty>
          valueSpecification={guaranteeType(
            valueSpecification,
            V1_AppliedProperty,
          )}
          valueSelector={(val) => val.property}
          options={options}
          className={className}
          resetValue={resetValue}
          updateValueSpecification={(
            _valueSpecification: V1_AppliedProperty,
            value: string | null,
          ) => {
            V1_AppliedPropert_setProperty(
              _valueSpecification,
              guaranteeNonNullable(value),
            );
            setValueSpecification(_valueSpecification);
          }}
          handleBlur={handleBlur}
        />
      );
    }
  } else if (valueSpecification instanceof V1_Collection) {
    // return (
    //   <V1_CollectionValueInstanceValueEditor
    //     valueSpecification={valueSpecification}
    //     expectedType={typeCheckOption.expectedType}
    //     className={className}
    //     setValueSpecification={setValueSpecification}
    //     selectorConfig={selectorConfig}
    //     observerContext={observerContext}
    //   />
    // );
  }

  // Default case for unsupported value specifications
  return <V1_UnsupportedValueSpecificationEditor type={type.fullPath} />;
});
