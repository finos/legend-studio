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

import {
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type TooltipPlacement,
  type InputActionData,
  type SelectActionData,
  type SelectComponent,
  Tooltip,
  DollarIcon,
  clsx,
  InfoCircleIcon,
  RefreshIcon,
  CheckSquareIcon,
  SquareIcon,
  CustomSelectorInput,
  SaveIcon,
  PencilIcon,
  DragPreviewLayer,
  CalculateIcon,
  InputWithInlineValidation,
  CopyIcon,
} from '@finos/legend-art';
import {
  type Enum,
  type ObserverContext,
  type PureModel,
  type ValueSpecification,
  CollectionInstanceValue,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  getMultiplicityDescription,
  getPrimitiveTypeInstanceFromEnum,
  InstanceValue,
  INTERNAL__PropagatedValue,
  isSubType,
  matchFunctionName,
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  PrimitiveType,
  SimpleFunctionExpression,
  Type,
  VariableExpression,
  observe_ValueSpecification,
  V1_PackageableType,
} from '@finos/legend-graph';
import {
  type DebouncedFunc,
  type GeneratorFn,
  guaranteeNonNullable,
  isNonNullable,
  guaranteeIsNumber,
  csvStringify,
  guaranteeType,
  isNonEmptyString,
  parseCSVString,
  uniq,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  instanceValue_setValue,
  instanceValue_setValues,
  valueSpecification_setGenericType,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import {
  isValidInstanceValue,
  simplifyValueExpression,
} from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { evaluate } from 'mathjs';
import { isUsedDateFunctionSupportedInFormMode } from '../../stores/QueryBuilderStateBuilder.js';
import {
  buildPrimitiveInstanceValue,
  convertTextToEnum,
  convertTextToPrimitiveInstanceValue,
  getValueSpecificationStringValue,
} from '../../stores/shared/ValueSpecificationEditorHelper.js';
import { CustomDatePicker } from './CustomDatePicker.js';
import {
  type CustomDatePickerValueSpecification,
  type CustomDatePickerUpdateValueSpecification,
  CustomDateOption,
  buildPureAdjustDateFunction,
  CustomFirstDayOfOption,
  buildPureDateFunctionExpression,
  CustomPreviousDayOfWeekOption,
  DatePickerOption,
} from './CustomDatePickerHelper.js';
import type { V1_TypeCheckOption } from './V1_BasicValueSpecificationEditor.js';

export type TypeCheckOption = {
  expectedType: Type;
  /**
   * Indicates if a strict type-matching will happen.
   * Sometimes, auto-boxing allow some rooms to wiggle,
   * for example we can assign a Float to an Integer, a
   * Date to a DateTime. With this flag set to `true`
   * we will not allow this.
   *
   * For example, if `match=true`, it means that options in the
   * date-capability-dropdown which are not returning type DateTime
   * will be filtered out.
   */
  match?: boolean;
};

export const VariableInfoTooltip: React.FC<{
  variable: VariableExpression;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { variable, children, placement } = props;
  const type = variable.genericType?.value.rawType;
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
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="value-spec-paramater__tooltip__content">
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Type
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {type?.name ?? '(unknown)'}
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

export const QUERY_BUILDER_VARIABLE_DND_TYPE = 'VARIABLE';

export interface QueryBuilderVariableDragSource {
  variable: VariableExpression;
}

const VariableExpressionParameterEditor = observer(
  (props: {
    valueSpecification: VariableExpression;
    resetValue: () => void;
    className?: string | undefined;
    isConstant?: boolean;
  }) => {
    const { valueSpecification, resetValue, isConstant, className } = props;
    const varName = valueSpecification.name;
    return (
      <>
        <DragPreviewLayer
          labelGetter={(item: QueryBuilderVariableDragSource): string =>
            item.variable.name
          }
          types={[QUERY_BUILDER_VARIABLE_DND_TYPE]}
        />
        <div
          className={clsx('value-spec-editor__variable', className, {
            'value-spec-editor__variable__constant': isConstant,
          })}
        >
          <div className="value-spec-editor__variable__icon">
            {isConstant ? <div className="icon">C</div> : <DollarIcon />}
          </div>
          <div className="value-spec-editor__variable__label">
            <div className="value-spec-editor__variable__text">{varName}</div>
            <VariableInfoTooltip variable={valueSpecification}>
              <div className="value-spec-editor__variable__info">
                <InfoCircleIcon />
              </div>
            </VariableInfoTooltip>

            <button
              className="value-spec-editor__variable__reset-btn"
              name="Reset"
              title="Reset"
              onClick={resetValue}
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
      </>
    );
  },
);

/**
 * This is the base interface for primitive instance value editors (non-collection values).
 * The interface is made generic so that it can support various types of objects that hold the value
 * to be edited (currently, we just use this for ValueSpecification and V1_ValueSpecification).
 *
 * T represents the type of the object that holds the value to be edited (i.e. ValueSpecification or V1_ValueSpecification).
 * U represents the type of data that the object holds.
 *
 * valueSelector: callback that handles extracting the data value from the object.
 * updateValueSpecification: callback that takes the valueSpecification object and the new value and handles updating
 * the object with the new value.
 * errorChecker: optional callback that should return true if the valueSpecification is invalid.
 */
export interface PrimitiveInstanceValueEditorProps<
  T,
  U extends T[] | string | number | boolean | Enum | null,
> {
  valueSpecification: T;
  valueSelector: (val: T) => U;
  updateValueSpecification: (valueSpecification: T, value: U) => void;
  errorChecker?: (valueSpecification: T) => boolean;
  resetValue: () => void;
  handleBlur?: (() => void) | undefined;
  handleKeyDown?: React.KeyboardEventHandler<HTMLDivElement> | undefined;
  className?: string | undefined;
}

export interface BasicValueSpecificationEditorSelectorSearchConfig {
  values: string[] | undefined;
  isLoading: boolean;
  reloadValues:
    | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
    | undefined;
  cleanUpReloadValues?: () => void;
}

export interface BasicValueSpecificationEditorSelectorConfig {
  optionCustomization?: { rowHeight?: number | undefined } | undefined;
}

interface StringPrimitiveInstanceValueEditorProps<T>
  extends PrimitiveInstanceValueEditorProps<T, string | null> {
  selectorSearchConfig?:
    | BasicValueSpecificationEditorSelectorSearchConfig
    | undefined;
  selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
}

// eslint-disable-next-line comma-spacing
const StringPrimitiveInstanceValueEditorInner = <T,>(
  props: StringPrimitiveInstanceValueEditorProps<T>,
  ref: React.ForwardedRef<HTMLInputElement | SelectComponent | null>,
): React.ReactElement => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    errorChecker,
    resetValue,
    handleBlur,
    handleKeyDown,
    className,
    selectorSearchConfig,
    selectorConfig,
  } = props;
  const useSelector = Boolean(selectorSearchConfig);
  const applicationStore = useApplicationStore();
  const value = valueSelector(valueSpecification);
  const changeInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    updateValueSpecification(valueSpecification, event.target.value);
  };
  // custom select
  const selectedValue = value ? { value: value, label: value } : null;
  const reloadValuesFunc = selectorSearchConfig?.reloadValues;
  const changeValue = (
    val: null | { value: number | string; label: string },
  ): void => {
    const newValue = val === null ? '' : val.value.toString();
    updateValueSpecification(valueSpecification, newValue);
  };
  const handleInputChange = (
    inputValue: string,
    actionChange: InputActionData,
  ): void => {
    if (actionChange.action === 'input-change') {
      updateValueSpecification(valueSpecification, inputValue);
      reloadValuesFunc?.cancel();
      const reloadValuesFuncTransformation = reloadValuesFunc?.(inputValue);
      if (reloadValuesFuncTransformation) {
        flowResult(reloadValuesFuncTransformation).catch(
          applicationStore.alertUnhandledError,
        );
      }
    }
    if (actionChange.action === 'input-blur') {
      reloadValuesFunc?.cancel();
      selectorSearchConfig?.cleanUpReloadValues?.();
    }
  };
  const isLoading = selectorSearchConfig?.isLoading;
  const queryOptions = selectorSearchConfig?.values?.length
    ? selectorSearchConfig.values.map((e) => ({
        value: e,
        label: e.toString(),
      }))
    : undefined;
  const noOptionsMessage =
    selectorSearchConfig?.values === undefined ? (): null => null : undefined;
  const resetButtonName = `reset-${valueSelector(valueSpecification)}`;
  const inputName = `input-${valueSelector(valueSpecification)}`;

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
      {useSelector ? (
        <CustomSelectorInput
          className="value-spec-editor__enum-selector"
          options={queryOptions}
          onChange={changeValue}
          value={selectedValue}
          inputValue={value ?? ''}
          onInputChange={handleInputChange}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          isLoading={isLoading}
          allowCreateWhileLoading={true}
          noOptionsMessage={noOptionsMessage}
          components={{
            DropdownIndicator: null,
          }}
          hasError={errorChecker?.(valueSpecification)}
          placeholder={value === '' ? '(empty)' : undefined}
          inputRef={ref as React.Ref<SelectComponent>}
          onKeyDown={
            handleKeyDown as React.KeyboardEventHandler<HTMLDivElement>
          }
          inputName={inputName}
          optionCustomization={selectorConfig?.optionCustomization}
        />
      ) : (
        <InputWithInlineValidation
          className="panel__content__form__section__input value-spec-editor__input"
          spellCheck={false}
          value={value ?? ''}
          placeholder={value === '' ? '(empty)' : undefined}
          onChange={changeInputValue}
          ref={ref as React.Ref<HTMLInputElement>}
          error={
            errorChecker?.(valueSpecification)
              ? 'Invalid String value'
              : undefined
          }
          onKeyDown={handleKeyDown}
          name={inputName}
        />
      )}
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
};

