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
  BasePopover,
  BaseRadioGroup,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  type PureModel,
  type Enum,
  type Type,
  type ValueSpecification,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  InstanceValue,
  GenericType,
  PrimitiveInstanceValue,
  GenericTypeExplicitReference,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  matchFunctionName,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { useEffect, useState } from 'react';
import {
  DAY_OF_WEEK,
  DURATION_UNIT,
  SUPPORTED_FUNCTIONS,
} from '../QueryBuilder_Const';
import { buildPrimitiveInstanceValue } from '../stores/QueryBuilderOperatorsHelper';
import {
  genericType_setRawType,
  instanceValue_changeValue,
} from '../stores/QueryBuilderValueSpecificationModifierHelper';

enum QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION {
  ABSOLUTE_DATE = 'Absolute Date',
  ABSOLUTE_TIME = 'Absolute Time',
  TODAY = 'Today',
  NOW = 'Now',
  YESTERDAY = 'Yesterday',
  ONE_YEAR_AGO = 'One Year Ago',
  ONE_MONTH_AGO = 'One Month Ago',
  ONE_WEEK_AGO = 'One Week Ago',
  CUSTOM_DATE = 'Custom Date',
  PREVIOUS_DAY_OF_WEEK = 'Previous ... of Week',
  FIRST_DAY_OF = 'First day of...',
  LATEST_DATE = 'Latest Date',
}

enum QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT {
  DAYS = 'Day(s)',
  WEEKS = 'Week(s)',
  MONTHS = 'Month(s)',
  YEARS = 'Year(s)',
}

enum QUERY_BUILDER_FIRST_DAY_OF_UNIT {
  WEEK = 'Week',
  MONTH = 'Month',
  QUARTER = 'Quarter',
  YEAR = 'Year',
}

enum QUERY_BUILDER_DAY_OF_WEEK {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WENDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

enum QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION {
  BEFORE = 'Before',
  AFTER = 'After',
}

enum QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT {
  TODAY = 'Today',
  NOW = 'Now',
  FIRST_DAY_OF_YEAR = 'Start of Year',
  FIRST_DAY_OF_QUARTER = 'Start of Quarter',
  FIRST_DAY_OF_MONTH = 'Start of Month',
  FIRST_DAY_OF_WEEK = 'Start of Week',
}

/**
 * DatePickerOption is the base class being used to display and generate the corresponding pure date function.
 */
class DatePickerOption {
  /**
   * label is the text that shows up in the valueSpecification box.
   */
  label: string;
  /**
   * value is the selected date option in date-dropdown.
   */
  value: string;

  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}

class CustomDateOption extends DatePickerOption {
  /**
   * duration is the amount of time span that will be adjusted.
   */
  duration: number;
  /**
   * unit represents the time duration unit, e.g. year, week, etc.
   */
  unit: QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT | undefined;
  /**
   * direction means the direction in which time adjustment will go to.
   */
  direction: QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION | undefined;
  /**
   * referenceMoment is the date which adjustment starts from.
   */
  referenceMoment:
    | QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT
    | undefined;

  constructor(
    label: string,
    value: string,
    duration: number,
    unit: QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT | undefined,
    direction: QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION | undefined,
    referenceMoment:
      | QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT
      | undefined,
  ) {
    super(label, value);
    this.duration = duration;
    this.unit = unit;
    this.direction = direction;
    this.referenceMoment = referenceMoment;
  }

  generateDisplayLabel(): string {
    return [
      this.duration,
      this.unit,
      this.direction,
      this.referenceMoment,
    ].join(' ');
  }

  updateLabel(): void {
    this.label = this.generateDisplayLabel();
  }
}

class CustomFirstDayOfOption extends DatePickerOption {
  /**
   * unit: time unit, e.g. Week, Month, etc.
   */
  unit: QUERY_BUILDER_FIRST_DAY_OF_UNIT | undefined;

