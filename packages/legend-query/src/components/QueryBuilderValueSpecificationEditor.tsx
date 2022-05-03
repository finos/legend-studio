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
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  type TooltipPlacement,
  Tooltip,
  CustomSelectorInput,
  InfoCircleIcon,
  PencilIcon,
  DollarIcon,
  CheckSquareIcon,
  SquareIcon,
  SaveIcon,
  BasePopover,
  BaseRadioGroup,
} from '@finos/legend-art';
import {
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uniq,
} from '@finos/legend-shared';
import CSVParser from 'papaparse';
import {
  type PureModel,
  type Enum,
  type Type,
  type ValueSpecification,
  LATEST_DATE,
  Enumeration,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
  CollectionInstanceValue,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import { getMultiplicityDescription } from './shared/QueryBuilderUtils';
import { buildPrimitiveInstanceValue } from '../stores/QueryBuilderOperatorsHelper';
import {
  genericType_setRawType,
  instanceValue_changeValue,
  instanceValue_changeValues,
} from '../stores/QueryBuilderValueSpecificationModifierHelper';
import {
  type CustomDateOption,
  QUERY_BUILDER_DATE_DURATION_UNIT_LABEL,
  generateDateFunctionExpression,
  QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION,
  QUERY_BUILDER_DATE_ADJUSTMENT,
  QUERY_BUILDER_DATE_OPTION,
  generateCustomAjustDateOption,
  generateDateOption,
  reservedCustomDates,
  generateDateOptionForStartDayOfDateOption,
  QUERY_BUILDER_DATE_DURATION_UNIT,
  generateDateAdjustFunctionFromDateOption,
  QUERY_BUILDER_DAY_OF_WEEK,
} from '../stores/QueryBuilderDateTimeHelper';

type TypeCheckOption = {
  expectedType: Type;
  // The match flag represents if a strict type match is forced or not.
  // If match is true, it means that options in the date-capability-dropdown
  // that are not of the same type or of child types will be filtered out or not.
  match?: boolean;
};

type CustomDateInputOption = {
  label: string;
  value: string;
};

const QueryBuilderDateOptionsInfoTooltip: React.FC<{
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { children, placement } = props;
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__value">
              More date options will be available by clicking the left button
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const QueryBuilderParameterInfoTooltip: React.FC<{
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
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">
              {type?.name ?? ''}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Var Name</div>
            <div className="query-builder__tooltip__item__value">
              {variable.name}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Multiplicity
            </div>
            <div className="query-builder__tooltip__item__value">
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

export const VariableExpressionParameterEditor = observer(
  (props: {
    valueSpecification: VariableExpression;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const varName = valueSpecification.name;
    return (
      <div
        className={clsx(
          'query-builder-value-spec-editor__parameter',
          className,
        )}
      >
        <div className="query-builder-value-spec-editor__parameter__icon">
          <DollarIcon />
        </div>
        <div className="query-builder-value-spec-editor__parameter__label">
          <div className="query-builder-value-spec-editor__parameter__text">
            {varName}
          </div>
          <QueryBuilderParameterInfoTooltip variable={valueSpecification}>
            <div className="query-builder-value-spec-editor__parameter__info">
              <InfoCircleIcon />
            </div>
          </QueryBuilderParameterInfoTooltip>
        </div>
      </div>
    );
  },
);

const StringPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      instanceValue_changeValue(valueSpecification, event.target.value, 0);

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          value={value}
          placeholder={value === '' ? '(empty)' : undefined}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void =>
      instanceValue_changeValue(valueSpecification, !value, 0);

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <button
          className={clsx('query-builder-value-spec-editor__toggler__btn', {
            'query-builder-value-spec-editor__toggler__btn--toggled': value,
          })}
          onClick={toggleValue}
        >
          {value ? <CheckSquareIcon /> : <SquareIcon />}
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
  }) => {
    const { valueSpecification, isInteger, className } = props;
    const value = valueSpecification.values[0] as number;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      let inputVal = isInteger
        ? parseInt(event.target.value, 10)
        : parseFloat(event.target.value);
      inputVal = isNaN(inputVal) ? 0 : inputVal;
      instanceValue_changeValue(valueSpecification, inputVal, 0);
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          type="number"
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

export const DatePrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      instanceValue_changeValue(valueSpecification, event.target.value, 0);
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          type="date"
          spellCheck={false}
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

export const DateTimePrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      instanceValue_changeValue(valueSpecification, event.target.value, 0);
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          // Despite its name this would actually allow us to register time in UTC
          // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#setting_timezones
          type="datetime-local"
          spellCheck={false}
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: EnumValueInstanceValue;
    className?: string | undefined;
  }) => {
    const { valueSpecification, className } = props;
    const enumValueRef = guaranteeNonNullable(valueSpecification.values[0]);
    const enumValue = enumValueRef.value;
    const options = enumValue.owner.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const changeValue = (val: { value: Enum; label: string }): void => {
      instanceValue_changeValue(
        valueSpecification,
        EnumValueExplicitReference.create(val.value),
        0,
      );
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__enum-selector"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
      </div>
    );
  },
);

