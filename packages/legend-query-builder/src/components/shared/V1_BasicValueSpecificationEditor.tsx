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
  Enumeration,
  PrimitiveType,
  type V1_ValueSpecification,
  type PureModel,
  type Type,
  type Enum,
  type ObserverContext,
  V1_PrimitiveValueSpecification,
  V1_Collection,
  V1_EnumValue,
  V1_CInteger,
  V1_CString,
  V1_CBoolean,
  V1_CDateTime,
  V1_CStrictDate,
  V1_CLatestDate,
  V1_Variable,
  getMultiplicityDescription,
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
  at,
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
import { evaluate } from 'mathjs';

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
  expectedType: Type;
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

// String primitive value editor
const V1_StringPrimitiveInstanceValueEditor = observer(
  forwardRef<
    HTMLInputElement | SelectComponent,
    {
      valueSpecification: V1_CString;
      className?: string | undefined;
      setValueSpecification: (val: V1_ValueSpecification) => void;
      resetValue: () => void;
      selectorConfig?:
        | V1_BasicValueSpecificationEditorSelectorConfig
        | undefined;
      observerContext: ObserverContext;
      handleBlur?: (() => void) | undefined;
      handleKeyDown?: React.KeyboardEventHandler<HTMLDivElement> | undefined;
    }
  >(function V1_StringPrimitiveInstanceValueEditor(props, ref) {
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

    const applicationStore = useApplicationStore();

    const updateValueSpec = (val: string): void => {
      // Using a similar pattern to the original implementation
      // Note: V1 protocol doesn't have instanceValue_setValue helper, so we use direct assignment
      // but follow the same pattern of updating and then calling setValueSpecification
      valueSpecification.value = val;
      setValueSpecification(valueSpecification);
    };

    const changeInputValue = (val: string): void => {
      updateValueSpec(val);
      handleBlur?.();
    };

    const changeValue = (val: { value: string; label: string }): void => {
      updateValueSpec(val.value);
      handleBlur?.();
    };

    const handleInputChange = (
      newInputValue: string,
      actionChange: InputActionData,
    ): void => {
      if (actionChange.action === 'input-change') {
        selectorConfig?.reloadValues?.cancel();
        const reloadValuesFuncTransformation =
          selectorConfig?.reloadValues?.(newInputValue);
        if (reloadValuesFuncTransformation) {
          flowResult(reloadValuesFuncTransformation).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
      if (actionChange.action === 'input-blur') {
        selectorConfig?.reloadValues?.cancel();
        selectorConfig?.cleanUpReloadValues?.();
      }
    };

    const queryOptions = selectorConfig?.values?.map((e) => ({
      value: e,
      label: e.toString(),
    }));

    const noOptionsMessage = selectorConfig?.isLoading
      ? 'Loading...'
      : undefined;

    const resetButtonName = `reset-${valueSpecification.accept_ValueSpecificationVisitor}`;
    const inputName = `input-${valueSpecification.accept_ValueSpecificationVisitor}`;

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
        {Boolean(selectorConfig) ? (
          <CustomSelectorInput
            className="value-spec-editor__string-selector"
            options={queryOptions}
            onChange={changeValue}
            onInputChange={handleInputChange}
            onKeyDown={
              handleKeyDown as React.KeyboardEventHandler<HTMLDivElement>
            }
            value={
              valueSpecification.value
                ? {
                    value: valueSpecification.value,
                    label: valueSpecification.value,
                  }
                : null
            }
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            hasError={false}
            placeholder="Add"
            autoFocus={true}
            inputRef={ref as React.Ref<SelectComponent>}
            inputName={inputName}
            menuIsOpen={
              selectorConfig !== undefined &&
              valueSpecification.value !== undefined &&
              valueSpecification.value.length >=
                DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH
            }
            isLoading={selectorConfig?.isLoading}
            noMatchMessage={noOptionsMessage}
          />
        ) : (
          <InputWithInlineValidation
            className="panel__content__form__section__input value-spec-editor__input"
            spellCheck={false}
            value={valueSpecification.value ?? ''}
            placeholder={
              valueSpecification.value === '' ? '(empty)' : undefined
            }
            onChange={(e) => changeInputValue(e.target.value)}
            ref={ref as React.Ref<HTMLInputElement>}
            error={false ? 'Invalid String value' : undefined}
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

// Boolean primitive value editor
const V1_BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: V1_CBoolean;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    resetValue: () => void;
    observerContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      observerContext,
    } = props;

    const toggleValue = (): void => {
      // Using a similar pattern to the original implementation
      // Note: V1 protocol doesn't have instanceValue_setValue helper, so we use direct assignment
      // but follow the same pattern of updating and then calling setValueSpecification
      valueSpecification.value = !valueSpecification.value;
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <div
          className="value-spec-editor__boolean-selector"
          onClick={toggleValue}
        >
          {valueSpecification.value ? <CheckSquareIcon /> : <SquareIcon />}
        </div>
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

// Number primitive value editor
const V1_NumberPrimitiveInstanceValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      valueSpecification: V1_CInteger;
      isInteger: boolean;
      className?: string | undefined;
      setValueSpecification: (val: V1_ValueSpecification) => void;
      resetValue: () => void;
      observerContext: ObserverContext;
      handleBlur?: (() => void) | undefined;
      handleKeyDown?:
        | ((event: React.KeyboardEvent<HTMLInputElement>) => void)
        | undefined;
    }
  >(function V1_NumberPrimitiveInstanceValueEditor(props, ref) {
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
    const [value, setValue] = useState<string | null>(
      valueSpecification.value !== undefined
        ? valueSpecification.value.toString()
        : null,
    );
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
    const numericValue = value
      ? isInteger
        ? Number.parseInt(Number(value).toString(), 10)
        : Number(value)
      : null;

    const updateValueSpecIfValid = (): void => {
      if (value !== null) {
        const parsedValue = isInteger
          ? Number.parseInt(Number(value).toString(), 10)
          : Number(value);
        if (
          !Number.isNaN(parsedValue) &&
          parsedValue !== valueSpecification.value
        ) {
          // Using a similar pattern to the original implementation
          // Note: V1 protocol doesn't have instanceValue_setValue helper, so we use direct assignment
          // but follow the same pattern of updating and then calling setValueSpecification
          valueSpecification.value = parsedValue;
          setValueSpecification(valueSpecification);
        } else {
          setValue(
            valueSpecification.value !== undefined
              ? valueSpecification.value.toString()
              : null,
          );
        }
      }
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      setValue(event.target.value);
    };

    const calculateExpression = (): void => {
      try {
        if (value !== null) {
          const prevValue = value;
          const result = evaluate(value);
          if (typeof result === 'number') {
            setValue(result.toString());
            valueSpecification.value = result;
            setValueSpecification(valueSpecification);
          } else {
            setValue(prevValue);
          }
        }
      } catch (error) {
        // do nothing
      }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        calculateExpression();
        handleKeyDown?.(event);
      }
    };

    const valueFromValueSpec =
      valueSpecification.value !== undefined
        ? valueSpecification.value.toString()
        : '';

    useEffect(() => {
      if (value !== valueFromValueSpec) {
        setValue(valueFromValueSpec);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueFromValueSpec]);

    const resetButtonName = `reset-${valueSpecification.accept_ValueSpecificationVisitor}`;
    const calculateButtonName = `calculate-${valueSpecification.accept_ValueSpecificationVisitor}`;

    const onBlur = (
      event: React.FocusEvent<HTMLInputElement, HTMLButtonElement>,
    ): void => {
      if (
        event.relatedTarget?.name !== resetButtonName &&
        event.relatedTarget?.name !== calculateButtonName
      ) {
        updateValueSpecIfValid();
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
                  numericValue === null && value !== null && value !== '',
              },
            )}
            spellCheck={false}
            type="text" // NOTE: we leave this as text so that we can support expression evaluation
            inputMode="numeric"
            value={value ?? ''}
            onChange={handleInputChange}
            onBlur={calculateExpression}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              onKeyDown(event);
              handleKeyDown?.(event);
            }}
            name={`input-${valueSpecification.accept_ValueSpecificationVisitor}`}
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
            return (val as unknown as any).value;
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
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
    setValueSpecification: (val: V1_ValueSpecification) => void;
    selectorConfig?: V1_BasicValueSpecificationEditorSelectorConfig | undefined;
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
    graph: PureModel;
    observerContext: ObserverContext;
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
      graph,
      observerContext,
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
    observerContext: ObserverContext;
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
  }
>(function V1_BasicValueSpecificationEditor(props, ref) {
  const {
    className,
    valueSpecification,
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

  // Handle different types of value specifications
  if (valueSpecification instanceof V1_CString) {
    return (
      <V1_StringPrimitiveInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
        selectorConfig={selectorConfig}
        observerContext={observerContext}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
        ref={ref}
      />
    );
  } else if (valueSpecification instanceof V1_CBoolean) {
    return (
      <V1_BooleanPrimitiveInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
        observerContext={observerContext}
      />
    );
  } else if (valueSpecification instanceof V1_CInteger) {
    return (
      <V1_NumberPrimitiveInstanceValueEditor
        valueSpecification={valueSpecification}
        isInteger={true}
        className={className}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
        observerContext={observerContext}
        handleBlur={handleBlur}
        handleKeyDown={handleKeyDown}
        ref={ref}
      />
    );
  } else if (
    valueSpecification instanceof V1_CDateTime ||
    valueSpecification instanceof V1_CStrictDate ||
    valueSpecification instanceof V1_CLatestDate
  ) {
    return (
      <V1_DateInstanceValueEditor
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
  } else if (valueSpecification instanceof V1_EnumValue) {
    // return (
    //   <V1_EnumValueInstanceValueEditor
    //     valueSpecification={valueSpecification}
    //     className={className}
    //     resetValue={resetValue}
    //     setValueSpecification={setValueSpecification}
    //     observerContext={observerContext}
    //     handleBlur={handleBlur}
    //   />
    // );
  } else if (valueSpecification instanceof V1_Collection) {
    return (
      <V1_CollectionValueInstanceValueEditor
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

  // Default case for unsupported value specifications
  return <V1_UnsupportedValueSpecificationEditor />;
});