  constructor(
    label: string,
    unit: QUERY_BUILDER_FIRST_DAY_OF_UNIT | undefined,
  ) {
    super(label, QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF);
    this.unit = unit;
  }
}

class CustomPreviousDayOfWeekOption extends DatePickerOption {
  /**
   * day: which day in the week will be selected.
   */
  day: QUERY_BUILDER_DAY_OF_WEEK;

  constructor(label: string, day: QUERY_BUILDER_DAY_OF_WEEK) {
    super(label, QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK);
    this.day = day;
  }
}

const reservedCustomDateOptions: CustomDateOption[] = [
  new CustomDateOption(
    'Yesterday',
    QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.YESTERDAY,
    1,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT.DAYS,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Week Ago',
    QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ONE_WEEK_AGO,
    1,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT.WEEKS,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Month Ago',
    QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ONE_MONTH_AGO,
    1,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT.MONTHS,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Year Ago',
    QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ONE_YEAR_AGO,
    1,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT.YEARS,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
];

/**
 * Generate pure date functions based on the DatePickerOption.
 */
const buildPureDateFunctionExpression = (
  datePickerOption: DatePickerOption,
  graph: PureModel,
): SimpleFunctionExpression => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const strictDate = graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE);
  const date = graph.getPrimitiveType(PRIMITIVE_TYPE.DATE);
  const dateTime = graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME);
  if (datePickerOption instanceof CustomPreviousDayOfWeekOption) {
    const previousFridaySFE = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK,
      multiplicityOne,
    );
    previousFridaySFE.genericType = GenericTypeExplicitReference.create(
      new GenericType(date),
    );
    const dayOfWeekEnumIntanceValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getType(DAY_OF_WEEK)),
      ),
      multiplicityOne,
    );
    dayOfWeekEnumIntanceValue.values.push(
      EnumValueExplicitReference.create(
        guaranteeNonNullable(
          graph
            .getEnumeration(DAY_OF_WEEK)
            .values.filter((e) => e.name === datePickerOption.day)[0],
        ),
      ),
    );
    previousFridaySFE.parametersValues.push(dayOfWeekEnumIntanceValue);
    return previousFridaySFE;
  } else if (datePickerOption instanceof CustomFirstDayOfOption) {
    switch (datePickerOption.unit) {
      case QUERY_BUILDER_FIRST_DAY_OF_UNIT.YEAR: {
        const firstDayOfYearSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
          multiplicityOne,
        );
        firstDayOfYearSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfYearSFE;
      }
      case QUERY_BUILDER_FIRST_DAY_OF_UNIT.QUARTER: {
        const firstDayOfQuarterSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
          multiplicityOne,
        );
        firstDayOfQuarterSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(strictDate),
        );
        return firstDayOfQuarterSFE;
      }
      case QUERY_BUILDER_FIRST_DAY_OF_UNIT.MONTH: {
        const firstDayOfMonthSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
          multiplicityOne,
        );
        firstDayOfMonthSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfMonthSFE;
      }
      case QUERY_BUILDER_FIRST_DAY_OF_UNIT.WEEK: {
        const firstDayOfWeekSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
          multiplicityOne,
        );
        firstDayOfWeekSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfWeekSFE;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't build expression for 'First Day Of ...' date picker option for unit '${datePickerOption.unit}'`,
        );
    }
  } else {
    switch (datePickerOption.value) {
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.TODAY: {
        const todaySFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.TODAY,
          multiplicityOne,
        );
        todaySFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(strictDate),
        );
        return todaySFE;
      }
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.NOW: {
        const nowSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.NOW,
          multiplicityOne,
        );
        nowSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(dateTime),
        );
        return nowSFE;
      }
      case QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_YEAR: {
        const firstDayOfYearSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
          multiplicityOne,
        );
        firstDayOfYearSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfYearSFE;
      }
      case QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER: {
        const firstDayOfQuarterSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
          multiplicityOne,
        );
        firstDayOfQuarterSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(strictDate),
        );
        return firstDayOfQuarterSFE;
      }
      case QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH: {
        const firstDayOfMonthSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
          multiplicityOne,
        );
        firstDayOfMonthSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfMonthSFE;
      }
      case QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK: {
        const firstDayOfWeekSFE = new SimpleFunctionExpression(
          SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
          multiplicityOne,
        );
        firstDayOfWeekSFE.genericType = GenericTypeExplicitReference.create(
          new GenericType(date),
        );
        return firstDayOfWeekSFE;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't build expression for date picker option '${datePickerOption.value}'`,
        );
    }
  }
};