const stringifyValue = (values: ValueSpecification[]): string => {
  if (values.length === 0) {
    return '';
  }
  return CSVParser.unparse([
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
  graph: PureModel,
  expectedType: Type,
  value: string,
): void => {
  if (value.trim().length === 0) {
    instanceValue_changeValues(valueSpecification, []);
    return;
  }
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  let result: unknown[] = [];
  const parseResult = CSVParser.parse<string[]>(value.trim(), {
    delimiter: ',',
  });
  const parseData = parseResult.data[0] as string[]; // only take the first line
  if (parseResult.errors.length) {
    if (
      parseResult.errors[0] &&
      parseResult.errors[0].code === 'UndetectableDelimiter' &&
      parseResult.errors[0].type === 'Delimiter' &&
      parseResult.data.length === 1
    ) {
      // NOTE: this happens when the user only put one item in the value input
      // we can go the other way by ensure the input has a comma but this is arguably neater
      // as it tinkers with the parser
    } else {
      // there were some parsing error, escape
      // NOTE: ideally, we could show a warning here
      return;
    }
  } else if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.STRING: {
        result = uniq(parseData)
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
              multiplicityOne,
            );
            primitiveInstanceValue.values = [item.toString()];
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
              multiplicityOne,
            );
            primitiveInstanceValue.values = [item];
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
        const _enum = returnUndefOnError(() => expectedType.getValue(item));
        if (!_enum) {
          return undefined;
        }
        const enumValueInstanceValue = new EnumValueInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(expectedType)),
          multiplicityOne,
        );
        enumValueInstanceValue.values = [
          EnumValueExplicitReference.create(_enum),
        ];
        return enumValueInstanceValue;
      })
      .filter(isNonNullable);
  }
  instanceValue_changeValues(valueSpecification, result);
};

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
  }) => {
    const { valueSpecification, graph, expectedType, className } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(stringifyValue(valueSpecification.values));
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
      setEditable(false);
      setCollectionValue(valueSpecification, graph, expectedType, text);
      setText(stringifyValue(valueSpecification.values));
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setText(event.target.value);

    // focus the input box when edit is enabled
    useEffect(() => {
      if (editable) {
        inputRef.current?.focus();
      }
    }, [editable]);

    if (editable) {
      return (
        <div className={clsx('query-builder-value-spec-editor', className)}>
          <input
            ref={inputRef}
            className="panel__content__form__section__input query-builder-value-spec-editor__input"
            spellCheck={false}
            value={text}
            placeholder={text === '' ? '(empty)' : undefined}
            onChange={changeValue}
          />
          <button
            className="query-builder-value-spec-editor__list-editor__save-button btn--dark"
            onClick={saveEdit}
          >
            <SaveIcon />
          </button>
        </div>
      );
    }
    return (
      <div
        className={clsx('query-builder-value-spec-editor', className)}
        onClick={enableEdit}
        title="Click to edit"
      >
        <input
          className="query-builder-value-spec-editor__list-editor__preview"
          spellCheck={false}
          value={previewText}
          disabled={true}
        />
        <button className="query-builder-value-spec-editor__list-editor__edit-icon">
          <PencilIcon />
        </button>
      </div>
    );
  },
);

