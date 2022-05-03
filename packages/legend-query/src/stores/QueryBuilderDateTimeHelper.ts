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
  type Enum,
  type PureModel,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  DAY_OF_WEEK,
  DURATION_UNIT,
  SUPPORTED_FUNCTIONS,
} from '../QueryBuilder_Const';
import { buildPrimitiveInstanceValue } from './QueryBuilderOperatorsHelper';

/**
 * CustomDateOption is being used to display and generate the corresponding pure date function.
 * @label is the text that shows up in the valueSpecification box.
 * @value is the selected value in date-dropdown.
 * @durationRange, @unit, @adjustment, and @startDate are the components of pure date adjust() function.
 */
export type CustomDateOption = {
  label: string;
  value: string;
  durationRange?: string | undefined;
  unit?: string | undefined;
  adjustment?: string | undefined;
  startDate?: string | undefined;
};

export const QUERY_BUILDER_RESERVED_DATETIME_OPERATOR_FUNCTION_TO_LABEL =
  new Map([
    [SUPPORTED_FUNCTIONS.IS_AFTER_DAY, ['>']],
    [SUPPORTED_FUNCTIONS.IS_BEFORE_DAY, ['<']],
    [SUPPORTED_FUNCTIONS.IS_ON_DAY, ['is', 'is not']],
    [SUPPORTED_FUNCTIONS.IS_ON_OR_AFTER_DAY, ['>=']],
    [SUPPORTED_FUNCTIONS.IS_ON_OR_BEFORE_DAY, ['<=']],
  ]);

export enum QUERY_BUILDER_DATE_OPTION {
  TODAY = 'Today',
  NOW = 'Now',
  YESTERDAY = 'Yesterday',
  ONE_YEAR_AGO = 'One Year Ago',
  ONE_MONTH_AGO = 'One Month Ago',
  ONE_WEEK_AGO = 'One Week Ago',
  ABSOLUTE_DATE = 'Absolute Date',
  ABSOLUTE_TIME = 'Absolute Time',
  CUSTOM_DATE = 'Custom Date',
  PREVIOUS_DAY_OF_WEEK = 'Previous ... of Week',
  START_DAY_OF_DATE = 'Start of...',
}

export enum QUERY_BUILDER_DATE_DURATION_UNIT_LABEL {
  DAYS = 'Day(s)',
  WEEKS = 'Week(s)',
  MONTHS = 'Month(s)',
  YEARS = 'Year(s)',
}

export enum QUERY_BUILDER_DATE_DURATION_UNIT {
  WEEK = 'Week',
  MONTH = 'Month',
  QUARTER = 'Quarter',
  YEAR = 'Year',
}