/**
 * Generate the enum value of type Pure Enum, DURATION_UNIT, based on the input string.
 */
const buildPureDurationEnumValue = (
  unitString: string,
  graph: PureModel,
): Enum => {
  const durationUnitEnum = graph.getEnumeration(DURATION_UNIT);
  const targetPureDurationEnumValue = durationUnitEnum.values.filter(
    (e) =>
      e.name ===
      Object.keys(QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT).filter(
        (key) =>
          QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT[
            key as keyof typeof QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT
          ] === unitString,
      )[0],
  )[0];
  return (
    targetPureDurationEnumValue ??
    guaranteeNonNullable(durationUnitEnum.values[0])
  );
};

/**
 * Generate the pure date ajust() function based on the CustomDateOption.
 */
const buildPureAdjustDateFunction = (
  customDateOption: CustomDateOption,
  graph: PureModel,
): SimpleFunctionExpression => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const dateAdjustSimpleFunctionExpression = new SimpleFunctionExpression(
    SUPPORTED_FUNCTIONS.ADJUST,
    multiplicityOne,
  );
  dateAdjustSimpleFunctionExpression.parametersValues.push(
    buildPureDateFunctionExpression(
      new DatePickerOption(
        guaranteeNonNullable(customDateOption.referenceMoment),
        guaranteeNonNullable(customDateOption.referenceMoment),
      ),
      graph,
    ),
  );
  if (
    customDateOption.direction ===
    QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE
  ) {
    const minusFunc = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.MINUS,
      multiplicityOne,
    );
    minusFunc.parametersValues.push(
      buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.INTEGER,
        customDateOption.duration,
      ),
    );
    dateAdjustSimpleFunctionExpression.parametersValues.push(minusFunc);
  } else {
    const adjustmentInstanceValue = buildPrimitiveInstanceValue(
      graph,
      PRIMITIVE_TYPE.INTEGER,
      customDateOption.duration,
    );
    dateAdjustSimpleFunctionExpression.parametersValues.push(
      adjustmentInstanceValue,
    );
  }
  const durationUnitEnumIntanceValue = new EnumValueInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getType(DURATION_UNIT)),
    ),
    multiplicityOne,
  );
  durationUnitEnumIntanceValue.values.push(
    EnumValueExplicitReference.create(
      guaranteeNonNullable(
        buildPureDurationEnumValue(
          guaranteeNonNullable(customDateOption.unit),
          graph,
        ),
      ),
    ),
  );
  dateAdjustSimpleFunctionExpression.parametersValues.push(
    durationUnitEnumIntanceValue,
  );
  dateAdjustSimpleFunctionExpression.genericType =
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.DATE)),
    );
  return dateAdjustSimpleFunctionExpression;
};

/**
 * Generate the value of CustomDateOption.duration from the pure date adjust() function.
 */
const buildCustomDateOptionDurationValue = (
  pureDateAdjustFunction: SimpleFunctionExpression,
): number => {
  const durationParam = pureDateAdjustFunction.parametersValues[1];
  return durationParam instanceof PrimitiveInstanceValue
    ? (durationParam.values[0] as number)
    : durationParam instanceof SimpleFunctionExpression &&
      matchFunctionName(durationParam.functionName, SUPPORTED_FUNCTIONS.MINUS)
    ? durationParam.parametersValues[0] instanceof PrimitiveInstanceValue
      ? (durationParam.parametersValues[0].values[0] as number)
      : 0
    : 0;
};