export const QueryBuilderUnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="query-builder-value-spec-editor--unsupported">
    unsupported
  </div>
);

export const LatestDatePrimitiveInstanceValueEditor: React.FC = () => (
  <div className="query-builder-value-spec-editor__latest-date">
    {LATEST_DATE}
  </div>
);

export const AbsoluteDateValueSpecificationEditor: React.FC<{
  graph: PureModel;
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue;
  updateValueSpecification: (val: ValueSpecification) => void;
  setDateOptionValue: Dispatch<SetStateAction<CustomDateOption>>;
}> = (props) => {
  const {
    graph,
    valueSpecification,
    updateValueSpecification,
    setDateOptionValue,
  } = props;
  const absoluteDateValue =
    valueSpecification instanceof SimpleFunctionExpression
      ? ''
      : (valueSpecification.values[0] as string);
  const updateAbsoluteDateValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (valueSpecification instanceof SimpleFunctionExpression) {
      updateValueSpecification(
        buildPrimitiveInstanceValue(
          graph,
          PRIMITIVE_TYPE.STRICTDATE,
          event.target.value,
        ),
      );
    } else {
      instanceValue_changeValue(valueSpecification, event.target.value, 0);
      if (
        valueSpecification.genericType.value.rawType.path !==
        PRIMITIVE_TYPE.STRICTDATE
      ) {
        genericType_setRawType(
          valueSpecification.genericType.value,
          graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE),
        );
      }
    }
    setDateOptionValue({
      label: event.target.value,
      value: QUERY_BUILDER_DATE_OPTION.ABSOLUTE_DATE,
    });
  };
  return (
    <div className="query-builder-value-spec-editor__date-option-dropdown__absolute-date">
      <div className="query-builder-value-spec-editor__date-option-dropdown__absolute-date__label">
        Date
      </div>
      <input
        className="panel__content__form__section__input query-builder-value-spec-editor__input"
        type="date"
        spellCheck={false}
        value={absoluteDateValue}
        onChange={updateAbsoluteDateValue}
      />
    </div>
  );
};

export const AbsoluteTimeValueSpecificationEditor: React.FC<{
  graph: PureModel;
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue;
  updateValueSpecification: (val: ValueSpecification) => void;
  setDateOptionValue: Dispatch<SetStateAction<CustomDateOption>>;
}> = (props) => {
  const {
    graph,
    valueSpecification,
    updateValueSpecification,
    setDateOptionValue,
  } = props;
  const absoluteTimeValue =
    valueSpecification instanceof SimpleFunctionExpression
      ? ''
      : (valueSpecification.values[0] as string);
  const updateAbsoluteTimeValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (valueSpecification instanceof SimpleFunctionExpression) {
      updateValueSpecification(
        buildPrimitiveInstanceValue(
          graph,
          PRIMITIVE_TYPE.DATETIME,
          event.target.value,
        ),
      );
    } else {
      instanceValue_changeValue(valueSpecification, event.target.value, 0);
      if (
        valueSpecification.genericType.value.rawType.path !==
        PRIMITIVE_TYPE.DATETIME
      ) {
        genericType_setRawType(
          valueSpecification.genericType.value,
          graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME),
        );
      }
    }
    setDateOptionValue({
      label: event.target.value,
      value: QUERY_BUILDER_DATE_OPTION.ABSOLUTE_TIME,
    });
  };
  return (
    <div className="query-builder-value-spec-editor__date-option-dropdown__absolute-date">
      <div className="query-builder-value-spec-editor__date-option-dropdown__absolute-date__label">
        DateTime
      </div>
      <input
        className="panel__content__form__section__input query-builder-value-spec-editor__input"
        // Despite its name this would actually allow us to register time in UTC
        // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#setting_timezones
        type="datetime-local"
        spellCheck={false}
        value={absoluteTimeValue}
        onChange={updateAbsoluteTimeValue}
      />
    </div>
  );
};