export const StringPrimitiveInstanceValueEditor = observer(
  forwardRef(StringPrimitiveInstanceValueEditorInner) as <T>(
    props: StringPrimitiveInstanceValueEditorProps<T> & {
      ref: React.ForwardedRef<HTMLInputElement | SelectComponent | null>;
    },
  ) => ReturnType<typeof StringPrimitiveInstanceValueEditorInner>,
);

type BooleanInstanceValueEditorProps<T> = PrimitiveInstanceValueEditorProps<
  T,
  boolean
>;

// eslint-disable-next-line comma-spacing
const BooleanInstanceValueEditorInner = <T,>(
  props: BooleanInstanceValueEditorProps<T>,
): React.ReactElement => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    resetValue,
    className,
  } = props;
  const value = valueSelector(valueSpecification);
  const toggleValue = (): void => {
    updateValueSpecification(valueSpecification, !value);
  };

  return (
    <div className={clsx('value-spec-editor', className)}>
      <button
        role="checkbox"
        className={clsx('value-spec-editor__toggler__btn', {
          'value-spec-editor__toggler__btn--toggled': value,
        })}
        onClick={toggleValue}
      >
        {value ? <CheckSquareIcon /> : <SquareIcon />}
      </button>
      <button
        className="value-spec-editor__reset-btn"
        name="Reset"
        title="Reset"
        onClick={resetValue}
      >
        <RefreshIcon />
      </button>
    </div>
  );
};

export const BooleanPrimitiveInstanceValueEditor = observer(
  BooleanInstanceValueEditorInner as <T>(
    props: BooleanInstanceValueEditorProps<T>,
  ) => ReturnType<typeof BooleanInstanceValueEditorInner>,
);

interface NumberPrimitiveInstanceValueEditorProps<T>
  extends PrimitiveInstanceValueEditorProps<T, number | null> {
  isInteger: boolean;
}