/**
 * Generate the value of CustomDateOption.direction from the pure date adjust() function.
 */
const buildCustomDateOptionDirectionValue = (
  pureDateAdjustFunction: SimpleFunctionExpression,
): QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION =>
  pureDateAdjustFunction.parametersValues[1] instanceof
    SimpleFunctionExpression &&
  matchFunctionName(
    pureDateAdjustFunction.parametersValues[1].functionName,
    SUPPORTED_FUNCTIONS.MINUS,
  )
    ? QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE
    : QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.AFTER;

/**
 * Generate the value of CustomDateOption.unit from the pure date adjust() function.
 */
const buildCustomDateOptionUnitValue = (
  valueSpecification: SimpleFunctionExpression,
): QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT =>
  guaranteeNonNullable(
    Object.keys(QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT)
      .filter(
        (key) =>
          key ===
          (valueSpecification.parametersValues[2] as EnumValueInstanceValue)
            .values[0]?.value.name,
      )
      .map(
        (key) =>
          QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT[
            key as keyof typeof QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT
          ],
      )[0],
  );

/**
 * Generate the value of CustomDateOption.moment from the pure date adjust() function.
 */
const buildCustomDateOptionReferenceMomentValue = (
  pureDateAjustFunction: SimpleFunctionExpression,
): QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT => {
  const funcName = (
    pureDateAjustFunction.parametersValues[0] as SimpleFunctionExpression
  ).functionName;
  switch (funcName) {
    case SUPPORTED_FUNCTIONS.TODAY:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY;
    case SUPPORTED_FUNCTIONS.NOW:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.NOW;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_YEAR;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
      return QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK;
    default:
      throw new UnsupportedOperationError(
        `Can't build custom date option reference moment '${funcName}'`,
      );
  }
};

/**
 * Build CustomDateOption based on the pure date adjust() function.
 * Transform CustomDateOption if it matches any preserved custom adjust date functions. e.g. One Month Ago..
 */
const buildCustomDateOption = (
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue,
): CustomDateOption => {
  if (
    valueSpecification instanceof SimpleFunctionExpression &&
    matchFunctionName(
      valueSpecification.functionName,
      SUPPORTED_FUNCTIONS.ADJUST,
    )
  ) {
    const customDateOption = new CustomDateOption(
      '',
      QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
      buildCustomDateOptionDurationValue(valueSpecification),
      buildCustomDateOptionUnitValue(valueSpecification),
      buildCustomDateOptionDirectionValue(valueSpecification),
      buildCustomDateOptionReferenceMomentValue(valueSpecification),
    );
    const matchedPreservedCustomAdjustDates = reservedCustomDateOptions.filter(
      (t) =>
        t.generateDisplayLabel() === customDateOption.generateDisplayLabel(),
    );
    if (matchedPreservedCustomAdjustDates.length > 0) {
      customDateOption.label = guaranteeNonNullable(
        matchedPreservedCustomAdjustDates[0]?.label,
      );
      customDateOption.value = guaranteeNonNullable(
        matchedPreservedCustomAdjustDates[0]?.value,
      );
      return customDateOption;
    }
    customDateOption.updateLabel();
    return customDateOption;
  }
  return new CustomDateOption('', '', 0, undefined, undefined, undefined);
};

/**
 * Build DatePickerOption from pure date functions or PrimitiveInstanceValue
 */