export enum QUERY_BUILDER_DAY_OF_WEEK {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WENDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export enum QUERY_BUILDER_DATE_ADJUSTMENT {
  BEFORE = 'Before',
  AFTER = 'After',
}

export enum QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION {
  TODAY = 'Today',
  NOW = 'Now',
  START_OF_YEAR = 'Start of Year',
  START_OF_QUARTER = 'Start of Quarter',
  START_OF_MONTH = 'Start of Month',
  START_OF_WEEK = 'Start of Week',
}

export const reservedCustomDates: CustomDateOption[] = [
  {
    label: 'Yesterday',
    value: QUERY_BUILDER_DATE_OPTION.YESTERDAY,
    durationRange: '1',
    unit: QUERY_BUILDER_DATE_DURATION_UNIT_LABEL.DAYS,
    adjustment: QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE,
    startDate: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.TODAY,
  },
  {
    label: 'One Week Ago',
    value: QUERY_BUILDER_DATE_OPTION.ONE_WEEK_AGO,
    durationRange: '1',
    unit: QUERY_BUILDER_DATE_DURATION_UNIT_LABEL.WEEKS,
    adjustment: QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE,
    startDate: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.TODAY,
  },
  {
    label: 'One Month Ago',
    value: QUERY_BUILDER_DATE_OPTION.ONE_MONTH_AGO,
    durationRange: '1',
    unit: QUERY_BUILDER_DATE_DURATION_UNIT_LABEL.MONTHS,
    adjustment: QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE,
    startDate: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.TODAY,
  },
  {
    label: 'One Year Ago',
    value: QUERY_BUILDER_DATE_OPTION.ONE_YEAR_AGO,
    durationRange: '1',
    unit: QUERY_BUILDER_DATE_DURATION_UNIT_LABEL.YEARS,
    adjustment: QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE,
    startDate: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.TODAY,
  },
];

// Generate pure date functions based on the CustomDateOption.
export const generateDateFunctionExpression = (
  graph: PureModel,
  dateOptionValue: CustomDateOption,
): SimpleFunctionExpression => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const strictDate = graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE);
  const date = graph.getPrimitiveType(PRIMITIVE_TYPE.DATE);
  const dateTime = graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME);
  switch (dateOptionValue.value) {
    case QUERY_BUILDER_DATE_OPTION.TODAY: {
      const todaySFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.TODAY,
        multiplicityOne,
      );
      todaySFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(strictDate),
      );
      return todaySFE;
    }
    case QUERY_BUILDER_DATE_OPTION.NOW: {
      const nowSFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.NOW,
        multiplicityOne,
      );
      nowSFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(dateTime),
      );
      return nowSFE;
    }
    case QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_YEAR: {
      const firstDayOfYearSFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
        multiplicityOne,
      );
      firstDayOfYearSFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(date),
      );
      return firstDayOfYearSFE;
    }
    case QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_QUARTER: {
      const firstDayOfQuarterSFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
        multiplicityOne,
      );
      firstDayOfQuarterSFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(strictDate),
      );
      return firstDayOfQuarterSFE;
    }
    case QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_MONTH: {
      const firstDayOfMonthSFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
        multiplicityOne,
      );
      firstDayOfMonthSFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(date),
      );
      return firstDayOfMonthSFE;
    }
    case QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_WEEK: {
      const firstDayOfWeekSFE = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
        multiplicityOne,
      );
      firstDayOfWeekSFE.genericType = GenericTypeExplicitReference.create(
        new GenericType(date),
      );
      return firstDayOfWeekSFE;
    }
    case QUERY_BUILDER_DATE_OPTION.PREVIOUS_DAY_OF_WEEK: {
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
              .values.filter((e) => e.name === dateOptionValue.unit)[0],
          ),
        ),
      );
      previousFridaySFE.parametersValues.push(dayOfWeekEnumIntanceValue);
      return previousFridaySFE;
    }
    default:
      throw new UnsupportedOperationError(
        `${dateOptionValue.value} is not supported yet.`,
      );
  }
};

// Generate the enum value of type DURATION_UNIT based on the input string.
const getDurationUnitEnumFromString = (
  unitString: string,
  graph: PureModel,
): Enum => {
  const durationUnitEnum = graph.getEnumeration(DURATION_UNIT);
  const targetDurationUnitEnumValueFromKey = durationUnitEnum.values.filter(
    (e) =>
      e.name ===
      Object.keys(QUERY_BUILDER_DATE_DURATION_UNIT_LABEL).filter(
        (key) =>
          QUERY_BUILDER_DATE_DURATION_UNIT_LABEL[
            key as keyof typeof QUERY_BUILDER_DATE_DURATION_UNIT_LABEL
          ] === unitString,
      )[0],
  )[0];
  return (
    targetDurationUnitEnumValueFromKey ??
    guaranteeNonNullable(durationUnitEnum.values[0])
  );
};

