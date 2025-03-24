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
  PrimitiveType,
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
  V1_Enumeration,
  V1_EnumValue,
  V1_PackageableElementPtr,
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
import type { CustomDatePickerUpdateValueSpecification } from './CustomDatePicker.js';

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
const V1_UnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="value-spec-editor--unsupported">unsupported V1 type</div>
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

// Date value editor
const V1_DateInstanceValueEditor = observer(
  (props: {
    valueSpecification: V1_CDateTime | V1_CStrictDate | V1_CLatestDate;
    // observerContext: ObserverContext;
    typeCheckOption: V1_TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    resetValue: () => void;
    handleBlur?: (() => void) | undefined;
    displayAsEditableValue?: boolean | undefined;
  }) => {
    const {
      valueSpecification,
      setValueSpecification,
      // observerContext,
      typeCheckOption,
      resetValue,
      handleBlur,
      displayAsEditableValue,
    } = props;

    return (
      <div className="value-spec-editor">
        <div className="value-spec-editor--unsupported">
          V1 date editor not yet implemented
        </div>
        {!displayAsEditableValue && (
          <button
            className="value-spec-editor__reset-btn"
            name="Reset"
            title="Reset"
            onClick={resetValue}
          >
            <RefreshIcon />
          </button>
        )}
      </div>
    );
  },
);

// Main component
export const V1_BasicValueSpecificationEditor = forwardRef<
  HTMLInputElement | null,
  {
    valueSpecification: V1_ValueSpecification;
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
    typeCheckOption,
    setValueSpecification,
    resetValue,
    handleBlur,
    handleKeyDown,
    displayDateEditorAsEditableValue,
    enumeration,
  } = props;

  // Handle different types of value specifications
  if (valueSpecification instanceof V1_CString) {
    return (
      <StringPrimitiveInstanceValueEditor<V1_CString>
        valueSpecification={valueSpecification}
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
      />
    );
  } else if (valueSpecification instanceof V1_CBoolean) {
    return (
      <BooleanPrimitiveInstanceValueEditor<V1_CBoolean>
        valueSpecification={valueSpecification}
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
    valueSpecification instanceof V1_CInteger ||
    valueSpecification instanceof V1_CDecimal ||
    valueSpecification instanceof V1_CFloat
  ) {
    return (
      <NumberPrimitiveInstanceValueEditor<V1_CInteger | V1_CDecimal | V1_CFloat>
        valueSpecification={valueSpecification}
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
  } else if (
    valueSpecification instanceof V1_CDateTime ||
    valueSpecification instanceof V1_CStrictDate ||
    valueSpecification instanceof V1_CLatestDate
  ) {
    const dateUpdateValueSpecification: CustomDatePickerUpdateValueSpecification<
      V1_CDateTime | V1_CStrictDate | V1_CLatestDate | undefined
    > = (_valueSpecification, value, options): void => {
      if (value instanceof CustomDateOption) {
        setValueSpecification(
          buildPureAdjustDateFunction(value, graph, observerContext),
        );
      } else if (value instanceof CustomFirstDayOfOption) {
        setValueSpecification(
          buildPureDateFunctionExpression(value, graph, observerContext),
        );
      } else if (value instanceof CustomPreviousDayOfWeekOption) {
        setValueSpecification(
          buildPureDateFunctionExpression(value, graph, observerContext),
        );
      } else if (value instanceof DatePickerOption) {
        setValueSpecification(
          buildPureDateFunctionExpression(value, graph, observerContext),
        );
      } else {
        if (_valueSpecification instanceof SimpleFunctionExpression) {
          setValueSpecification(
            buildPrimitiveInstanceValue(
              graph,
              guaranteeNonNullable(options?.primitiveTypeEnum),
              value,
              observerContext,
            ),
          );
        } else if (_valueSpecification instanceof InstanceValue) {
          instanceValue_setValue(
            _valueSpecification,
            value,
            0,
            observerContext,
          );
          if (
            _valueSpecification.genericType.value.rawType.path !==
            guaranteeNonNullable(options?.primitiveTypeEnum)
          ) {
            valueSpecification_setGenericType(
              _valueSpecification,
              GenericTypeExplicitReference.create(
                new GenericType(
                  getPrimitiveTypeInstanceFromEnum(
                    guaranteeNonNullable(options?.primitiveTypeEnum),
                  ),
                ),
              ),
            );
          }
          setValueSpecification(_valueSpecification);
        } else if (options?.primitiveTypeEnum === PRIMITIVE_TYPE.LATESTDATE) {
          setValueSpecification(
            buildPrimitiveInstanceValue(
              graph,
              PRIMITIVE_TYPE.LATESTDATE,
              value,
              observerContext,
            ),
          );
        }
      }
    };
    return (
      <DateInstanceValueEditor<V1_CDateTime | V1_CStrictDate | V1_CLatestDate>
        valueSpecification={valueSpecification}
        valueSelector={(_valueSpecification) =>
          _valueSpecification instanceof V1_CDateTime ||
          _valueSpecification instanceof V1_CStrictDate
            ? _valueSpecification.value
            : ''
        }
        // typeCheckOption={typeCheckOption}
        className={className}
        updateValueSpecification={}
      />
    );
  } else if (
    valueSpecification instanceof V1_AppliedProperty &&
    valueSpecification.parameters?.[0] instanceof V1_PackageableElementPtr
  ) {
    const options =
      enumeration?.values.map((enumValue) => ({
        label: enumValue.value,
        value: enumValue.value,
      })) ?? [];
    return (
      <EnumInstanceValueEditor<V1_AppliedProperty>
        valueSpecification={valueSpecification}
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
  return <V1_UnsupportedValueSpecificationEditor />;
});