const buildDatePickerOption = (
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue,
): DatePickerOption => {
  if (valueSpecification instanceof SimpleFunctionExpression) {
    switch (valueSpecification.functionName) {
      case SUPPORTED_FUNCTIONS.TODAY:
        return new DatePickerOption(
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.TODAY,
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.TODAY,
        );
      case SUPPORTED_FUNCTIONS.NOW:
        return new DatePickerOption(
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.NOW,
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.NOW,
        );
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR:
        return new CustomFirstDayOfOption(
          QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_YEAR,
          QUERY_BUILDER_FIRST_DAY_OF_UNIT.YEAR,
        );
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
        return new CustomFirstDayOfOption(
          QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER,
          QUERY_BUILDER_FIRST_DAY_OF_UNIT.QUARTER,
        );
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH:
        return new CustomFirstDayOfOption(
          QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH,
          QUERY_BUILDER_FIRST_DAY_OF_UNIT.MONTH,
        );
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
        return new CustomFirstDayOfOption(
          QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK,
          QUERY_BUILDER_FIRST_DAY_OF_UNIT.WEEK,
        );
      case SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK:
        return new CustomPreviousDayOfWeekOption(
          `Previous ${
            (valueSpecification.parametersValues[0] as EnumValueInstanceValue)
              .values[0]?.value.name
          }`,
          (valueSpecification.parametersValues[0] as EnumValueInstanceValue)
            .values[0]?.value.name as QUERY_BUILDER_DAY_OF_WEEK,
        );

      case SUPPORTED_FUNCTIONS.ADJUST:
        return buildCustomDateOption(valueSpecification);
      default:
        return new DatePickerOption('', '');
    }
  } else {
    return valueSpecification.genericType.value.rawType.path ===
      PRIMITIVE_TYPE.LATESTDATE
      ? new DatePickerOption(
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
          QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
        )
      : new DatePickerOption(
          valueSpecification.values[0] as string,
          valueSpecification.genericType.value.rawType.path ===
          PRIMITIVE_TYPE.DATETIME
            ? QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME
            : QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
        );
  }
};

const AbsoluteDateValueSpecificationEditor: React.FC<{
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue;
  graph: PureModel;
  updateValue: (val: ValueSpecification) => void;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}> = (props) => {
  const { valueSpecification, graph, updateValue, setDatePickerOption } = props;
  const absoluteDateValue =
    valueSpecification instanceof SimpleFunctionExpression
      ? ''
      : (valueSpecification.values[0] as string);
  const updateAbsoluteDateValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (valueSpecification instanceof SimpleFunctionExpression) {
      updateValue(
        buildPrimitiveInstanceValue(
          graph,
          PRIMITIVE_TYPE.STRICTDATE,
          event.target.value,
        ),
      );
    } else if (valueSpecification instanceof InstanceValue) {
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
    setDatePickerOption(
      new DatePickerOption(
        event.target.value,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
      ),
    );
  };
  return (
    <div className="query-builder-value-spec-editor__date-picker__absolute-date">
      <input
        className="panel__content__form__section__input query-builder-value-spec-editor__date-picker__absolute-date__input input--dark"
        type="date"
        spellCheck={false}
        value={absoluteDateValue}
        onChange={updateAbsoluteDateValue}
      />
    </div>
  );
};