// Generate the pure date ajust() function based on the CustomDateOption.
export const generateDateAdjustFunctionFromDateOption = (
  dateOption: CustomDateOption,
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
    generateDateFunctionExpression(graph, {
      label: guaranteeNonNullable(dateOption.startDate),
      value: guaranteeNonNullable(dateOption.startDate),
    }),
  );
  if (dateOption.adjustment === QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE) {
    const minusFunc = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.MINUS,
      multiplicityOne,
    );
    minusFunc.parametersValues.push(
      buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.INTEGER,
        parseInt(guaranteeNonNullable(dateOption.durationRange)),
      ),
    );
    dateAdjustSimpleFunctionExpression.parametersValues.push(minusFunc);
  } else {
    const adjustmentInstanceValue = buildPrimitiveInstanceValue(
      graph,
      PRIMITIVE_TYPE.INTEGER,
      parseInt(guaranteeNonNullable(dateOption.durationRange)),
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
        getDurationUnitEnumFromString(
          guaranteeNonNullable(dateOption.unit),
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

// Generate the value of CustomDateOption.durationRange from the pure date adjust() function.
const getDurationRangeValue = (
  pureDateAjustFunction: SimpleFunctionExpression,
): string => {
  const durationNumberParam = pureDateAjustFunction.parametersValues[1];
  return durationNumberParam instanceof PrimitiveInstanceValue
    ? (durationNumberParam.values[0] as number).toString()
    : durationNumberParam instanceof SimpleFunctionExpression &&
      matchFunctionName(
        durationNumberParam.functionName,
        SUPPORTED_FUNCTIONS.MINUS,
      )
    ? durationNumberParam.parametersValues[0] instanceof PrimitiveInstanceValue
      ? (durationNumberParam.parametersValues[0].values[0] as number).toString()
      : ''
    : '';
};

// Generate the value of CustomDateOption.adjustment from the pure date adjust() function.
const getAdjustmentValue = (
  pureDateAjustFunction: SimpleFunctionExpression,
): string =>
  pureDateAjustFunction.parametersValues[1] instanceof
    SimpleFunctionExpression &&
  matchFunctionName(
    pureDateAjustFunction.parametersValues[1].functionName,
    SUPPORTED_FUNCTIONS.MINUS,
  )
    ? QUERY_BUILDER_DATE_ADJUSTMENT.BEFORE
    : QUERY_BUILDER_DATE_ADJUSTMENT.AFTER;

// Generate the value of CustomDateOption.unit from the pure date adjust() function.
const getDurationUnitLabel = (
  valueSpecification: SimpleFunctionExpression,
): string =>
  guaranteeNonNullable(
    Object.keys(QUERY_BUILDER_DATE_DURATION_UNIT_LABEL)
      .filter(
        (key) =>
          key ===
          (valueSpecification.parametersValues[2] as EnumValueInstanceValue)
            .values[0]?.value.name,
      )
      .map(
        (key) =>
          QUERY_BUILDER_DATE_DURATION_UNIT_LABEL[
            key as keyof typeof QUERY_BUILDER_DATE_DURATION_UNIT_LABEL
          ],
      )[0],
  );

// Generate the value of CustomDateOption.startDate from the pure date adjust() function.
const getStartDateValue = (
  pureDateAjustFunction: SimpleFunctionExpression,
): string => {
  const funcName = (
    pureDateAjustFunction.parametersValues[0] as SimpleFunctionExpression
  ).functionName;
  switch (funcName) {
    case SUPPORTED_FUNCTIONS.TODAY:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.TODAY;
    case SUPPORTED_FUNCTIONS.NOW:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.NOW;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_YEAR;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_QUARTER;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_MONTH;
    case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
      return QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_WEEK;
    default:
      return `${funcName} is not supported`;
  }
};

// Generate CustomDateOption based on the pure date adjust() function.
// Transform CustomDateOption if it matches any preserved custom adjust date functions. e.g. One Month Ago..
const generateDateOptionForAdjustFunction = (
  pureDateAjustFunction: SimpleFunctionExpression,
): CustomDateOption => {
  const latestDurationRangeValue = getDurationRangeValue(pureDateAjustFunction);
  const latestAdjustmentValue = getAdjustmentValue(pureDateAjustFunction);
  const latestDurationUnitValue = getDurationUnitLabel(pureDateAjustFunction);
  const latestStartDateValue = getStartDateValue(pureDateAjustFunction);
  const dateAdjustOption: CustomDateOption = {
    label: '',
    value: QUERY_BUILDER_DATE_OPTION.CUSTOM_DATE,
    unit: latestDurationUnitValue,
    durationRange: latestDurationRangeValue,
    startDate: latestStartDateValue,
    adjustment: latestAdjustmentValue,
  };

  const matchedPreservedCustomAdjustDates = reservedCustomDates.filter(
    (t) =>
      guaranteeNonNullable(t.adjustment) +
        guaranteeNonNullable(t.durationRange) +
        guaranteeNonNullable(t.startDate) +
        guaranteeNonNullable(t.unit) ===
      guaranteeNonNullable(dateAdjustOption.adjustment) +
        dateAdjustOption.durationRange +
        dateAdjustOption.startDate +
        dateAdjustOption.unit,
  );
  if (matchedPreservedCustomAdjustDates.length > 0) {
    dateAdjustOption.label = guaranteeNonNullable(
      matchedPreservedCustomAdjustDates[0]?.label,
    );
    dateAdjustOption.value = guaranteeNonNullable(
      matchedPreservedCustomAdjustDates[0]?.value,
    );
    return dateAdjustOption;
  }
  dateAdjustOption.label = [
    latestDurationRangeValue,
    latestDurationUnitValue,
    latestAdjustmentValue,
    latestStartDateValue,
  ].join(' ');
  return dateAdjustOption;
};

export const generateCustomAjustDateOption = (
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue,
): CustomDateOption => {
  if (
    valueSpecification instanceof SimpleFunctionExpression &&
    matchFunctionName(
      valueSpecification.functionName,
      SUPPORTED_FUNCTIONS.ADJUST,
    )
  ) {
    return generateDateOptionForAdjustFunction(valueSpecification);
  }
  return {
    label: '',
    value: '',
    durationRange: '',
    unit: '',
    adjustment: '',
    startDate: '',
  };
};

export const generateDateOptionForStartDayOfDateOption = (
  unitValue: string,
): CustomDateOption => {
  switch (unitValue) {
    case QUERY_BUILDER_DATE_DURATION_UNIT.WEEK:
      return {
        label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_WEEK,
        value: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_WEEK,
      };
    case QUERY_BUILDER_DATE_DURATION_UNIT.MONTH:
      return {
        label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_MONTH,
        value: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_MONTH,
      };
    case QUERY_BUILDER_DATE_DURATION_UNIT.QUARTER:
      return {
        label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_QUARTER,
        value: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_QUARTER,
      };
    case QUERY_BUILDER_DATE_DURATION_UNIT.YEAR:
      return {
        label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_YEAR,
        value: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_YEAR,
      };
    default:
      return { label: '', value: '' };
  }
};

export const generateDateOption = (
  valueSpecification: SimpleFunctionExpression | PrimitiveInstanceValue,
): CustomDateOption => {
  if (valueSpecification instanceof SimpleFunctionExpression) {
    switch (valueSpecification.functionName) {
      case SUPPORTED_FUNCTIONS.TODAY:
        return {
          label: QUERY_BUILDER_DATE_OPTION.TODAY,
          value: QUERY_BUILDER_DATE_OPTION.TODAY,
        };
      case SUPPORTED_FUNCTIONS.NOW:
        return {
          label: QUERY_BUILDER_DATE_OPTION.NOW,
          value: QUERY_BUILDER_DATE_OPTION.NOW,
        };
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR:
        return {
          label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_YEAR,
          value: QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE,
          unit: QUERY_BUILDER_DATE_DURATION_UNIT.YEAR,
        };
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
        return {
          label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_QUARTER,
          value: QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE,
          unit: QUERY_BUILDER_DATE_DURATION_UNIT.QUARTER,
        };
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH:
        return {
          label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_MONTH,
          value: QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE,
          unit: QUERY_BUILDER_DATE_DURATION_UNIT.MONTH,
        };
      case SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
        return {
          label: QUERY_BUILDER_CUSTOM_DATE_START_DATE_OPTION.START_OF_WEEK,
          value: QUERY_BUILDER_DATE_OPTION.START_DAY_OF_DATE,
          unit: QUERY_BUILDER_DATE_DURATION_UNIT.WEEK,
        };
      case SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK:
        return {
          label: `Previous ${
            (valueSpecification.parametersValues[0] as EnumValueInstanceValue)
              .values[0]?.value.name
          }`,
          value: QUERY_BUILDER_DATE_OPTION.PREVIOUS_DAY_OF_WEEK,
          unit: (
            valueSpecification.parametersValues[0] as EnumValueInstanceValue
          ).values[0]?.value.name,
        };
      case SUPPORTED_FUNCTIONS.ADJUST:
        return {
          ...generateDateOptionForAdjustFunction(valueSpecification),
        };
      default:
        return { label: '', value: '' };
    }
  } else {
    return {
      label: valueSpecification.values[0] as string,
      value:
        valueSpecification.genericType.value.rawType.path ===
        PRIMITIVE_TYPE.DATETIME
          ? QUERY_BUILDER_DATE_OPTION.ABSOLUTE_TIME
          : QUERY_BUILDER_DATE_OPTION.ABSOLUTE_DATE,
    };
  }
};
