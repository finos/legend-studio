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
  type TooltipPlacement,
  type InputActionData,
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
  FilledWindowMaximizeIcon,
  BasePopover,
  PanelFormSection,
  CalculateIcon,
} from '@finos/legend-art';
import {
  type Enum,
  type Type,
  type ValueSpecification,
  type PureModel,
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
  getEnumValue,
  getMultiplicityDescription,
  type ObserverContext,
  matchFunctionName,
  isSubType,
} from '@finos/legend-graph';
import {
  type DebouncedFunc,
  type GeneratorFn,
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uniq,
  parseCSVString,
  guaranteeIsNumber,
  csvStringify,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { CustomDatePicker } from './CustomDatePicker.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import { simplifyValueExpression } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { evaluate } from 'mathjs';

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
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    selectorConfig?:
      | {
          values: string[] | undefined;
          isLoading: boolean;
          reloadValues:
            | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
            | undefined;
          cleanUpReloadValues?: () => void;
        }
      | undefined;
    obseverContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      selectorConfig,
      obseverContext,
    } = props;
    const useSelector = Boolean(selectorConfig);
    const applicationStore = useApplicationStore();
    const value = valueSpecification.values[0] as string;
    const updateValueSpec = (val: string): void => {
      instanceValue_setValue(valueSpecification, val, 0, obseverContext);
      setValueSpecification(valueSpecification);
    };
    const changeInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      updateValueSpec(event.target.value);
    };
    // custom select
    const selectedValue = { value: value, label: value };
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

    return (
      <div className={clsx('value-spec-editor', className)}>
        {useSelector ? (
          <CustomSelectorInput
            className="value-spec-editor__enum-selector"
            options={queryOptions}
            onChange={changeValue}
            value={selectedValue}
            inputValue={value}
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
          />
        ) : (
          <input
            className="panel__content__form__section__input value-spec-editor__input"
            spellCheck={false}
            value={value}
            placeholder={value === '' ? '(empty)' : undefined}
            onChange={changeInputValue}
          />
        )}
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
    obseverContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      obseverContext,
    } = props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void => {
      instanceValue_setValue(valueSpecification, !value, 0, obseverContext);
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
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    isInteger: boolean;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
    obseverContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      isInteger,
      className,
      resetValue,
      setValueSpecification,
      obseverContext,
    } = props;
    const [value, setValue] = useState(
      (valueSpecification.values[0] as number).toString(),
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const numericValue = isInteger
      ? Number.parseInt(Number(value).toString(), 10)
      : Number(value);

    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setValue(event.target.value);
    };

    // Support expression evaluation
    const calculateExpression = (): void => {
      if (isNaN(numericValue)) {
        try {
          const calculatedValue = guaranteeIsNumber(evaluate(value));
          setValue(
            isInteger
              ? Number.parseInt(calculatedValue.toString(), 10).toString()
              : Number(calculatedValue).toString(),
          );
        } catch {
          setValue((valueSpecification.values[0] as number).toString());
        }
      } else {
        setValue(numericValue.toString());
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
      setValue((valueSpecification.values[0] as number).toString());
    }, [valueSpecification]);

    useEffect(() => {
      if (
        !isNaN(numericValue) &&
        numericValue !== valueSpecification.values[0]
      ) {
        instanceValue_setValue(
          valueSpecification,
          numericValue,
          0,
          obseverContext,
        );
        setValueSpecification(valueSpecification);
      }
    }, [
      numericValue,
      valueSpecification,
      setValueSpecification,
      obseverContext,
    ]);

    return (
      <div className={clsx('value-spec-editor', className)}>
        <div className="value-spec-editor__number__input-container">
          <input
            ref={inputRef}
            className="panel__content__form__section__input value-spec-editor__input value-spec-editor__number__input"
            spellCheck={false}
            type="text" // NOTE: we leave this as text so that we can support expression evaluation
            inputMode="numeric"
            value={value}
            onChange={changeValue}
            onBlur={calculateExpression}
            onKeyDown={onKeyDown}
          />
          <div className="value-spec-editor__number__actions">
            <button
              className="value-spec-editor__number__action"
              title="Evaluate Expression (Enter)"
              onClick={calculateExpression}
            >
              <CalculateIcon />
            </button>
          </div>
        </div>
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: EnumValueInstanceValue;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    obseverContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      obseverContext,
    } = props;
    const enumValueRef = guaranteeNonNullable(valueSpecification.values[0]);
    const enumValue = enumValueRef.value;
    const options = enumValue._OWNER.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const changeValue = (val: { value: Enum; label: string }): void => {
      instanceValue_setValue(
        valueSpecification,
        EnumValueExplicitReference.create(val.value),
        0,
        obseverContext,
      );
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <CustomSelectorInput
          className="value-spec-editor__enum-selector"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
        <button
          className="value-spec-editor__reset-btn"
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

/**
 * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
 * we silently remove values which are not valid or parsable. But perhaps, we can consider
 * passing in logger or notifier to show give the users some idea of what went wrong instead
 * of silently swallow parts of their inputs like this.
 */
const setCollectionValue = (
  valueSpecification: CollectionInstanceValue,
  expectedType: Type,
  value: string,
  obseverContext: ObserverContext,
): void => {
  if (value.trim().length === 0) {
    instanceValue_setValues(valueSpecification, [], obseverContext);
    return;
  }
  let result: unknown[] = [];

  const parseData = parseCSVString(value);

  if (!parseData) {
    return;
  }

  if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.STRING: {
        result = uniq(parseData)
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(
              primitiveInstanceValue,
              [item.toString()],
              obseverContext,
            );
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER: {
        result = uniq(
          parseData
            .filter((val) => !isNaN(Number(val)))
            .map((val) => Number(val)),
        )
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(
              primitiveInstanceValue,
              [item],
              obseverContext,
            );
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE: {
        result = uniq(
          parseData
            .filter((val) => !isNaN(Date.parse(val)))
            .map((val) => val.trim()),
        )
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(
              primitiveInstanceValue,
              [item],
              obseverContext,
            );
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      case PRIMITIVE_TYPE.DATETIME: {
        result = uniq(
          parseData
            .filter(
              (val) =>
                (!isNaN(Date.parse(val)) && new Date(val).getTime()) ||
                (val.includes('%') &&
                  !isNaN(Date.parse(val.slice(1))) &&
                  new Date(val.slice(1)).getTime()),
            )
            .map((val) => val.trim()),
        )
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(
              primitiveInstanceValue,
              [item],
              obseverContext,
            );
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      default:
        // unsupported expected type, just escape
        return;
    }
  } else if (expectedType instanceof Enumeration) {
    result = uniq(parseData.map((item) => item.trim()))
      .map((item): EnumValueInstanceValue | undefined => {
        const _enum = returnUndefOnError(() =>
          getEnumValue(expectedType, item),
        );
        if (!_enum) {
          return undefined;
        }
        const enumValueInstanceValue = new EnumValueInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(expectedType)),
        );
        instanceValue_setValues(
          enumValueInstanceValue,
          [EnumValueExplicitReference.create(_enum)],
          obseverContext,
        );
        return enumValueInstanceValue;
      })
      .filter(isNonNullable);
  }
  instanceValue_setValues(valueSpecification, result, obseverContext);
};

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const getPlaceHolder = (expectedType: Type): string => {
  if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
        return 'yyyy-mm-dd';
      case PRIMITIVE_TYPE.DATETIME:
        return 'yyyy-mm-ddThh:mm:ss';
      default:
        return '(empty)';
    }
  }
  return '(empty)';
};

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
    obseverContext: ObserverContext;
  }) => {
    const {
      valueSpecification,
      expectedType,
      className,
      resetValue,
      setValueSpecification,
      obseverContext,
    } = props;
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [text, setText] = useState(stringifyValue(valueSpecification.values));
    const [editable, setEditable] = useState(false);
    const [showAdvancedEditorPopover, setShowAdvancedEditorPopover] =
      useState(false);
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
        setShowAdvancedEditorPopover(false);
        setCollectionValue(
          valueSpecification,
          expectedType,
          text,
          obseverContext,
        );
        setText(stringifyValue(valueSpecification.values));
        setValueSpecification(valueSpecification);
      }
    };

    const changeValueTextArea: React.ChangeEventHandler<HTMLTextAreaElement> = (
      event,
    ) => {
      setText(event.target.value);
    };
    const expandButtonName = `${valueSpecification.hashCode}ExpandButton`;
    const handleOnBlur: React.FocusEventHandler<HTMLTextAreaElement> = (
      event,
    ) => {
      // disable save if target is expand button
      if (
        (event.relatedTarget as HTMLButtonElement | undefined)?.name !==
        expandButtonName
      ) {
        saveEdit();
      }
    };

    const placeholder = text === '' ? getPlaceHolder(expectedType) : undefined;

    // focus the input box when edit is enabled
    useEffect(() => {
      if (editable) {
        inputRef.current?.focus();
      }
    }, [editable]);

    if (editable) {
      return (
        <>
          {showAdvancedEditorPopover && (
            <BasePopover
              onClose={() => setShowAdvancedEditorPopover(false)}
              open={showAdvancedEditorPopover}
              anchorEl={inputRef.current}
            >
              <textarea
                className="panel__content__form__section__input value-spec-editor__list-editor__textarea"
                spellCheck={false}
                value={text}
                placeholder={placeholder}
                onChange={changeValueTextArea}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    saveEdit();
                  }
                }}
              />
              <PanelFormSection>
                <div className="value-spec-editor__list-editor__textarea__description">
                  Hit Enter to Apply Change
                </div>
              </PanelFormSection>
            </BasePopover>
          )}
          <div className={clsx('value-spec-editor', className)}>
            <textarea
              ref={inputRef}
              className={clsx(
                'panel__content__form__section__input value-spec-editor__input value-spec-editor__textarea ',
              )}
              spellCheck={false}
              value={text}
              placeholder={placeholder}
              onChange={changeValueTextArea}
              onKeyDown={(event): void => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  saveEdit();
                }
              }}
              onBlur={handleOnBlur}
            />
            <button
              className="value-spec-editor__list-editor__expand-button btn--dark"
              onClick={() => setShowAdvancedEditorPopover(true)}
              tabIndex={-1}
              name={expandButtonName}
              title="Expand window..."
            >
              <FilledWindowMaximizeIcon />
            </button>
            <button
              className="value-spec-editor__list-editor__save-button btn--dark"
              onClick={saveEdit}
            >
              <SaveIcon />
            </button>
            <button
              className="value-spec-editor__reset-btn"
              title="Reset"
              onClick={resetValue}
            >
              <RefreshIcon />
            </button>
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
        <div className="value-spec-editor__list-editor__preview">
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
    obseverContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    hasOptionalValue?: boolean | undefined;
  }) => {
    const {
      valueSpecification,
      setValueSpecification,
      graph,
      obseverContext,
      typeCheckOption,
      resetValue,
      hasOptionalValue,
    } = props;

    return (
      <div className="value-spec-editor">
        <CustomDatePicker
          valueSpecification={valueSpecification}
          graph={graph}
          observerContext={obseverContext}
          typeCheckOption={typeCheckOption}
          setValueSpecification={setValueSpecification}
          hasOptionalValue={hasOptionalValue}
        />
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
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
export const BasicValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  obseverContext: ObserverContext;
  typeCheckOption: TypeCheckOption;
  className?: string | undefined;
  setValueSpecification: (val: ValueSpecification) => void;
  resetValue: () => void;
  isConstant?: boolean;
  selectorConfig?:
    | {
        values: string[] | undefined;
        isLoading: boolean;
        reloadValues:
          | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
          | undefined;
        cleanUpReloadValues?: () => void;
      }
    | undefined;
  hasOptionalValue?: boolean | undefined;
}> = (props) => {
  const {
    className,
    valueSpecification,
    graph,
    obseverContext,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    selectorConfig,
    isConstant,
    hasOptionalValue,
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
            obseverContext={obseverContext}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            obseverContext={obseverContext}
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
            obseverContext={obseverContext}
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
            obseverContext={obseverContext}
            typeCheckOption={typeCheckOption}
            className={className}
            setValueSpecification={setValueSpecification}
            resetValue={resetValue}
            hasOptionalValue={hasOptionalValue}
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
        obseverContext={obseverContext}
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
        resetValue={resetValue}
        setValueSpecification={setValueSpecification}
        obseverContext={obseverContext}
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
        obseverContext={obseverContext}
        typeCheckOption={typeCheckOption}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
      />
    );
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    if (isSubType(typeCheckOption.expectedType, PrimitiveType.DATE)) {
      return (
        <DateInstanceValueEditor
          valueSpecification={valueSpecification}
          graph={graph}
          obseverContext={obseverContext}
          typeCheckOption={typeCheckOption}
          className={className}
          setValueSpecification={setValueSpecification}
          resetValue={resetValue}
          hasOptionalValue={hasOptionalValue}
        />
      );
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
        obseverContext,
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
            obseverContext={obseverContext}
          />
        );
      }
    }
  }

  return <UnsupportedValueSpecificationEditor />;
};