const AbsoluteTimeValueSpecificationEditor: React.FC<{
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue;
  graph: PureModel;
  updateValue: (val: ValueSpecification) => void;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}> = (props) => {
  const { valueSpecification, graph, updateValue, setDatePickerOption } = props;
  const absoluteTimeValue =
    valueSpecification instanceof SimpleFunctionExpression
      ? ''
      : (valueSpecification.values[0] as string);
  const updateAbsoluteTimeValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (valueSpecification instanceof SimpleFunctionExpression) {
      updateValue(
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
    setDatePickerOption(
      new DatePickerOption(
        event.target.value,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
      ),
    );
  };
  return (
    <div className="query-builder-value-spec-editor__date-picker__absolute-date">
      <input
        className="panel__content__form__section__input query-builder-value-spec-editor__date-picker__absolute-date__input input--dark"
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

const CustomDateInstanceValueEditor: React.FC<{
  customDateOptionValue: CustomDateOption;
  graph: PureModel;
  updateValue: (val: ValueSpecification) => void;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}> = (props) => {
  const { customDateOptionValue, graph, updateValue, setDatePickerOption } =
    props;
  const [durationValue, setDurationValue] = useState(
    customDateOptionValue.duration,
  );
  const [unitValue, setUnitValue] = useState(
    (customDateOptionValue.unit as string) ??
      QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT.DAYS,
  );
  const [directionValue, setDirectionValue] = useState(
    (customDateOptionValue.direction as string) ??
      QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
  );
  const [referenceMomentValue, setReferenceMomentValueValue] = useState(
    (customDateOptionValue.referenceMoment as string) ??
      QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  );
  const changeValue = (
    latestDurationValue: number,
    latestUnitValue: string,
    latestDirectionValue: string,
    latestReferenceMomentValue: string,
  ): void => {
    if (
      latestDurationValue !== 0 &&
      latestUnitValue !== '' &&
      latestDirectionValue !== '' &&
      latestReferenceMomentValue !== ''
    ) {
      const dateOption = new CustomDateOption(
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        latestDurationValue,
        latestUnitValue as QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT,
        latestDirectionValue as QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION,
        latestReferenceMomentValue as QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
      );
      updateValue(buildPureAdjustDateFunction(dateOption, graph));
      const matchedPreservedCustomAdjustDates =
        reservedCustomDateOptions.filter(
          (t) => t.generateDisplayLabel() === dateOption.generateDisplayLabel(),
        );
      if (matchedPreservedCustomAdjustDates.length > 0) {
        dateOption.label = guaranteeNonNullable(
          matchedPreservedCustomAdjustDates[0]?.label,
        );
        dateOption.value = guaranteeNonNullable(
          matchedPreservedCustomAdjustDates[0]?.value,
        );
      } else {
        dateOption.updateLabel();
      }
      setDatePickerOption(dateOption);
    }
  };
  const changeDurationValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const duration =
      event.target.value !== '' ? parseInt(event.target.value) : 0;
    setDurationValue(duration);
    changeValue(duration, unitValue, directionValue, referenceMomentValue);
  };

  return (
    <div className="query-builder-value-spec-editor__date-picker__custom-date">
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <input
          className="query-builder-value-spec-editor__date-picker__custom-date__input-text-editor input--dark"
          spellCheck={false}
          value={durationValue}
          type="number"
          onChange={changeDurationValue}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          placeholder="Unit"
          className="query-builder-value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(QUERY_BUILDER_CUSTOM_DATE_OPTION_UNIT).map(
            (t) => ({
              value: t.toString(),
              label: t.toString(),
            }),
          )}
          onChange={(val: { label: string; value: string }): void => {
            setUnitValue(val.value);
            changeValue(
              durationValue,
              val.value,
              directionValue,
              referenceMomentValue,
            );
          }}
          value={{ value: unitValue, label: unitValue }}
          darkMode={true}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(
            QUERY_BUILDER_CUSTOM_DATE_OPTION_DIRECTION,
          ).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string }): void => {
            setDirectionValue(val.value);
            changeValue(
              durationValue,
              unitValue,
              val.value,
              referenceMomentValue,
            );
          }}
          value={{ value: directionValue, label: directionValue }}
          darkMode={true}
        />
      </div>
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          className="query-builder-value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(
            QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
          ).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string }): void => {
            setReferenceMomentValueValue(val.value);
            changeValue(durationValue, unitValue, directionValue, val.value);
          }}
          value={{ value: referenceMomentValue, label: referenceMomentValue }}
          darkMode={true}
        />
      </div>
    </div>
  );
};