export const CustomDateInstanceValueEditor: React.FC<{
  graph: PureModel;
  customAdjustDateOptionValue: CustomDateOption;
  updateValueSpecification: (val: ValueSpecification) => void;
  setDateOptionValue: Dispatch<SetStateAction<CustomDateOption>>;
}> = (props) => {
  const {
    graph,
    customAdjustDateOptionValue,
    updateValueSpecification,
    setDateOptionValue,
  } = props;

  const [durationRangeValue, setDurationRangeValue] = useState(
    customAdjustDateOptionValue.durationRange ?? '',
  );
  const [durationUnitValue, setDurationUnitValue] = useState(
    customAdjustDateOptionValue.unit ?? '',
  );
  const [adjustmentValue, setAdjustmentValue] = useState(
    customAdjustDateOptionValue.adjustment ?? '',
  );
  const [startDateValue, setStartDateValue] = useState(
    customAdjustDateOptionValue.startDate ?? '',
  );
  const updateValue = (
    latestDurationRangeValue: string,
    latestDurationUnitValue: string,
    latestAdjustmentValue: string,
    latestStartDateValue: string,
  ): void => {
    if (
      latestDurationRangeValue !== '' &&
      latestDurationUnitValue !== '' &&
      latestAdjustmentValue !== '' &&
      latestStartDateValue !== ''
    ) {
      const dateOption: CustomDateOption = {
        label: QUERY_BUILDER_DATE_OPTION.CUSTOM_DATE,
        value: QUERY_BUILDER_DATE_OPTION.CUSTOM_DATE,
        durationRange: latestDurationRangeValue,
        unit: latestDurationUnitValue,
        adjustment: latestAdjustmentValue,
        startDate: latestStartDateValue,
      };
      updateValueSpecification(
        generateDateAdjustFunctionFromDateOption(dateOption, graph),
      );
      const matchedPreservedCustomAdjustDates = reservedCustomDates.filter(
        (t) =>
          guaranteeNonNullable(t.adjustment) +
            guaranteeNonNullable(t.durationRange) +
            guaranteeNonNullable(t.startDate) +
            guaranteeNonNullable(t.unit) ===
          (dateOption.adjustment ?? '') +
            dateOption.durationRange +
            dateOption.startDate +
            dateOption.unit,
      );
      if (matchedPreservedCustomAdjustDates.length > 0) {
        dateOption.label = guaranteeNonNullable(
          matchedPreservedCustomAdjustDates[0]?.label,
        );
        dateOption.value = guaranteeNonNullable(
          matchedPreservedCustomAdjustDates[0]?.value,
        );
      } else {
        dateOption.label = [
          latestDurationRangeValue,
          latestDurationUnitValue,
          latestAdjustmentValue,
          latestStartDateValue,
        ].join(' ');
      }
      setDateOptionValue({ ...dateOption });
    }
  };
  const changeDurationNumberValue: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => {
    setDurationRangeValue(event.target.value);
    updateValue(
      event.target.value,
      durationUnitValue,
      adjustmentValue,
      startDateValue,
    );
  };

  return (
    <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date">
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          Number
        </div>
        <input
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-text-editor"
          spellCheck={false}
          value={durationRangeValue}
          type="number"
          onChange={changeDurationNumberValue}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          Unit
        </div>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-dropdown"
          options={Object.values(QUERY_BUILDER_DATE_DURATION_UNIT_LABEL).map(
            (t) => ({ value: t.toString(), label: t.toString() }),
          )}
          onChange={(durationUnit: CustomDateInputOption): void => {
            setDurationUnitValue(durationUnit.value);
            updateValue(
              durationRangeValue,
              durationUnit.value,
              adjustmentValue,
              startDateValue,
            );
          }}
          value={{ value: durationUnitValue, label: durationUnitValue }}
          darkMode={true}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          Before/After
        </div>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-dropdown"
          options={Object.values(QUERY_BUILDER_DATE_ADJUSTMENT).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(adjustment: CustomDateInputOption): void => {
            setAdjustmentValue(adjustment.value);
            updateValue(
              durationRangeValue,
              durationUnitValue,
              adjustment.value,
              startDateValue,
            );
          }}
          value={{ value: adjustmentValue, label: adjustmentValue }}
          darkMode={true}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          When
        </div>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-dropdown"
          options={Object.values(
            QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION,
          ).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(startDate: CustomDateInputOption): void => {
            setStartDateValue(startDate.value);
            updateValue(
              durationRangeValue,
              durationUnitValue,
              adjustmentValue,
              startDate.value,
            );
          }}
          value={{ value: startDateValue, label: startDateValue }}
          darkMode={true}
        />
      </div>
    </div>
  );
};