// eslint-disable-next-line comma-spacing
const NumberPrimitiveInstanceValueEditorInner = <T,>(
  props: NumberPrimitiveInstanceValueEditorProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactElement => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    errorChecker,
    resetValue,
    handleBlur,
    handleKeyDown,
    className,
    isInteger,
  } = props;
  const [value, setValue] = useState(
    valueSelector(valueSpecification)?.toString() ?? '',
  );
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
  const numericValue = value
    ? isInteger
      ? Number.parseInt(Number(value).toString(), 10)
      : Number(value)
    : null;

  const updateValueSpecIfValid = (val: string): void => {
    if (val) {
      const parsedValue = isInteger
        ? Number.parseInt(Number(val).toString(), 10)
        : Number(val);
      if (
        !isNaN(parsedValue) &&
        parsedValue !== valueSelector(valueSpecification)
      ) {
        updateValueSpecification(valueSpecification, parsedValue);
      }
    } else {
      resetValue();
    }
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    setValue(event.target.value);
    updateValueSpecIfValid(event.target.value);
  };

  // Support expression evaluation
  const calculateExpression = (): void => {
    if (numericValue !== null && isNaN(numericValue)) {
      // If the value is not a number, try to evaluate it as an expression
      try {
        const calculatedValue = guaranteeIsNumber(evaluate(value));
        updateValueSpecIfValid(calculatedValue.toString());
        setValue(calculatedValue.toString());
      } catch {
        // If we fail to evaluate the expression, we just keep the previous value
        const prevValue = valueSelector(valueSpecification)?.toString() ?? '';
        updateValueSpecIfValid(prevValue);
        setValue(prevValue);
      }
    } else if (numericValue !== null) {
      // If numericValue is a number, update the value spec
      updateValueSpecIfValid(numericValue.toString());
      setValue(numericValue.toString());
    } else {
      // If numericValue is null, reset the value spec
      resetValue();
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.code === 'Enter') {
      calculateExpression();
      inputRef.current?.focus();
    } else if (event.code === 'Escape') {
      inputRef.current?.select();
    }
  };

  useEffect(() => {
    if (
      numericValue !== null &&
      !isNaN(numericValue) &&
      numericValue !== valueSelector(valueSpecification)
    ) {
      const valueFromValueSpec =
        valueSelector(valueSpecification) !== null
          ? (valueSelector(valueSpecification) as number).toString()
          : '';
      setValue(valueFromValueSpec);
    }
  }, [numericValue, valueSpecification, valueSelector]);

  const resetButtonName = `reset-${valueSelector(valueSpecification)}`;
  const inputName = `input-${valueSelector(valueSpecification)}`;
  const calculateButtonName = `calculate-${valueSelector(valueSpecification)}`;

  const onBlur = (
    event: React.FocusEvent<HTMLInputElement, HTMLButtonElement>,
  ): void => {
    if (
      event.relatedTarget?.name !== resetButtonName &&
      event.relatedTarget?.name !== inputName &&
      event.relatedTarget?.name !== calculateButtonName
    ) {
      handleBlur?.();
    }
  };

  return (
    <div className={clsx('value-spec-editor', className)} onBlur={onBlur}>
      <div className="value-spec-editor__number__input-container">
        <input
          ref={inputRef}
          className={clsx(
            'panel__content__form__section__input',
            'value-spec-editor__input',
            'value-spec-editor__number__input',
            {
              'value-spec-editor__number__input--error':
                errorChecker?.(valueSpecification),
            },
          )}
          spellCheck={false}
          type="text" // NOTE: we leave this as text so that we can support expression evaluation
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          onBlur={calculateExpression}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            onKeyDown(event);
            handleKeyDown?.(event);
          }}
          name={inputName}
        />
        <div className="value-spec-editor__number__actions">
          <button
            className="value-spec-editor__number__action"
            title="Evaluate Expression (Enter)"
            name={calculateButtonName}
            onClick={calculateExpression}
          >
            <CalculateIcon />
          </button>
        </div>
      </div>
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
};

export const NumberPrimitiveInstanceValueEditor = observer(
  forwardRef(NumberPrimitiveInstanceValueEditorInner) as <T>(
    props: NumberPrimitiveInstanceValueEditorProps<T> & {
      ref: React.ForwardedRef<HTMLInputElement>;
    },
  ) => ReturnType<typeof NumberPrimitiveInstanceValueEditorInner>,
);

/**
 * Generic interface for handling editing enum values. The editor component
 * expects an options array which contains the list of possible enum values.
 */
interface EnumInstanceValueEditorProps<T>
  extends PrimitiveInstanceValueEditorProps<T, string | null> {
  options: { label: string; value: string }[];
  selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
}

// eslint-disable-next-line comma-spacing
const EnumInstanceValueEditorInner = <T,>(
  props: EnumInstanceValueEditorProps<T>,
): React.ReactElement => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    errorChecker,
    resetValue,
    handleBlur,
    options,
    className,
    selectorConfig,
  } = props;
  const applicationStore = useApplicationStore();
  const enumValue = valueSelector(valueSpecification);
  const resetButtonName = `reset-${valueSelector(valueSpecification)}`;
  const inputName = `input-${valueSelector(valueSpecification)}`;

  const changeValue = (val: { value: string; label: string }): void => {
    updateValueSpecification(valueSpecification, val.value);
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
        value={enumValue ? { value: enumValue, label: enumValue } : null}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        hasError={errorChecker?.(valueSpecification)}
        placeholder="Select value"
        autoFocus={true}
        inputName={inputName}
        optionCustomization={selectorConfig?.optionCustomization}
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
};

export const EnumInstanceValueEditor = observer(
  EnumInstanceValueEditorInner as <T>(
    props: EnumInstanceValueEditorProps<T>,
  ) => ReturnType<typeof EnumInstanceValueEditorInner>,
);

const stringifyValue = (values: ValueSpecification[]): string => {
  if (values.length === 0) {
    return '';
  }
  return csvStringify([
    values
      .map((val) => {
        if (val instanceof PrimitiveInstanceValue) {
          return val.values[0];
        } else if (val instanceof EnumValueInstanceValue) {
          return guaranteeNonNullable(val.values[0]).value.name;
        }
        return undefined;
      })
      .filter(isNonNullable),
  ]).trim();
};

const getPlaceHolder = (expectedType: Type | V1_PackageableType): string => {
  if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
        return 'yyyy-mm-dd';
      case PRIMITIVE_TYPE.DATETIME:
        return 'yyyy-mm-ddThh:mm:ss';
      default:
        return 'Add';
    }
  } else if (expectedType instanceof V1_PackageableType) {
    switch (expectedType.fullPath) {
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
        return 'yyyy-mm-dd';
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.STRICTTIME:
        return 'yyyy-mm-ddThh:mm:ss';
      default:
        return 'Add';
    }
  } else {
    throw new Error(`Cannot get placeholder for type ${expectedType}`);
  }
};

/**
 * This is the base interface for collection primitive instance value editors.
 * The interface is made generic so that it can support various types of objects that hold the value
 * to be edited (currently, we just use this for CollectionInstanceValue and V1_Collection).
 *
 * T represents the type of the objects held in the collection (i.e. ValueSpecification or V1_ValueSpecification).
 * U represents the interface of the collection object (i.e. CollectionInstanceValue or V1_Collection). Currently,
 * this only supports collection objects that hold their data in a property called values.
 *
 * updateValueSpecification: callback that takes the collection object and the new values and handles updating
 * the collection object with the new values.
 * convertTextToValueSpecification: callback that takes a string and converts it to the expected valueSpecification type.
 * convertValueSpecificationToText: callback that takes a valueSpecification and converts it to a string.
 * expectedType: the expected type of the values in the collection.
 * errorChecker: optional callback that should return true if the valueSpecification is invalid.
 */