const CustomFirstDayOfValueSpecificationEditor: React.FC<{
  customDateAdjustOptionValue: DatePickerOption;
  graph: PureModel;
  updateValue: (val: ValueSpecification) => void;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}> = (props) => {
  const {
    customDateAdjustOptionValue,
    graph,
    updateValue,
    setDatePickerOption,
  } = props;
  const [unitValue, setUnitValue] = useState(
    customDateAdjustOptionValue instanceof CustomFirstDayOfOption
      ? (customDateAdjustOptionValue.unit as string)
      : null,
  );
  const changeValue = (latestUnitValue: string): void => {
    if (latestUnitValue !== '') {
      const targetUnitValue = Object.values(
        QUERY_BUILDER_CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
      ).filter((moment) => moment.toString().includes(latestUnitValue));
      const startDayOfDateOption =
        targetUnitValue.length > 0
          ? new CustomFirstDayOfOption(
              guaranteeNonNullable(targetUnitValue[0]?.toString()),
              latestUnitValue as QUERY_BUILDER_FIRST_DAY_OF_UNIT,
            )
          : new CustomFirstDayOfOption('', undefined);
      updateValue(buildPureDateFunctionExpression(startDayOfDateOption, graph));
      setDatePickerOption(startDayOfDateOption);
    }
  };

  return (
    <div className="query-builder-value-spec-editor__date-picker__custom-date">
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          placeholder="Choose a unit..."
          className="query-builder-value-spec-editor__date-picker__custom-date__input-dropdown query-builder-value-spec-editor__date-picker__custom-date__input-dropdown--full"
          options={Object.values(QUERY_BUILDER_FIRST_DAY_OF_UNIT).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string } | null): void => {
            if (val) {
              setUnitValue(val.value);
              changeValue(val.value);
            }
          }}
          value={unitValue ? { value: unitValue, label: unitValue } : null}
          darkMode={true}
        />
      </div>
    </div>
  );
};

const CustomPreviousDayOfWeekValueSpecificationEditor: React.FC<{
  customDateAdjustOptionValue: DatePickerOption;
  graph: PureModel;
  updateValue: (val: ValueSpecification) => void;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}> = (props) => {
  const {
    customDateAdjustOptionValue,
    graph,
    updateValue,
    setDatePickerOption,
  } = props;
  const [dayOfWeekValue, setDayOfWeekValue] = useState(
    customDateAdjustOptionValue instanceof CustomPreviousDayOfWeekOption
      ? (customDateAdjustOptionValue.day as string)
      : null,
  );
  const changeValue = (latestDurationUnitValue: string): void => {
    if (latestDurationUnitValue !== '') {
      const previousDayOfWeekDateOption = new CustomPreviousDayOfWeekOption(
        `Previous ${latestDurationUnitValue}`,
        latestDurationUnitValue as QUERY_BUILDER_DAY_OF_WEEK,
      );
      updateValue(
        buildPureDateFunctionExpression(previousDayOfWeekDateOption, graph),
      );
      setDatePickerOption(previousDayOfWeekDateOption);
    }
  };

  return (
    <div className="query-builder-value-spec-editor__date-picker__custom-date">
      <div className="query-builder-value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          placeholder="Choose a day..."
          className="query-builder-value-spec-editor__date-picker__custom-date__input-dropdown query-builder-value-spec-editor__date-picker__custom-date__input-dropdown--full"
          options={Object.values(QUERY_BUILDER_DAY_OF_WEEK).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string } | null): void => {
            if (val) {
              setDayOfWeekValue(val.value);
              changeValue(val.value);
            }
          }}
          value={
            dayOfWeekValue
              ? { value: dayOfWeekValue, label: dayOfWeekValue }
              : null
          }
          darkMode={true}
        />
      </div>
    </div>
  );
};