export const CustomStartDayOfDateValueSpecificationEditor: React.FC<{
  graph: PureModel;
  customDateAdjustOptionValue: CustomDateOption;
  updateValueSpecification: (val: ValueSpecification) => void;
  setDateOptionValue: Dispatch<SetStateAction<CustomDateOption>>;
}> = (props) => {
  const {
    graph,
    customDateAdjustOptionValue,
    updateValueSpecification,
    setDateOptionValue,
  } = props;

  const [durationUnitValue, setDurationUnitValue] = useState(
    customDateAdjustOptionValue.unit &&
      Object.values(QUERY_BUILDER_DATE_DURATION_UNIT).filter(
        (c) => c.toString() === customDateAdjustOptionValue.unit,
      ).length > 0
      ? customDateAdjustOptionValue.unit
      : '',
  );
  const updateValue = (latestDurationUnitValue: string): void => {
    if (latestDurationUnitValue !== '') {
      const startDayOfDateOption = generateDateOptionForStartDayOfDateOption(
        latestDurationUnitValue,
      );
      updateValueSpecification(
        generateDateFunctionExpression(graph, startDayOfDateOption),
      );
      setDateOptionValue({
        label: startDayOfDateOption.label,
        value: QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE,
        unit: latestDurationUnitValue,
      });
    }
  };

  return (
    <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date">
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          When
        </div>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-dropdown"
          options={Object.values(QUERY_BUILDER_DATE_DURATION_UNIT).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(durationUnit: CustomDateInputOption): void => {
            setDurationUnitValue(durationUnit.value);
            updateValue(durationUnit.value);
          }}
          value={{ value: durationUnitValue, label: durationUnitValue }}
          darkMode={true}
        />
      </div>
    </div>
  );
};

export const CustomPreviousDayOfWeekValueSpecificationEditor: React.FC<{
  graph: PureModel;
  customDateAdjustOptionValue: CustomDateOption;
  updateValueSpecification: (val: ValueSpecification) => void;
  setDateOptionValue: Dispatch<SetStateAction<CustomDateOption>>;
}> = (props) => {
  const {
    graph,
    customDateAdjustOptionValue,
    updateValueSpecification,
    setDateOptionValue,
  } = props;

  const [dayOfWeekValue, setDayOfWeekValue] = useState(
    customDateAdjustOptionValue.unit &&
      Object.values(QUERY_BUILDER_DAY_OF_WEEK).filter(
        (c) => c.toString() === customDateAdjustOptionValue.unit,
      ).length > 0
      ? customDateAdjustOptionValue.unit
      : '',
  );
  const updateValue = (latestDurationUnitValue: string): void => {
    if (latestDurationUnitValue !== '') {
      const previousDayOfWeekDateOption = {
        label: `Previous ${latestDurationUnitValue}`,
        value: QUERY_BUILDER_DATE_OPTION.PREVIOUS_DAY_OF_WEEK,
        unit: latestDurationUnitValue,
      };
      updateValueSpecification(
        generateDateFunctionExpression(graph, previousDayOfWeekDateOption),
      );
      setDateOptionValue({ ...previousDayOfWeekDateOption });
    }
  };

  return (
    <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date">
      <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input">
        <div className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-label">
          Day of Week
        </div>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-option-dropdown__custom-date__input-dropdown"
          options={Object.values(QUERY_BUILDER_DAY_OF_WEEK).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(durationUnit: CustomDateInputOption): void => {
            setDayOfWeekValue(durationUnit.value);
            updateValue(durationUnit.value);
          }}
          value={{ value: dayOfWeekValue, label: dayOfWeekValue }}
          darkMode={true}
        />
      </div>
    </div>
  );
};