interface PrimitiveCollectionInstanceValueEditorProps<
  T,
  U extends { values: T[] },
> {
  valueSpecification: U;
  updateValueSpecification: (valueSpecification: U, values: T[]) => void;
  convertTextToValueSpecification: (
    type: Type | V1_PackageableType,
    text: string,
  ) => T | null;
  convertValueSpecificationToText: (
    valueSpecification: T,
  ) => string | undefined;
  expectedType: Type | V1_PackageableType;
  saveEdit: () => void;
  selectorSearchConfig?:
    | BasicValueSpecificationEditorSelectorSearchConfig
    | undefined;
  selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
  errorChecker?: (valueSpecification: U) => boolean;
  className?: string | undefined;
}

const PrimitiveCollectionInstanceValueEditorInner = <
  T,
  U extends { values: T[] },
>(
  props: PrimitiveCollectionInstanceValueEditorProps<T, U>,
): React.ReactElement => {
  const {
    valueSpecification,
    convertTextToValueSpecification,
    convertValueSpecificationToText,
    updateValueSpecification,
    saveEdit,
    selectorSearchConfig,
    selectorConfig,
    expectedType,
  } = props;

  // local state and variables
  const applicationStore = useApplicationStore();
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [inputValueIsError, setInputValueIsError] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<
    { label: string; value: string }[]
  >(
    valueSpecification.values
      .filter((value) => guaranteeNonNullable(value))
      .map(convertValueSpecificationToText)
      .filter(isNonEmptyString)
      .map((value) => ({
        label: value,
        value,
      })),
  );

  // typehead search setup
  const isTypeaheadSearchEnabled =
    expectedType === PrimitiveType.STRING && Boolean(selectorSearchConfig);
  const reloadValuesFunc = isTypeaheadSearchEnabled
    ? selectorSearchConfig?.reloadValues
    : undefined;
  const cleanUpReloadValuesFunc = isTypeaheadSearchEnabled
    ? selectorSearchConfig?.cleanUpReloadValues
    : undefined;
  const isLoading = isTypeaheadSearchEnabled
    ? selectorSearchConfig?.isLoading
    : undefined;
  const queryOptions =
    isTypeaheadSearchEnabled && selectorSearchConfig?.values?.length
      ? selectorSearchConfig.values.map((e) => ({
          value: e,
          label: e.toString(),
        }))
      : undefined;
  const noMatchMessage =
    isTypeaheadSearchEnabled && isLoading ? 'Loading...' : undefined;
  const copyButtonName = `copy-${valueSpecification.values[0] ? convertValueSpecificationToText(valueSpecification.values[0]) : ''}`;
  const inputName = `input-${valueSpecification.values[0] ? convertValueSpecificationToText(valueSpecification.values[0]) : ''}`;

  // helper functions
  const buildOptionForValueSpec = (
    value: T,
  ): { label: string; value: string } => {
    const stringValue = guaranteeNonNullable(
      convertValueSpecificationToText(value),
    );
    return {
      label: stringValue,
      value: stringValue,
    };
  };

  const isValueAlreadySelected = (value: string): boolean =>
    selectedOptions.map((option) => option.value).includes(value);

  /**
   * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
   * we simply return null for values which are not valid or parsable. But perhaps, we can consider
   * passing in logger or notifier to give the users some idea of what went wrong instead of ignoring
   * their input.
   */
  const convertInputValueToValueSpec = (): T | null => {
    const trimmedInputValue = inputValue.trim();

    if (trimmedInputValue.length) {
      const newValueSpec = convertTextToValueSpecification(
        expectedType,
        trimmedInputValue,
      );

      if (
        newValueSpec === null ||
        convertValueSpecificationToText(newValueSpec) === undefined ||
        isValueAlreadySelected(
          guaranteeNonNullable(convertValueSpecificationToText(newValueSpec)),
        )
      ) {
        return null;
      }

      return newValueSpec;
    }
    return null;
  };

  const addInputValueToSelectedOptions = (): void => {
    const newValueSpec = convertInputValueToValueSpec();

    if (newValueSpec !== null) {
      setSelectedOptions([
        ...selectedOptions,
        buildOptionForValueSpec(newValueSpec),
      ]);
      setInputValue('');
      reloadValuesFunc?.cancel();
    } else if (inputValue.trim().length) {
      setInputValueIsError(true);
    }
  };

  // event handlers
  const changeValue = (
    newSelectedOptions: { value: string; label: string }[],
    actionChange: SelectActionData<{ value: string; label: string }>,
  ): void => {
    setSelectedOptions(newSelectedOptions);
    if (actionChange.action === 'select-option') {
      setInputValue('');
    } else if (
      actionChange.action === 'remove-value' &&
      actionChange.removedValue.value === inputValue
    ) {
      setInputValueIsError(false);
    }
  };

  const handleInputChange = (
    newInputValue: string,
    actionChange: InputActionData,
  ): void => {
    if (actionChange.action === 'input-change') {
      setInputValue(newInputValue);
      setInputValueIsError(false);
      reloadValuesFunc?.cancel();
      const reloadValuesFuncTransformation = reloadValuesFunc?.(newInputValue);
      if (reloadValuesFuncTransformation) {
        flowResult(reloadValuesFuncTransformation).catch(
          applicationStore.alertUnhandledError,
        );
      }
    }
    if (actionChange.action === 'input-blur') {
      reloadValuesFunc?.cancel();
      cleanUpReloadValuesFunc?.();
    }
  };

  const copyValueToClipboard = async () =>
    navigator.clipboard.writeText(
      selectedOptions.map((option) => option.value).join(','),
    );

  const updateValueSpecAndSaveEdit = (): void => {
    const newValueSpec = convertInputValueToValueSpec();
    const finalSelectedOptions =
      newValueSpec !== null
        ? [...selectedOptions, buildOptionForValueSpec(newValueSpec)]
        : selectedOptions;
    const finalFormattedSelectedOptions = finalSelectedOptions
      .map((option) => option.value)
      .map((value) => convertTextToValueSpecification(expectedType, value))
      .filter(isNonNullable);
    updateValueSpecification(valueSpecification, finalFormattedSelectedOptions);
    saveEdit();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if ((event.key === 'Enter' || event.key === ',') && !event.shiftKey) {
      addInputValueToSelectedOptions();
      event.preventDefault();
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const pastedText = event.clipboardData.getData('text');
    const parsedData = parseCSVString(pastedText);
    if (!parsedData) {
      return;
    }
    const newValues = uniq(
      uniq(parsedData)
        .map((value) => {
          const newValueSpec = convertTextToValueSpecification(
            expectedType,
            value,
          );
          return newValueSpec
            ? convertValueSpecificationToText(newValueSpec)
            : null;
        })
        .filter(isNonNullable),
    ).filter((value) => !isValueAlreadySelected(value));
    setSelectedOptions([
      ...selectedOptions,
      ...newValues.map((value) => ({ label: value, value })),
    ]);
    event.preventDefault();
  };

  const onBlur = (
    event: React.FocusEvent<HTMLInputElement, HTMLButtonElement>,
  ): void => {
    if (
      event.relatedTarget?.name !== copyButtonName &&
      event.relatedTarget?.name !== inputName
    ) {
      updateValueSpecAndSaveEdit();
    }
  };

  return (
    <div className="value-spec-editor" onBlur={onBlur}>
      <CustomSelectorInput
        className={clsx('value-spec-editor__primitive-collection-selector', {
          'value-spec-editor__primitive-collection-selector--error':
            inputValueIsError,
        })}
        options={queryOptions}
        inputValue={inputValue}
        isMulti={true}
        menuIsOpen={
          isTypeaheadSearchEnabled &&
          inputValue.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH
        }
        autoFocus={true}
        inputRef={inputRef}
        onChange={changeValue}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        value={selectedOptions}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        isLoading={isLoading}
        noMatchMessage={noMatchMessage}
        placeholder={getPlaceHolder(expectedType)}
        components={{
          DropdownIndicator: null,
        }}
        inputName={inputName}
        optionCustomization={selectorConfig?.optionCustomization}
      />
      <button
        className="value-spec-editor__list-editor__copy-button"
        // eslint-disable-next-line no-void
        onClick={() => void copyValueToClipboard()}
        name={copyButtonName}
        title="Copy values to clipboard"
      >
        <CopyIcon />
      </button>
      <button
        className="value-spec-editor__list-editor__save-button btn--dark"
        name="Save"
        title="Save"
        onClick={updateValueSpecAndSaveEdit}
      >
        <SaveIcon />
      </button>
    </div>
  );
};

export const PrimitiveCollectionInstanceValueEditor = observer(
  PrimitiveCollectionInstanceValueEditorInner as <T, U extends { values: T[] }>(
    props: PrimitiveCollectionInstanceValueEditorProps<T, U>,
  ) => ReturnType<typeof PrimitiveCollectionInstanceValueEditorInner>,
);

interface EnumCollectionInstanceValueEditorProps<T, U extends { values: T[] }>
  extends PrimitiveCollectionInstanceValueEditorProps<T, U> {
  enumOptions: { label: string; value: string }[] | undefined;
}

const EnumCollectionInstanceValueEditorInner = <T, U extends { values: T[] }>(
  props: EnumCollectionInstanceValueEditorProps<T, U>,
): React.ReactElement => {
  const {
    valueSpecification,
    convertTextToValueSpecification,
    convertValueSpecificationToText,
    updateValueSpecification,
    saveEdit,
    expectedType,
    enumOptions,
    selectorConfig,
  } = props;

  guaranteeNonNullable(
    enumOptions,
    'Must pass enum options to EnumCollectionInstanceValueEditor',
  );

  // local state and variables
  const applicationStore = useApplicationStore();
  const [inputValue, setInputValue] = useState('');
  const [inputValueIsError, setInputValueIsError] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<
    { label: string; value: string }[]
  >(
    valueSpecification.values
      .filter((value) => guaranteeNonNullable(value))
      .map(convertValueSpecificationToText)
      .filter(isNonEmptyString)
      .map((value) => ({
        label: value,
        value,
      })),
  );

  const availableOptions = enumOptions?.filter(
    (value) =>
      !selectedOptions.some(
        (selectedValue) => selectedValue.value === value.value,
      ),
  );

  const copyButtonName = `copy-${valueSpecification.values[0] ? convertValueSpecificationToText(valueSpecification.values[0]) : ''}`;
  const inputName = `input-${valueSpecification.values[0] ? convertValueSpecificationToText(valueSpecification.values[0]) : ''}`;

  // helper functions
  const isValueAlreadySelected = (value: string): boolean =>
    selectedOptions.map((option) => option.value).includes(value);

  /**
   * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
   * we simply return null for values which are not valid or parsable. But perhaps, we can consider
   * passing in logger or notifier to give the users some idea of what went wrong instead of ignoring
   * their input.
   */
  const convertInputValueToEnum = (): string | null => {
    const trimmedInputValue = inputValue.trim();

    if (
      !trimmedInputValue.length ||
      isValueAlreadySelected(trimmedInputValue) ||
      !enumOptions?.some((option) => option.value === trimmedInputValue)
    ) {
      return null;
    }

    return trimmedInputValue;
  };

  const addInputValueToSelectedOptions = (): void => {
    const newEnum = convertInputValueToEnum();

    if (newEnum !== null) {
      setSelectedOptions([
        ...selectedOptions,
        {
          label: newEnum,
          value: newEnum,
        },
      ]);
      setInputValue('');
    } else if (inputValue.trim().length) {
      setInputValueIsError(true);
    }
  };

  // event handlers
  const changeValue = (
    newSelectedOptions: { value: string; label: string }[],
    actionChange: SelectActionData<{ value: string; label: string }>,
  ): void => {
    setSelectedOptions(newSelectedOptions);
    if (actionChange.action === 'select-option') {
      setInputValue('');
    } else if (
      actionChange.action === 'remove-value' &&
      actionChange.removedValue.value === inputValue
    ) {
      setInputValueIsError(false);
    }
  };

  const handleInputChange = (
    newInputValue: string,
    actionChange: InputActionData,
  ): void => {
    if (actionChange.action === 'input-change') {
      setInputValue(newInputValue);
      setInputValueIsError(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if ((event.key === 'Enter' || event.key === ',') && !event.shiftKey) {
      addInputValueToSelectedOptions();
      event.preventDefault();
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const pastedText = event.clipboardData.getData('text');
    const parsedData = parseCSVString(pastedText);
    if (!parsedData) {
      return;
    }
    const newValues = uniq(
      uniq(parsedData).filter((value) =>
        enumOptions?.some((option) => option.value === value),
      ),
    ).filter((value) => !isValueAlreadySelected(value));
    setSelectedOptions([
      ...selectedOptions,
      ...newValues.map((value) => ({ label: value, value })),
    ]);
    event.preventDefault();
  };

  const copyValueToClipboard = async () =>
    navigator.clipboard.writeText(
      selectedOptions.map((option) => option.value).join(','),
    );

  const updateValueSpecAndSaveEdit = (): void => {
    const result = selectedOptions
      .map((option) => option.value)
      .map((value) => convertTextToValueSpecification(expectedType, value))
      .filter(isNonNullable);
    updateValueSpecification(valueSpecification, result);
    saveEdit();
  };

  const onBlur = (
    event: React.FocusEvent<HTMLInputElement, HTMLButtonElement>,
  ): void => {
    if (
      event.relatedTarget?.name !== copyButtonName &&
      event.relatedTarget?.name !== inputName
    ) {
      updateValueSpecAndSaveEdit();
    }
  };

  return (
    <div className="value-spec-editor" onBlur={onBlur}>
      <CustomSelectorInput
        className={clsx('value-spec-editor__enum-collection-selector', {
          'value-spec-editor__enum-collection-selector--error':
            inputValueIsError,
        })}
        options={availableOptions}
        inputValue={inputValue}
        isMulti={true}
        autoFocus={true}
        onChange={changeValue}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        value={selectedOptions}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        placeholder="Add"
        menuIsOpen={true}
        inputName={inputName}
        optionCustomization={selectorConfig?.optionCustomization}
      />
      <button
        className="value-spec-editor__list-editor__copy-button"
        // eslint-disable-next-line no-void
        onClick={() => void copyValueToClipboard()}
        name={copyButtonName}
        title="Copy values to clipboard"
      >
        <CopyIcon />
      </button>
      <button
        className="value-spec-editor__list-editor__save-button btn--dark"
        name="Save"
        title="Save"
        onClick={updateValueSpecAndSaveEdit}
      >
        <SaveIcon />
      </button>
    </div>
  );
};

export const EnumCollectionInstanceValueEditor = observer(
  EnumCollectionInstanceValueEditorInner as <T, U extends { values: T[] }>(
    props: EnumCollectionInstanceValueEditorProps<T, U>,
  ) => ReturnType<typeof EnumCollectionInstanceValueEditorInner>,
);

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

interface CollectionValueInstanceValueEditorProps<T, U extends { values: T[] }>
  extends Omit<PrimitiveCollectionInstanceValueEditorProps<T, U>, 'saveEdit'>,
    Omit<EnumCollectionInstanceValueEditorProps<T, U>, 'saveEdit'> {
  stringifyCollectionValueSpecification: (valueSpecification: U) => string;
}

const CollectionValueInstanceValueEditorInner = <T, U extends { values: T[] }>(
  props: CollectionValueInstanceValueEditorProps<T, U>,
): React.ReactElement => {
  const {
    valueSpecification,
    convertTextToValueSpecification,
    convertValueSpecificationToText,
    updateValueSpecification,
    stringifyCollectionValueSpecification,
    errorChecker,
    className,
    selectorSearchConfig,
    selectorConfig,
    expectedType,
    enumOptions,
  } = props;

  const [editable, setEditable] = useState(false);
  const valueText = stringifyCollectionValueSpecification(valueSpecification);
  const previewText = `List(${
    valueSpecification.values.length === 0
      ? 'empty'
      : valueSpecification.values.length
  })${
    valueSpecification.values.length === 0
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
    }
  };

  if (editable) {
    return (
      <>
        <div className={clsx('value-spec-editor', className)}>
          {enumOptions !== undefined ? (
            <EnumCollectionInstanceValueEditor<T, U>
              valueSpecification={valueSpecification}
              updateValueSpecification={updateValueSpecification}
              convertTextToValueSpecification={convertTextToValueSpecification}
              convertValueSpecificationToText={convertValueSpecificationToText}
              expectedType={expectedType}
              saveEdit={saveEdit}
              enumOptions={enumOptions}
              selectorConfig={selectorConfig}
            />
          ) : (
            <PrimitiveCollectionInstanceValueEditor<T, U>
              valueSpecification={valueSpecification}
              updateValueSpecification={updateValueSpecification}
              convertTextToValueSpecification={convertTextToValueSpecification}
              convertValueSpecificationToText={convertValueSpecificationToText}
              expectedType={expectedType}
              saveEdit={saveEdit}
              selectorSearchConfig={selectorSearchConfig}
              selectorConfig={selectorConfig}
            />
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
          'value-spec-editor__list-editor__preview--error':
            errorChecker?.(valueSpecification),
        })}
      >
        {previewText}
      </div>
      <button className="value-spec-editor__list-editor__edit-icon">
        <PencilIcon />
      </button>
    </div>
  );
};

export const CollectionValueInstanceValueEditor = observer(
  CollectionValueInstanceValueEditorInner as <T, U extends { values: T[] }>(
    props: CollectionValueInstanceValueEditorProps<T, U>,
  ) => ReturnType<typeof CollectionValueInstanceValueEditorInner>,
);

const UnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="value-spec-editor--unsupported">unsupported</div>
);

interface DateInstanceValueEditorProps<
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<
    PrimitiveInstanceValueEditorProps<T, string | null>,
    'updateValueSpecification'
  > {
  updateValueSpecification: CustomDatePickerUpdateValueSpecification<T>;
  typeCheckOption: TypeCheckOption | V1_TypeCheckOption;
  displayAsEditableValue?: boolean | undefined;
}

const DateInstanceValueEditorInner = <
  T extends CustomDatePickerValueSpecification | undefined,
>(
  props: DateInstanceValueEditorProps<T>,
): React.ReactElement => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    resetValue,
    handleBlur,
    typeCheckOption,
    displayAsEditableValue,
    className,
  } = props;

  return (
    <div className={clsx('value-spec-editor', className)}>
      <CustomDatePicker<T>
        valueSpecification={valueSpecification}
        valueSelector={valueSelector}
        typeCheckOption={typeCheckOption}
        updateValueSpecification={updateValueSpecification}
        hasError={
          valueSpecification instanceof PrimitiveInstanceValue &&
          !isValidInstanceValue(valueSpecification)
        }
        handleBlur={handleBlur}
        displayAsEditableValue={displayAsEditableValue}
      />
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
};

export const DateInstanceValueEditor = observer(
  DateInstanceValueEditorInner as <
    T extends CustomDatePickerValueSpecification | undefined,
  >(
    props: DateInstanceValueEditorProps<T>,
  ) => ReturnType<typeof DateInstanceValueEditorInner>,
);

/**
 * TODO we should pass in the props `resetValueSpecification`. Reset
 * should be part of this editor. Also through here we can call `observe_` accordingly.
 *
 * See https://github.com/finos/legend-studio/pull/1021
 */
export const BasicValueSpecificationEditor = forwardRef<
  HTMLInputElement | null,
  {
    valueSpecification: ValueSpecification;
    graph: PureModel;
    observerContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    isConstant?: boolean | undefined;
    selectorSearchConfig?:
      | BasicValueSpecificationEditorSelectorSearchConfig
      | undefined;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    handleBlur?: (() => void) | undefined;
    handleKeyDown?:
      | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
      | undefined;
    displayDateEditorAsEditableValue?: boolean | undefined;
  }
>(function BasicValueSpecificationEditorInner(props, ref) {
  const {
    className,
    valueSpecification,
    graph,
    observerContext,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    selectorSearchConfig,
    selectorConfig,
    isConstant,
    handleBlur,
    handleKeyDown,
    displayDateEditorAsEditableValue,
  } = props;

  const applicationStore = useApplicationStore();

  const errorChecker = (_valueSpecification: InstanceValue) =>
    !isValidInstanceValue(_valueSpecification);
  const dateValueSelector = (
    _valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue,
  ): string | null => {
    return _valueSpecification instanceof SimpleFunctionExpression
      ? ''
      : (_valueSpecification.values[0] as string | null);
  };
  const dateUpdateValueSpecification: CustomDatePickerUpdateValueSpecification<
    SimpleFunctionExpression | PrimitiveInstanceValue | undefined
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
        instanceValue_setValue(_valueSpecification, value, 0, observerContext);
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

  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;

    // eslint-disable-next-line comma-spacing
    const valueSelector = <T,>(val: PrimitiveInstanceValue): T =>
      val.values[0] as T;
    // eslint-disable-next-line comma-spacing
    const updateValueSpecification = <T,>(
      _valueSpecification: PrimitiveInstanceValue,
      value: T,
    ) => {
      instanceValue_setValue(_valueSpecification, value, 0, observerContext);
      setValueSpecification(_valueSpecification);
    };
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor<PrimitiveInstanceValue>
            valueSpecification={valueSpecification}
            valueSelector={valueSelector}
            updateValueSpecification={updateValueSpecification}
            errorChecker={errorChecker}
            className={className}
            resetValue={resetValue}
            selectorSearchConfig={selectorSearchConfig}
            selectorConfig={selectorConfig}
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
          <BooleanPrimitiveInstanceValueEditor<PrimitiveInstanceValue>
            valueSpecification={valueSpecification}
            valueSelector={valueSelector}
            updateValueSpecification={updateValueSpecification}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.BINARY:
      case PRIMITIVE_TYPE.BYTE:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor<PrimitiveInstanceValue>
            valueSpecification={valueSpecification}
            valueSelector={valueSelector}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            updateValueSpecification={updateValueSpecification}
            errorChecker={errorChecker}
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
      case PRIMITIVE_TYPE.LATESTDATE:
        return (
          <DateInstanceValueEditor<
            SimpleFunctionExpression | PrimitiveInstanceValue
          >
            valueSpecification={valueSpecification}
            valueSelector={dateValueSelector}
            typeCheckOption={typeCheckOption}
            className={className}
            updateValueSpecification={dateUpdateValueSpecification}
            resetValue={resetValue}
            handleBlur={handleBlur}
            displayAsEditableValue={displayDateEditorAsEditableValue}
            errorChecker={(_valueSpecification) =>
              _valueSpecification instanceof PrimitiveInstanceValue &&
              errorChecker(_valueSpecification)
            }
          />
        );
      default:
        return <UnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    const enumType = guaranteeType(
      valueSpecification.genericType?.value.rawType,
      Enumeration,
    );
    const options = enumType.values.map((value) => ({
      label: value.name,
      value: value.name,
    }));
    return (
      <EnumInstanceValueEditor<EnumValueInstanceValue>
        valueSpecification={valueSpecification}
        valueSelector={(val) =>
          val.values[0] === undefined ? null : val.values[0].value.name
        }
        options={options}
        className={className}
        resetValue={resetValue}
        updateValueSpecification={(
          _valueSpecification: EnumValueInstanceValue,
          value: string | null,
        ) => {
          const enumValue = guaranteeNonNullable(
            enumType.values.find((val: Enum) => val.name === value),
            `Unable to find enum value ${value} in enumeration ${enumType.name}`,
          );
          instanceValue_setValue(
            _valueSpecification,
            EnumValueExplicitReference.create(enumValue),
            0,
            observerContext,
          );
          setValueSpecification(_valueSpecification);
        }}
        errorChecker={(_valueSpecification: EnumValueInstanceValue) =>
          !isValidInstanceValue(_valueSpecification)
        }
        handleBlur={handleBlur}
        selectorConfig={selectorConfig}
      />
    );
  } else if (
    valueSpecification instanceof CollectionInstanceValue &&
    valueSpecification.genericType
  ) {
    const updateValueSpecification = (
      collectionValueSpecification: CollectionInstanceValue,
      valueSpecifications: ValueSpecification[],
    ) => {
      instanceValue_setValues(
        collectionValueSpecification,
        valueSpecifications,
        observerContext,
      );
      setValueSpecification(collectionValueSpecification);
    };
    const convertTextToValueSpecification = (
      type: Type | V1_PackageableType,
      text: string,
    ): ValueSpecification | null => {
      if (type instanceof Enumeration) {
        const enumValue = convertTextToEnum(text, type);
        if (enumValue) {
          const enumValueInstanceValue = new EnumValueInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(type)),
          );
          instanceValue_setValues(
            enumValueInstanceValue,
            [EnumValueExplicitReference.create(enumValue)],
            observerContext,
          );
          return observe_ValueSpecification(
            enumValueInstanceValue,
            observerContext,
          );
        }
      } else {
        const primitiveVal = convertTextToPrimitiveInstanceValue(
          guaranteeType(type, Type),
          text,
          observerContext,
        );
        if (primitiveVal) {
          return observe_ValueSpecification(primitiveVal, observerContext);
        }
      }
      return null;
    };
    const enumOptions =
      typeCheckOption.expectedType instanceof Enumeration
        ? typeCheckOption.expectedType.values.map((enumValue) => ({
            label: enumValue.name,
            value: enumValue.name,
          }))
        : undefined;
    // NOTE: since when we fill in the arguments, `[]` (or `nullish` value in Pure)
    // is used for parameters we don't handle, we should not attempt to support empty collection
    // without generic type here as that  is equivalent to `[]`
    return (
      <CollectionValueInstanceValueEditor<
        ValueSpecification,
        CollectionInstanceValue
      >
        valueSpecification={valueSpecification}
        updateValueSpecification={updateValueSpecification}
        expectedType={typeCheckOption.expectedType}
        className={className}
        selectorSearchConfig={selectorSearchConfig}
        selectorConfig={selectorConfig}
        stringifyCollectionValueSpecification={(
          collectionValueSpecification: CollectionInstanceValue,
        ) => stringifyValue(collectionValueSpecification.values)}
        errorChecker={errorChecker}
        convertValueSpecificationToText={(
          _valueSpecification: ValueSpecification,
        ) =>
          getValueSpecificationStringValue(
            _valueSpecification,
            applicationStore,
            { omitEnumOwnerName: true },
          )
        }
        convertTextToValueSpecification={convertTextToValueSpecification}
        enumOptions={enumOptions}
      />
    );
  }
  // property expression
  else if (valueSpecification instanceof VariableExpression) {
    return (
      <VariableExpressionParameterEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
        isConstant={Boolean(isConstant)}
      />
    );
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return (
      <BasicValueSpecificationEditor
        valueSpecification={valueSpecification.getValue()}
        graph={graph}
        observerContext={observerContext}
        typeCheckOption={typeCheckOption}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
        displayDateEditorAsEditableValue={displayDateEditorAsEditableValue}
        selectorSearchConfig={selectorSearchConfig}
        selectorConfig={selectorConfig}
      />
    );
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    if (isSubType(typeCheckOption.expectedType, PrimitiveType.DATE)) {
      if (isUsedDateFunctionSupportedInFormMode(valueSpecification)) {
        return (
          <DateInstanceValueEditor<
            SimpleFunctionExpression | PrimitiveInstanceValue
          >
            valueSpecification={valueSpecification}
            valueSelector={dateValueSelector}
            typeCheckOption={typeCheckOption}
            className={className}
            updateValueSpecification={dateUpdateValueSpecification}
            resetValue={resetValue}
            handleBlur={handleBlur}
            displayAsEditableValue={displayDateEditorAsEditableValue}
          />
        );
      } else {
        return <UnsupportedValueSpecificationEditor />;
      }
    } else if (
      // TODO: think of other ways we could make use of this code path where we can simplify
      // an expression value to simple value, not just handling minus() function only
      isSubType(typeCheckOption.expectedType, PrimitiveType.NUMBER) &&
      matchFunctionName(
        valueSpecification.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
      )
    ) {
      const simplifiedValue = simplifyValueExpression(
        valueSpecification,
        observerContext,
      );
      if (
        simplifiedValue instanceof PrimitiveInstanceValue &&
        isSubType(
          simplifiedValue.genericType.value.rawType,
          PrimitiveType.NUMBER,
        )
      ) {
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={simplifiedValue}
            valueSelector={(val) => val.values[0] as number}
            isInteger={
              simplifiedValue.genericType.value.rawType ===
              PrimitiveType.INTEGER
            }
            updateValueSpecification={(
              _valueSpecification: PrimitiveInstanceValue,
              value: number | null,
            ) => {
              instanceValue_setValue(
                _valueSpecification,
                value,
                0,
                observerContext,
              );
              setValueSpecification(_valueSpecification);
            }}
            className={className}
            resetValue={resetValue}
            ref={ref}
            handleBlur={handleBlur}
            handleKeyDown={handleKeyDown}
          />
        );
      }
    }
  }

  return <UnsupportedValueSpecificationEditor />;
});

export const EditableBasicValueSpecificationEditor = observer(
  (props: {
    valueSpecification: ValueSpecification;
    setValueSpecification: (valueSpec: ValueSpecification) => void;
    graph: PureModel;
    observerContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    resetValue: () => void;
    selectorSearchConfig?:
      | BasicValueSpecificationEditorSelectorSearchConfig
      | undefined;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    isConstant?: boolean;
    initializeAsEditable?: boolean;
  }) => {
    const {
      valueSpecification,
      setValueSpecification,
      graph,
      observerContext,
      typeCheckOption,
      resetValue,
      selectorSearchConfig,
      selectorConfig,
      isConstant,
      initializeAsEditable,
    } = props;
    const applicationStore = useApplicationStore();

    const [isEditingValue, setIsEditingValue] = useState(
      initializeAsEditable ?? false,
    );
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditingValue) {
        inputRef.current?.focus();
      }
    }, [isEditingValue, inputRef]);

    const editableDisplayValueSupported =
      (valueSpecification instanceof PrimitiveInstanceValue &&
        !isSubType(
          valueSpecification.genericType.value.rawType,
          PrimitiveType.DATE,
        ) &&
        valueSpecification.genericType.value.rawType !==
          PrimitiveType.BOOLEAN) ||
      valueSpecification instanceof EnumValueInstanceValue;

    const shouldRenderEditor = isEditingValue || !editableDisplayValueSupported;

    const valueSpecStringValue = getValueSpecificationStringValue(
      valueSpecification,
      applicationStore,
      {
        omitEnumOwnerName: true,
      },
    );

    return shouldRenderEditor ? (
      <BasicValueSpecificationEditor
        valueSpecification={valueSpecification}
        setValueSpecification={setValueSpecification}
        graph={graph}
        observerContext={observerContext}
        typeCheckOption={typeCheckOption}
        resetValue={resetValue}
        selectorSearchConfig={selectorSearchConfig}
        selectorConfig={selectorConfig}
        isConstant={isConstant}
        ref={inputRef}
        handleBlur={() => setIsEditingValue(false)}
        handleKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            setIsEditingValue(false);
          }
        }}
        displayDateEditorAsEditableValue={true}
      />
    ) : (
      <div className="value-spec-editor__editable__display">
        <span
          className={clsx(
            'value-spec-editor__editable__display--content editable-value',
            {
              'value-spec-editor__editable__display--content--error':
                valueSpecification instanceof InstanceValue &&
                !isValidInstanceValue(valueSpecification),
            },
          )}
          onClick={() => {
            setIsEditingValue(true);
          }}
        >
          {`"${valueSpecStringValue !== undefined ? valueSpecStringValue : ''}"`}
        </span>
      </div>
    );
  },
);