export const QueryBuilderCustomDatePicker: React.FC<{
  valueSpecification: PrimitiveInstanceValue | SimpleFunctionExpression;
  graph: PureModel;
  typeCheckOption: {
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
  updateValue: (val: ValueSpecification) => void;
}> = (props) => {
  const { valueSpecification, updateValue, graph, typeCheckOption } = props;
  // For some cases where types need to be matched strictly.
  // Some options need to be filtered out for DateTime.
  const targetQueryBuilderDateOptionsEnum = typeCheckOption.match
    ? Object.values([
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.NOW,
      ])
    : Object.values(QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION);
  const [datePickerOption, setDatePickerOption] = useState(
    buildDatePickerOption(valueSpecification),
  );

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const openCustomDatePickerPopover = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget);
  };
  const handleEnter = (): void => {
    setDatePickerOption(buildDatePickerOption(valueSpecification));
  };
  const closeCustomDatePickerPopover = (): void => {
    setDatePickerOption(buildDatePickerOption(valueSpecification));
    setAnchorEl(null);
  };
  const handleDatePickerOptionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const chosenDatePickerOption = new DatePickerOption(
      (event.target as HTMLInputElement).value,
      (event.target as HTMLInputElement).value,
    );
    if (
      QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.LATEST_DATE ===
      chosenDatePickerOption.value
    ) {
      updateValue(
        buildPrimitiveInstanceValue(
          graph,
          PRIMITIVE_TYPE.LATESTDATE,
          event.target.value,
        ),
      );
    } else if (
      // Elements in this list will trigger children date components
      ![
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF,
        QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK,
      ].includes(
        chosenDatePickerOption.value as QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION,
      )
    ) {
      const theReservedCustomDateOption = reservedCustomDateOptions.filter(
        (d) => d.value === chosenDatePickerOption.value,
      );
      theReservedCustomDateOption.length > 0
        ? updateValue(
            buildPureAdjustDateFunction(
              guaranteeNonNullable(theReservedCustomDateOption[0]),
              graph,
            ),
          )
        : updateValue(
            buildPureDateFunctionExpression(chosenDatePickerOption, graph),
          );
    }
    setDatePickerOption(chosenDatePickerOption);
  };
  const renderChildrenDateComponents = (): React.ReactNode => {
    switch (datePickerOption.value) {
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE:
        return (
          <AbsoluteDateValueSpecificationEditor
            graph={graph}
            valueSpecification={valueSpecification}
            updateValue={updateValue}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME:
        return (
          <AbsoluteTimeValueSpecificationEditor
            graph={graph}
            valueSpecification={valueSpecification}
            updateValue={updateValue}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE:
        return (
          <CustomDateInstanceValueEditor
            graph={graph}
            customDateOptionValue={buildCustomDateOption(valueSpecification)}
            updateValue={updateValue}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF:
        return (
          <CustomFirstDayOfValueSpecificationEditor
            graph={graph}
            customDateAdjustOptionValue={buildDatePickerOption(
              valueSpecification,
            )}
            updateValue={updateValue}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case QUERY_BUILDER_CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK:
        return (
          <CustomPreviousDayOfWeekValueSpecificationEditor
            graph={graph}
            customDateAdjustOptionValue={buildDatePickerOption(
              valueSpecification,
            )}
            updateValue={updateValue}
            setDatePickerOption={setDatePickerOption}
          />
        );
      default:
        return null;
    }
  };

  // make sure the date picker label is updated when the value is reset or changed somehow
  useEffect(() => {
    setDatePickerOption(buildDatePickerOption(valueSpecification));
  }, [valueSpecification]);

  return (
    <>
      <button
        className="query-builder-value-spec-editor__date-picker__trigger"
        title="Click to edit and pick from more date options"
        onClick={openCustomDatePickerPopover}
      >
        {datePickerOption.label}
      </button>
      <BasePopover
        open={Boolean(anchorEl)}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        anchorEl={anchorEl}
        onClose={closeCustomDatePickerPopover}
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
          value={datePickerOption.value}
          onChange={handleDatePickerOptionChange}
          row={true}
          options={targetQueryBuilderDateOptionsEnum}
          size={2}
        />
        {renderChildrenDateComponents()}
      </BasePopover>
    </>
  );
};