export const DateInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue | SimpleFunctionExpression;
    graph: PureModel;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    updateValueSpecification: (val: ValueSpecification) => void;
  }) => {
    const {
      valueSpecification,
      updateValueSpecification,
      graph,
      typeCheckOption,
      className,
    } = props;
    const strictDate = graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE);
    const date = graph.getPrimitiveType(PRIMITIVE_TYPE.DATE);
    const dateTime = graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME);
    const latestDate = graph.getPrimitiveType(PRIMITIVE_TYPE.LATESTDATE);
    // For some cases where types need to be matched strictly.
    // Some options need to be filtered out for DateTime.
    const targetQueryBuilderDateOptionsEnum = typeCheckOption.match
      ? Object.values([
          QUERY_BUILDER_DATE_OPTION.ABSOLUTE_TIME,
          QUERY_BUILDER_DATE_OPTION.NOW,
        ])
      : Object.values(QUERY_BUILDER_DATE_OPTION);
    const [dateOptionValue, setDateOptionValue] = useState(
      generateDateOption(valueSpecification),
    );
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const openDateOptionsPopover = (
      event: React.MouseEvent<HTMLButtonElement>,
    ): void => {
      setAnchorEl(event.currentTarget);
    };
    const handleCloseDateOptionsPopover = (): void => {
      setAnchorEl(null);
    };
    const handleDateOptionChange = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      const currentDateOptionValue = (event.target as HTMLInputElement).value;
      dateOptionValue.label = currentDateOptionValue;
      dateOptionValue.value = currentDateOptionValue;
      if (
        currentDateOptionValue !== QUERY_BUILDER_DATE_OPTION.ABSOLUTE_DATE &&
        currentDateOptionValue !== QUERY_BUILDER_DATE_OPTION.ABSOLUTE_TIME &&
        currentDateOptionValue !== QUERY_BUILDER_DATE_OPTION.CUSTOM_DATE &&
        currentDateOptionValue !==
          QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE &&
        currentDateOptionValue !==
          QUERY_BUILDER_DATE_OPTION.PREVIOUS_DAY_OF_WEEK
      ) {
        const theReservedCustomDate = reservedCustomDates.filter(
          (d) => d.value === currentDateOptionValue,
        );
        theReservedCustomDate.length > 0
          ? updateValueSpecification(
              generateDateAdjustFunctionFromDateOption(
                guaranteeNonNullable(theReservedCustomDate[0]),
                graph,
              ),
            )
          : updateValueSpecification(
              generateDateFunctionExpression(graph, dateOptionValue),
            );
      }
      setDateOptionValue({ ...dateOptionValue });
    };
    const renderMoreDateComponents = (): JSX.Element => {
      switch (dateOptionValue.value) {
        case QUERY_BUILDER_DATE_OPTION.CUSTOM_DATE:
          return (
            <CustomDateInstanceValueEditor
              graph={graph}
              customAdjustDateOptionValue={generateCustomAjustDateOption(
                valueSpecification,
              )}
              updateValueSpecification={updateValueSpecification}
              setDateOptionValue={setDateOptionValue}
            />
          );
        case QUERY_BUILDER_DATE_OPTION.ABSOLUTE_DATE:
          return (
            <AbsoluteDateValueSpecificationEditor
              graph={graph}
              valueSpecification={valueSpecification}
              updateValueSpecification={updateValueSpecification}
              setDateOptionValue={setDateOptionValue}
            />
          );
        case QUERY_BUILDER_DATE_OPTION.ABSOLUTE_TIME:
          return (
            <AbsoluteTimeValueSpecificationEditor
              graph={graph}
              valueSpecification={valueSpecification}
              updateValueSpecification={updateValueSpecification}
              setDateOptionValue={setDateOptionValue}
            />
          );
        case QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE:
          return (
            <CustomStartDayOfDateValueSpecificationEditor
              graph={graph}
              customDateAdjustOptionValue={generateDateOption(
                valueSpecification,
              )}
              updateValueSpecification={updateValueSpecification}
              setDateOptionValue={setDateOptionValue}
            />
          );
        case QUERY_BUILDER_DATE_OPTION.PREVIOUS_DAY_OF_WEEK:
          return (
            <CustomPreviousDayOfWeekValueSpecificationEditor
              graph={graph}
              customDateAdjustOptionValue={generateDateOption(
                valueSpecification,
              )}
              updateValueSpecification={updateValueSpecification}
              setDateOptionValue={setDateOptionValue}
            />
          );
        default:
          return <></>;
      }
    };

    return (
      <div className="query-builder-value-spec-editor__date">
        {typeCheckOption.expectedType === strictDate && (
          <DatePrimitiveInstanceValueEditor
            valueSpecification={valueSpecification as PrimitiveInstanceValue}
            className={className}
          />
        )}
        {typeCheckOption.expectedType === latestDate && (
          <LatestDatePrimitiveInstanceValueEditor />
        )}
        {(typeCheckOption.expectedType === date ||
          typeCheckOption.expectedType === dateTime) && (
          <div className="query-builder-value-spec-editor__date-option-dropdown">
            <button
              className="query-builder-value-spec-editor__date-option-dropdown__button"
              onClick={openDateOptionsPopover}
            >
              {/* for the reset icon to work*/}
              {generateDateOption(valueSpecification).label}
            </button>
            <QueryBuilderDateOptionsInfoTooltip>
              <div className="query-builder-value-spec-editor__date-option-dropdown__info-icon">
                <InfoCircleIcon />
              </div>
            </QueryBuilderDateOptionsInfoTooltip>
            <BasePopover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleCloseDateOptionsPopover}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <BaseRadioGroup
                value={dateOptionValue.value}
                onChange={handleDateOptionChange}
                row={true}
                options={targetQueryBuilderDateOptionsEnum}
                size={2}
              />
              {renderMoreDateComponents()}
            </BasePopover>
          </div>
        )}
      </div>
    );
  },
);

