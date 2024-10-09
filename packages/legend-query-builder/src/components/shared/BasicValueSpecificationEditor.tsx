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
  type Type,
  type ValueSpecification,
  type PureModel,
  type ObserverContext,
  PrimitiveInstanceValue,
  CollectionInstanceValue,
  EnumValueInstanceValue,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
  VariableExpression,
  EnumValueExplicitReference,
  PrimitiveType,
  PRIMITIVE_TYPE,
  GenericTypeExplicitReference,
  GenericType,
  Enumeration,
  getMultiplicityDescription,
  matchFunctionName,
  isSubType,
  InstanceValue,
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
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { CustomDatePicker } from './CustomDatePicker.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import {
  isValidInstanceValue,
  simplifyValueExpression,
} from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { evaluate } from 'mathjs';
import { isUsedDateFunctionSupportedInFormMode } from '../../stores/QueryBuilderStateBuilder.js';
import {
  convertTextToEnum,
  convertTextToPrimitiveInstanceValue,
  getValueSpecificationStringValue,
} from '../../stores/shared/ValueSpecificationEditorHelper.js';

type TypeCheckOption = {
  expectedType: Type;
  /**
   * Indicates if a strict type-matching will happen.
   * Sometimes, auto-boxing allow some rooms to wiggle,
   * for example we can assign a Float to an Integer, a
   * Date to a DateTime. With this flag set to `true`
   * we will not allow this.
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

const StringPrimitiveInstanceValueEditor = observer(
  forwardRef<
    HTMLInputElement | SelectComponent,
    {
      valueSpecification: PrimitiveInstanceValue;
      className?: string | undefined;
      setValueSpecification: (val: ValueSpecification) => void;
      resetValue: () => void;
      selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
      observerContext: ObserverContext;
      handleBlur?: (() => void) | undefined;
      handleKeyDown?: React.KeyboardEventHandler<HTMLDivElement> | undefined;
    }
  >(function StringPrimitiveInstanceValueEditor(props, ref) {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      selectorConfig,
      observerContext,
      handleBlur,
      handleKeyDown,
    } = props;
    const useSelector = Boolean(selectorConfig);
    const applicationStore = useApplicationStore();
    const value = valueSpecification.values[0] as string | null;
    const updateValueSpec = (val: string): void => {
      instanceValue_setValue(valueSpecification, val, 0, observerContext);
      setValueSpecification(valueSpecification);
    };
    const changeInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      updateValueSpec(event.target.value);
    };
    // custom select
    const selectedValue = value ? { value: value, label: value } : null;
    const reloadValuesFunc = selectorConfig?.reloadValues;
    const changeValue = (
      val: null | { value: number | string; label: string },
    ): void => {
      const newValue = val === null ? '' : val.value.toString();
      updateValueSpec(newValue);
    };
    const handleInputChange = (
      inputValue: string,
      actionChange: InputActionData,
    ): void => {
      if (actionChange.action === 'input-change') {
        updateValueSpec(inputValue);
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
        selectorConfig?.cleanUpReloadValues?.();
      }
    };
    const isLoading = selectorConfig?.isLoading;
    const queryOptions = selectorConfig?.values?.length
      ? selectorConfig.values.map((e) => ({
          value: e,
          label: e.toString(),
        }))
      : undefined;
    const noOptionsMessage =
      selectorConfig?.values === undefined ? (): null => null : undefined;
    const resetButtonName = `reset-${valueSpecification.hashCode}`;
    const inputName = `input-${valueSpecification.hashCode}`;

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
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            isLoading={isLoading}
            allowCreateWhileLoading={true}
            noOptionsMessage={noOptionsMessage}
            components={{
              DropdownIndicator: null,
            }}
            hasError={!isValidInstanceValue(valueSpecification)}
            placeholder={value === '' ? '(empty)' : undefined}
            inputRef={ref as React.Ref<SelectComponent>}
            onKeyDown={
              handleKeyDown as React.KeyboardEventHandler<HTMLDivElement>
            }
            inputName={inputName}
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
              !isValidInstanceValue(valueSpecification)
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
  }),
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
    observerContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      observerContext,
    } = props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void => {
      instanceValue_setValue(valueSpecification, !value, 0, observerContext);
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <button
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
  },
);

const NumberPrimitiveInstanceValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      valueSpecification: PrimitiveInstanceValue;
      isInteger: boolean;
      className?: string | undefined;
      resetValue: () => void;
      setValueSpecification: (val: ValueSpecification) => void;
      observerContext: ObserverContext;
      handleBlur?: (() => void) | undefined;
      handleKeyDown?:
        | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
        | undefined;
    }
  >(function NumberPrimitiveInstanceValueEditor(props, ref) {
    const {
      valueSpecification,
      isInteger,
      className,
      resetValue,
      setValueSpecification,
      observerContext,
      handleBlur,
      handleKeyDown,
    } = props;
    const [value, setValue] = useState(
      valueSpecification.values[0] === null
        ? ''
        : (valueSpecification.values[0] as number).toString(),
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
          parsedValue !== valueSpecification.values[0]
        ) {
          instanceValue_setValue(
            valueSpecification,
            parsedValue,
            0,
            observerContext,
          );
          setValueSpecification(valueSpecification);
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
          const prevValue =
            valueSpecification.values[0] !== null &&
            valueSpecification.values[0] !== undefined
              ? valueSpecification.values[0].toString()
              : '';
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
        numericValue !== valueSpecification.values[0]
      ) {
        const valueFromValueSpec =
          valueSpecification.values[0] !== null
            ? (valueSpecification.values[0] as number).toString()
            : '';
        setValue(valueFromValueSpec);
      }
    }, [numericValue, valueSpecification]);

    const resetButtonName = `reset-${valueSpecification.hashCode}`;
    const inputName = `input-${valueSpecification.hashCode}`;
    const calculateButtonName = `calculate-${valueSpecification.hashCode}`;

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
                  !isValidInstanceValue(valueSpecification),
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
  }),
);

const EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: EnumValueInstanceValue;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    observerContext: ObserverContext;
    handleBlur?: (() => void) | undefined;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      observerContext,
      handleBlur,
    } = props;
    const applicationStore = useApplicationStore();
    const enumType = guaranteeType(
      valueSpecification.genericType?.value.rawType,
      Enumeration,
    );
    const enumValue =
      valueSpecification.values[0] === undefined
        ? null
        : valueSpecification.values[0].value;
    const options = enumType.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const resetButtonName = `reset-${valueSpecification.hashCode}`;
    const inputName = `input-${valueSpecification.hashCode}`;

    const changeValue = (val: { value: Enum; label: string }): void => {
      instanceValue_setValue(
        valueSpecification,
        EnumValueExplicitReference.create(val.value),
        0,
        observerContext,
      );
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
          value={enumValue ? { value: enumValue, label: enumValue.name } : null}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          hasError={!isValidInstanceValue(valueSpecification)}
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

const getPlaceHolder = (expectedType: Type): string => {
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
  }
  return 'Add';
};

interface BasicValueSpecificationEditorSelectorConfig {
  values: string[] | undefined;
  isLoading: boolean;
  reloadValues:
    | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
    | undefined;
  cleanUpReloadValues?: () => void;
}

const PrimitiveCollectionInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    expectedType: Type;
    saveEdit: () => void;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    observerContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      expectedType,
      saveEdit,
      selectorConfig,
      observerContext,
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
        .map((valueSpec) =>
          getValueSpecificationStringValue(valueSpec, applicationStore),
        )
        .filter(isNonEmptyString)
        .map((value) => ({
          label: value,
          value,
        })),
    );

    // typehead search setup
    const isTypeaheadSearchEnabled =
      expectedType === PrimitiveType.STRING && Boolean(selectorConfig);
    const reloadValuesFunc = isTypeaheadSearchEnabled
      ? selectorConfig?.reloadValues
      : undefined;
    const cleanUpReloadValuesFunc = isTypeaheadSearchEnabled
      ? selectorConfig?.cleanUpReloadValues
      : undefined;
    const isLoading = isTypeaheadSearchEnabled
      ? selectorConfig?.isLoading
      : undefined;
    const queryOptions =
      isTypeaheadSearchEnabled && selectorConfig?.values?.length
        ? selectorConfig.values.map((e) => ({
            value: e,
            label: e.toString(),
          }))
        : undefined;
    const noMatchMessage =
      isTypeaheadSearchEnabled && isLoading ? 'Loading...' : undefined;
    const copyButtonName = `copy-${valueSpecification.hashCode}`;
    const inputName = `input-${valueSpecification.hashCode}`;

    // helper functions
    const buildOptionForValueSpec = (
      value: ValueSpecification,
    ): { label: string; value: string } => {
      const stringValue = guaranteeNonNullable(
        getValueSpecificationStringValue(value, applicationStore),
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
    const convertInputValueToValueSpec = (): ValueSpecification | null => {
      const trimmedInputValue = inputValue.trim();

      if (trimmedInputValue.length) {
        const newValueSpec = convertTextToPrimitiveInstanceValue(
          expectedType,
          trimmedInputValue,
          observerContext,
        );

        if (
          newValueSpec === null ||
          getValueSpecificationStringValue(newValueSpec, applicationStore) ===
            undefined ||
          isValueAlreadySelected(
            guaranteeNonNullable(
              getValueSpecificationStringValue(newValueSpec, applicationStore),
            ),
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
        const reloadValuesFuncTransformation =
          reloadValuesFunc?.(newInputValue);
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
      instanceValue_setValues(
        valueSpecification,
        finalSelectedOptions
          .map((option) => option.value)
          .map((value) =>
            convertTextToPrimitiveInstanceValue(
              expectedType,
              value,
              observerContext,
            ),
          )
          .filter(isNonNullable),
        observerContext,
      );
      saveEdit();
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
      event,
    ) => {
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
            const newValueSpec = convertTextToPrimitiveInstanceValue(
              expectedType,
              value,
              observerContext,
            );
            return newValueSpec
              ? getValueSpecificationStringValue(newValueSpec, applicationStore)
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
  },
);

const EnumCollectionInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    observerContext: ObserverContext;
    saveEdit: () => void;
  }) => {
    const { valueSpecification, observerContext, saveEdit } = props;

    // local state and variables
    const applicationStore = useApplicationStore();
    const enumType = guaranteeType(
      valueSpecification.genericType?.value.rawType,
      Enumeration,
    );
    const [inputValue, setInputValue] = useState('');
    const [inputValueIsError, setInputValueIsError] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<
      { label: string; value: Enum }[]
    >(
      (valueSpecification.values as EnumValueInstanceValue[])
        .filter((valueSpec) => valueSpec.values[0]?.value !== undefined)
        .map((valueSpec) => ({
          label: valueSpec.values[0]!.value.name,
          value: valueSpec.values[0]!.value,
        })),
    );

    const availableOptions = enumType.values
      .filter(
        (value) =>
          !selectedOptions.some(
            (selectedValue) => selectedValue.value.name === value.name,
          ),
      )
      .map((value) => ({
        label: value.name,
        value: value,
      }));

    const copyButtonName = `copy-${valueSpecification.hashCode}`;
    const inputName = `input-${valueSpecification.hashCode}`;

    // helper functions
    const isValueAlreadySelected = (value: Enum): boolean =>
      selectedOptions.map((option) => option.value).includes(value);

    /**
     * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
     * we simply return null for values which are not valid or parsable. But perhaps, we can consider
     * passing in logger or notifier to give the users some idea of what went wrong instead of ignoring
     * their input.
     */
    const convertInputValueToEnum = (): Enum | null => {
      const trimmedInputValue = inputValue.trim();

      if (trimmedInputValue.length) {
        const newEnum = convertTextToEnum(trimmedInputValue, enumType);

        if (newEnum === undefined || isValueAlreadySelected(newEnum)) {
          return null;
        }

        return newEnum;
      }
      return null;
    };

    const addInputValueToSelectedOptions = (): void => {
      const newEnum = convertInputValueToEnum();

      if (newEnum !== null) {
        setSelectedOptions([
          ...selectedOptions,
          {
            label: newEnum.name,
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
      newSelectedOptions: { value: Enum; label: string }[],
      actionChange: SelectActionData<{ value: Enum; label: string }>,
    ): void => {
      setSelectedOptions(newSelectedOptions);
      if (actionChange.action === 'select-option') {
        setInputValue('');
      } else if (
        actionChange.action === 'remove-value' &&
        actionChange.removedValue.value.name === inputValue
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

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
      event,
    ) => {
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
          .map((value) => convertTextToEnum(value, enumType))
          .filter(isNonNullable),
      ).filter((value) => !isValueAlreadySelected(value));
      setSelectedOptions([
        ...selectedOptions,
        ...newValues.map((value) => ({ label: value.name, value })),
      ]);
      event.preventDefault();
    };

    const copyValueToClipboard = async () =>
      navigator.clipboard.writeText(
        selectedOptions.map((option) => option.value.name).join(','),
      );

    const updateValueSpecAndSaveEdit = (): void => {
      const result = selectedOptions
        .map((value) => {
          const enumValueInstanceValue = new EnumValueInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(enumType)),
          );
          instanceValue_setValues(
            enumValueInstanceValue,
            [EnumValueExplicitReference.create(value.value)],
            observerContext,
          );
          return enumValueInstanceValue;
        })
        .filter(isNonNullable);
      instanceValue_setValues(valueSpecification, result, observerContext);
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
  },
);

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    observerContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      expectedType,
      className,
      setValueSpecification,
      selectorConfig,
      observerContext,
    } = props;

    const [editable, setEditable] = useState(false);
    const valueText = stringifyValue(valueSpecification.values);
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
        setValueSpecification(valueSpecification);
      }
    };

    if (editable) {
      return (
        <>
          <div className={clsx('value-spec-editor', className)}>
            {expectedType instanceof Enumeration ? (
              <EnumCollectionInstanceValueEditor
                valueSpecification={valueSpecification}
                observerContext={observerContext}
                saveEdit={saveEdit}
              />
            ) : (
              <PrimitiveCollectionInstanceValueEditor
                valueSpecification={valueSpecification}
                expectedType={expectedType}
                saveEdit={saveEdit}
                selectorConfig={selectorConfig}
                observerContext={observerContext}
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
              !isValidInstanceValue(valueSpecification),
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

const UnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="value-spec-editor--unsupported">unsupported</div>
);

const DateInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue | SimpleFunctionExpression;
    graph: PureModel;
    observerContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    handleBlur?: (() => void) | undefined;
    displayAsEditableValue?: boolean | undefined;
  }) => {
    const {
      valueSpecification,
      setValueSpecification,
      graph,
      observerContext,
      typeCheckOption,
      resetValue,
      handleBlur,
      displayAsEditableValue,
    } = props;

    return (
      <div className="value-spec-editor">
        <CustomDatePicker
          valueSpecification={valueSpecification}
          graph={graph}
          observerContext={observerContext}
          typeCheckOption={typeCheckOption}
          setValueSpecification={setValueSpecification}
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
  },
);

/**
 * TODO we should pass in the props `resetValueSpecification`. Reset
 * should be part of this editor. Also through here we can call `observe_` accordingly.
 *
 * See https://github.com/finos/legend-studio/pull/1021
 */
export const BasicValueSpecificationEditor = forwardRef<
  HTMLInputElement,
  {
    valueSpecification: ValueSpecification;
    graph: PureModel;
    observerContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    isConstant?: boolean | undefined;
    selectorConfig?: BasicValueSpecificationEditorSelectorConfig | undefined;
    handleBlur?: (() => void) | undefined;
    handleKeyDown?:
      | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
      | undefined;
    displayDateEditorAsEditableValue?: boolean | undefined;
  }
>(function BasicValueSpecificationEditor(props, ref) {
  const {
    className,
    valueSpecification,
    graph,
    observerContext,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    selectorConfig,
    isConstant,
    handleBlur,
    handleKeyDown,
    displayDateEditorAsEditableValue,
  } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            selectorConfig={selectorConfig}
            observerContext={observerContext}
            ref={ref}
            handleBlur={handleBlur}
            handleKeyDown={handleKeyDown}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            observerContext={observerContext}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.BINARY:
      case PRIMITIVE_TYPE.BYTE:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            observerContext={observerContext}
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
          <DateInstanceValueEditor
            valueSpecification={valueSpecification}
            graph={graph}
            observerContext={observerContext}
            typeCheckOption={typeCheckOption}
            className={className}
            setValueSpecification={setValueSpecification}
            resetValue={resetValue}
            handleBlur={handleBlur}
            displayAsEditableValue={displayDateEditorAsEditableValue}
          />
        );
      default:
        return <UnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
        setValueSpecification={setValueSpecification}
        observerContext={observerContext}
        handleBlur={handleBlur}
      />
    );
  } else if (
    valueSpecification instanceof CollectionInstanceValue &&
    valueSpecification.genericType
  ) {
    // NOTE: since when we fill in the arguments, `[]` (or `nullish` value in Pure)
    // is used for parameters we don't handle, we should not attempt to support empty collection
    // without generic type here as that  is equivalent to `[]`
    return (
      <CollectionValueInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        expectedType={typeCheckOption.expectedType}
        className={className}
        setValueSpecification={setValueSpecification}
        selectorConfig={selectorConfig}
        observerContext={observerContext}
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
      />
    );
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    if (isSubType(typeCheckOption.expectedType, PrimitiveType.DATE)) {
      if (isUsedDateFunctionSupportedInFormMode(valueSpecification)) {
        return (
          <DateInstanceValueEditor
            valueSpecification={valueSpecification}
            graph={graph}
            observerContext={observerContext}
            typeCheckOption={typeCheckOption}
            className={className}
            setValueSpecification={setValueSpecification}
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
            isInteger={
              simplifiedValue.genericType.value.rawType ===
              PrimitiveType.INTEGER
            }
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            observerContext={observerContext}
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