/**
 * TODO we should pass in the props `setValueSpecification` and `resetValueSpecification`. Reset
 * should be part of this editor. Also through here we can call `observe_` accordingly.
 *
 * See https://github.com/finos/legend-studio/pull/1021
 */
export const QueryBuilderValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  typeCheckOption: TypeCheckOption;
  className?: string | undefined;
  updateValueSpecification: (val: ValueSpecification) => void;
}> = (props) => {
  const {
    valueSpecification,
    updateValueSpecification,
    graph,
    typeCheckOption,
    className,
  } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            className={className}
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
            typeCheckOption={typeCheckOption}
            className={className}
            updateValueSpecification={updateValueSpecification}
          />
        );
      default:
        return <QueryBuilderUnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
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
      />
    );
  }
  // property expression
  else if (valueSpecification instanceof VariableExpression) {
    return (
      <VariableExpressionParameterEditor
        valueSpecification={valueSpecification}
        className={className}
      />
    );
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return (
      <QueryBuilderValueSpecificationEditor
        valueSpecification={valueSpecification.getValue()}
        graph={graph}
        typeCheckOption={typeCheckOption}
        updateValueSpecification={updateValueSpecification}
      />
    );
  } else if (
    valueSpecification instanceof SimpleFunctionExpression &&
    (typeCheckOption.expectedType.path === PRIMITIVE_TYPE.DATE ||
      typeCheckOption.expectedType.path === PRIMITIVE_TYPE.DATETIME)
  ) {
    return (
      <DateInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        typeCheckOption={typeCheckOption}
        className={className}
        updateValueSpecification={updateValueSpecification}
      />
    );
  }
  return <QueryBuilderUnsupportedValueSpecificationEditor />;
};
