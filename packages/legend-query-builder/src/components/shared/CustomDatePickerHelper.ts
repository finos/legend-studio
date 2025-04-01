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
  type ObserverContext,
  type PureModel,
  type V1_CDate,
  type V1_CStrictTime,
  type V1_CString,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  PrimitiveType,
  SimpleFunctionExpression,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CDateTime,
  V1_CInteger,
  V1_CLatestDate,
  V1_CStrictDate,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  buildPrimitiveInstanceValue,
  createSupportedFunctionExpression,
} from '../../stores/shared/ValueSpecificationEditorHelper.js';
import {
  functionExpression_addParameterValue,
  instanceValue_setValues,
  valueSpecification_setGenericType,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';
import {
  type ApplicationStore,
  type LegendApplicationConfig,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import {
  _elementPtr,
  _function,
  _primitiveValue,
  _property,
} from '@finos/legend-data-cube';

export type CustomDatePickerValueSpecification =
  | SimpleFunctionExpression
  | PrimitiveInstanceValue
  | V1_AppliedFunction
  | V1_CDate
  | V1_CStrictTime
  | V1_CString;

export type CustomDatePickerUpdateValueSpecification<T> = (
  _valueSpecification: T | undefined,
  value:
    | string
    | CustomDateOption
    | CustomFirstDayOfOption
    | CustomPreviousDayOfWeekOption
    | DatePickerOption,
  options?: {
    primitiveTypeEnum?: PRIMITIVE_TYPE;
  },
) => void;

export enum CUSTOM_DATE_PICKER_OPTION {
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

export enum CUSTOM_DATE_OPTION_UNIT {
  DAYS = 'Day(s)',
  WEEKS = 'Week(s)',
  MONTHS = 'Month(s)',
  YEARS = 'Year(s)',
}

export enum CUSTOM_DATE_FIRST_DAY_OF_UNIT {
  WEEK = 'Week',
  MONTH = 'Month',
  QUARTER = 'Quarter',
  YEAR = 'Year',
}

export enum CUSTOM_DATE_DAY_OF_WEEK {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WENDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export enum CUSTOM_DATE_OPTION_DIRECTION {
  BEFORE = 'Before',
  AFTER = 'After',
}

export enum CUSTOM_DATE_OPTION_REFERENCE_MOMENT {
  TODAY = 'Today',
  NOW = 'Now',
  FIRST_DAY_OF_THIS_YEAR = 'Start of Year',
  FIRST_DAY_OF_QUARTER = 'Start of Quarter',
  FIRST_DAY_OF_MONTH = 'Start of Month',
  FIRST_DAY_OF_WEEK = 'Start of Week',
  PERVIOUS_DAY_OF_WEEK = 'Previous Day of Week',
}

/**
 * DatePickerOption is the base class being used to display and generate the corresponding pure date function.
 */
export class DatePickerOption {
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

export class CustomDateOption extends DatePickerOption {
  /**
   * duration is the amount of time span that will be adjusted.
   */
  duration: number;
  /**
   * unit represents the time duration unit, e.g. year, week, etc.
   */
  unit: CUSTOM_DATE_OPTION_UNIT | undefined;
  /**
   * direction means the direction in which time adjustment will go to.
   */
  direction: CUSTOM_DATE_OPTION_DIRECTION | undefined;
  /**
   * referenceMoment is the date which adjustment starts from.
   */
  referenceMoment: CUSTOM_DATE_OPTION_REFERENCE_MOMENT | undefined;

  constructor(
    label: string,
    value: string,
    duration: number,
    unit: CUSTOM_DATE_OPTION_UNIT | undefined,
    direction: CUSTOM_DATE_OPTION_DIRECTION | undefined,
    referenceMoment: CUSTOM_DATE_OPTION_REFERENCE_MOMENT | undefined,
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

export class CustomFirstDayOfOption extends DatePickerOption {
  /**
   * unit: time unit, e.g. Week, Month, etc.
   */
  unit: CUSTOM_DATE_FIRST_DAY_OF_UNIT | undefined;

  constructor(label: string, unit: CUSTOM_DATE_FIRST_DAY_OF_UNIT | undefined) {
    super(label, CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF);
    this.unit = unit;
  }
}

export class CustomPreviousDayOfWeekOption extends DatePickerOption {
  /**
   * day: which day in the week will be selected.
   */
  day: CUSTOM_DATE_DAY_OF_WEEK;

  constructor(label: string, day: CUSTOM_DATE_DAY_OF_WEEK) {
    super(label, CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK);
    this.day = day;
  }
}

export const reservedCustomDateOptions: CustomDateOption[] = [
  new CustomDateOption(
    'Yesterday',
    CUSTOM_DATE_PICKER_OPTION.YESTERDAY,
    1,
    CUSTOM_DATE_OPTION_UNIT.DAYS,
    CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Week Ago',
    CUSTOM_DATE_PICKER_OPTION.ONE_WEEK_AGO,
    1,
    CUSTOM_DATE_OPTION_UNIT.WEEKS,
    CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Month Ago',
    CUSTOM_DATE_PICKER_OPTION.ONE_MONTH_AGO,
    1,
    CUSTOM_DATE_OPTION_UNIT.MONTHS,
    CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
  new CustomDateOption(
    'One Year Ago',
    CUSTOM_DATE_PICKER_OPTION.ONE_YEAR_AGO,
    1,
    CUSTOM_DATE_OPTION_UNIT.YEARS,
    CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
    CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
  ),
];

const getSupportedDateFunctionFullPath = (
  functionName: string,
): string | undefined =>
  Object.values(QUERY_BUILDER_SUPPORTED_FUNCTIONS).find((_func) =>
    matchFunctionName(functionName, _func),
  );

/**
 * Generate pure date functions based on the DatePickerOption.
 */
export const buildPureDateFunctionExpression = (
  datePickerOption: DatePickerOption,
  graph: PureModel,
  observerContext: ObserverContext,
): SimpleFunctionExpression => {
  if (datePickerOption instanceof CustomPreviousDayOfWeekOption) {
    const previousFridaySFE = new SimpleFunctionExpression(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK,
    );
    valueSpecification_setGenericType(
      previousFridaySFE,
      GenericTypeExplicitReference.create(new GenericType(PrimitiveType.DATE)),
    );
    const dayOfWeekEnumIntanceValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getType(QUERY_BUILDER_PURE_PATH.DAY_OF_WEEK)),
      ),
    );
    instanceValue_setValues(
      dayOfWeekEnumIntanceValue,
      [
        ...dayOfWeekEnumIntanceValue.values,
        EnumValueExplicitReference.create(
          guaranteeNonNullable(
            graph
              .getEnumeration(QUERY_BUILDER_PURE_PATH.DAY_OF_WEEK)
              .values.filter((e) => e.name === datePickerOption.day)[0],
          ),
        ),
      ],
      observerContext,
    );
    functionExpression_addParameterValue(
      previousFridaySFE,
      dayOfWeekEnumIntanceValue,
      observerContext,
    );
    return previousFridaySFE;
  } else if (datePickerOption instanceof CustomFirstDayOfOption) {
    switch (datePickerOption.unit) {
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.YEAR: {
        const firstDayOfThisYearSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR,
        );
        valueSpecification_setGenericType(
          firstDayOfThisYearSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
        );
        return firstDayOfThisYearSFE;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.QUARTER: {
        const firstDayOfQuarterSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
        );
        valueSpecification_setGenericType(
          firstDayOfQuarterSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          ),
        );
        return firstDayOfQuarterSFE;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.MONTH: {
        const firstDayOfMonthSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH,
        );
        valueSpecification_setGenericType(
          firstDayOfMonthSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
        );
        return firstDayOfMonthSFE;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.WEEK: {
        const firstDayOfWeekSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
        );
        valueSpecification_setGenericType(
          firstDayOfWeekSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
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
      case CUSTOM_DATE_PICKER_OPTION.TODAY: {
        return createSupportedFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
          PrimitiveType.STRICTDATE,
        );
      }
      case CUSTOM_DATE_PICKER_OPTION.NOW: {
        return createSupportedFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
          PrimitiveType.DATETIME,
        );
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_THIS_YEAR: {
        const firstDayOfYearSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR,
        );
        valueSpecification_setGenericType(
          firstDayOfYearSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
        );
        return firstDayOfYearSFE;
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER: {
        const firstDayOfQuarterSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
        );
        valueSpecification_setGenericType(
          firstDayOfQuarterSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          ),
        );
        return firstDayOfQuarterSFE;
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH: {
        const firstDayOfMonthSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH,
        );
        valueSpecification_setGenericType(
          firstDayOfMonthSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
        );
        return firstDayOfMonthSFE;
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK: {
        const firstDayOfWeekSFE = new SimpleFunctionExpression(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
        );
        valueSpecification_setGenericType(
          firstDayOfWeekSFE,
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          ),
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
 * Generate pure date functions based on the DatePickerOption (for V1 protocol).
 */
export const buildV1PureDateFunctionExpression = (
  datePickerOption: DatePickerOption,
): V1_AppliedFunction => {
  if (datePickerOption instanceof CustomPreviousDayOfWeekOption) {
    const dayOfWeekProperty = _property(datePickerOption.day, [
      _elementPtr(QUERY_BUILDER_PURE_PATH.DAY_OF_WEEK),
    ]);
    const previousDayAF = _function(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK,
      [dayOfWeekProperty],
      { useFullFunctionPath: true },
    );
    return previousDayAF;
  } else if (datePickerOption instanceof CustomFirstDayOfOption) {
    switch (datePickerOption.unit) {
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.YEAR: {
        const firstDayOfThisYearAF = _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR,
          [],
          { useFullFunctionPath: true },
        );
        return firstDayOfThisYearAF;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.QUARTER: {
        const firstDayOfQuarterAF = _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
          [],
          { useFullFunctionPath: true },
        );
        return firstDayOfQuarterAF;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.MONTH: {
        const firstDayOfMonthAF = _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH,
          [],
          { useFullFunctionPath: true },
        );
        return firstDayOfMonthAF;
      }
      case CUSTOM_DATE_FIRST_DAY_OF_UNIT.WEEK: {
        const firstDayOfWeekAF = _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
          [],
          { useFullFunctionPath: true },
        );
        return firstDayOfWeekAF;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't build expression for 'First Day Of ...' date picker option for unit '${datePickerOption.unit}'`,
        );
    }
  } else {
    switch (datePickerOption.value) {
      case CUSTOM_DATE_PICKER_OPTION.TODAY: {
        return _function(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY, [], {
          useFullFunctionPath: true,
        });
      }
      case CUSTOM_DATE_PICKER_OPTION.NOW: {
        return _function(QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW, [], {
          useFullFunctionPath: true,
        });
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_THIS_YEAR: {
        return _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR,
          [],
          { useFullFunctionPath: true },
        );
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER: {
        return _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
          [],
          { useFullFunctionPath: true },
        );
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH: {
        return _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH,
          [],
          { useFullFunctionPath: true },
        );
      }
      case CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK: {
        return _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
          [],
          { useFullFunctionPath: true },
        );
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
  const durationUnitEnum = graph.getEnumeration(
    QUERY_BUILDER_PURE_PATH.DURATION_UNIT,
  );
  const targetPureDurationEnumValue = durationUnitEnum.values.filter(
    (e) =>
      e.name ===
      Object.keys(CUSTOM_DATE_OPTION_UNIT).filter(
        (key) =>
          CUSTOM_DATE_OPTION_UNIT[
            key as keyof typeof CUSTOM_DATE_OPTION_UNIT
          ] === unitString,
      )[0],
  )[0];
  return (
    targetPureDurationEnumValue ??
    guaranteeNonNullable(durationUnitEnum.values[0])
  );
};

/**
 * Generate the pure date adjust() function based on the CustomDateOption.
 */
export const buildPureAdjustDateFunction = (
  customDateOption: CustomDateOption,
  graph: PureModel,
  observerContext: ObserverContext,
): SimpleFunctionExpression => {
  const dateAdjustSimpleFunctionExpression = new SimpleFunctionExpression(
    QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
  );
  functionExpression_addParameterValue(
    dateAdjustSimpleFunctionExpression,
    buildPureDateFunctionExpression(
      new DatePickerOption(
        guaranteeNonNullable(customDateOption.referenceMoment),
        guaranteeNonNullable(customDateOption.referenceMoment),
      ),
      graph,
      observerContext,
    ),
    observerContext,
  );
  if (customDateOption.direction === CUSTOM_DATE_OPTION_DIRECTION.BEFORE) {
    const minusFunc = new SimpleFunctionExpression(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
    );
    functionExpression_addParameterValue(
      minusFunc,
      buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.INTEGER,
        customDateOption.duration,
        observerContext,
      ),
      observerContext,
    );
    functionExpression_addParameterValue(
      dateAdjustSimpleFunctionExpression,
      minusFunc,
      observerContext,
    );
  } else {
    functionExpression_addParameterValue(
      dateAdjustSimpleFunctionExpression,
      buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.INTEGER,
        customDateOption.duration,
        observerContext,
      ),
      observerContext,
    );
  }
  const durationUnitEnumIntanceValue = new EnumValueInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getType(QUERY_BUILDER_PURE_PATH.DURATION_UNIT)),
    ),
  );
  instanceValue_setValues(
    durationUnitEnumIntanceValue,
    [
      ...durationUnitEnumIntanceValue.values,
      EnumValueExplicitReference.create(
        guaranteeNonNullable(
          buildPureDurationEnumValue(
            guaranteeNonNullable(customDateOption.unit),
            graph,
          ),
        ),
      ),
    ],
    observerContext,
  );
  functionExpression_addParameterValue(
    dateAdjustSimpleFunctionExpression,
    durationUnitEnumIntanceValue,
    observerContext,
  );
  valueSpecification_setGenericType(
    dateAdjustSimpleFunctionExpression,
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.DATE)),
  );
  return dateAdjustSimpleFunctionExpression;
};

/**
 * Generate the pure date adjust() function based on the CustomDateOption (for V1 protocol).
 */
export const buildV1PureAdjustDateFunction = (
  customDateOption: CustomDateOption,
): V1_AppliedFunction => {
  // Starting point function
  const startingPointAF = buildV1PureDateFunctionExpression(
    new DatePickerOption(
      guaranteeNonNullable(customDateOption.referenceMoment),
      guaranteeNonNullable(customDateOption.referenceMoment),
    ),
  );
  // Direction and duration
  const directionDuration =
    customDateOption.direction === CUSTOM_DATE_OPTION_DIRECTION.BEFORE
      ? _function(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
          [_primitiveValue(PRIMITIVE_TYPE.INTEGER, customDateOption.duration)],
          { useFullFunctionPath: true },
        )
      : _primitiveValue(PRIMITIVE_TYPE.INTEGER, customDateOption.duration);
  // Unit property
  const durationUnitProperty = _property(
    guaranteeNonNullable(customDateOption.unit),
    [_elementPtr(QUERY_BUILDER_PURE_PATH.DURATION_UNIT)],
  );

  return _function(
    QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
    [startingPointAF, directionDuration, durationUnitProperty],
    { useFullFunctionPath: true },
  );
};

/**
 * Generate the value of CustomDateOption.duration from the pure date adjust() function.
 */
const buildCustomDateOptionDurationValue = (
  pureDateAdjustFunction: SimpleFunctionExpression | V1_AppliedFunction,
): number => {
  if (pureDateAdjustFunction instanceof SimpleFunctionExpression) {
    const durationParam = pureDateAdjustFunction.parametersValues[1];
    return durationParam instanceof PrimitiveInstanceValue
      ? (durationParam.values[0] as number)
      : durationParam instanceof SimpleFunctionExpression &&
          matchFunctionName(
            durationParam.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
          )
        ? durationParam.parametersValues[0] instanceof PrimitiveInstanceValue
          ? (durationParam.parametersValues[0].values[0] as number)
          : 0
        : 0;
  } else {
    const durationParam = pureDateAdjustFunction.parameters[1];
    return durationParam instanceof V1_CInteger
      ? durationParam.value
      : durationParam instanceof V1_AppliedFunction &&
          matchFunctionName(
            durationParam.function,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
          )
        ? durationParam.parameters[0] instanceof V1_CInteger
          ? durationParam.parameters[0].value
          : 0
        : 0;
  }
};

/**
 * Generate the value of CustomDateOption.direction from the pure date adjust() function.
 */
const buildCustomDateOptionDirectionValue = (
  pureDateAdjustFunction: SimpleFunctionExpression | V1_AppliedFunction,
): CUSTOM_DATE_OPTION_DIRECTION => {
  if (pureDateAdjustFunction instanceof SimpleFunctionExpression) {
    return pureDateAdjustFunction.parametersValues[1] instanceof
      SimpleFunctionExpression &&
      matchFunctionName(
        pureDateAdjustFunction.parametersValues[1].functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
      )
      ? CUSTOM_DATE_OPTION_DIRECTION.BEFORE
      : CUSTOM_DATE_OPTION_DIRECTION.AFTER;
  } else {
    return pureDateAdjustFunction.parameters[1] instanceof V1_AppliedFunction &&
      matchFunctionName(
        pureDateAdjustFunction.parameters[1].function,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
      )
      ? CUSTOM_DATE_OPTION_DIRECTION.BEFORE
      : CUSTOM_DATE_OPTION_DIRECTION.AFTER;
  }
};

/**
 * Generate the value of CustomDateOption.unit from the pure date adjust() function.
 */
const buildCustomDateOptionUnitValue = (
  valueSpecification: SimpleFunctionExpression | V1_AppliedFunction,
): CUSTOM_DATE_OPTION_UNIT => {
  if (valueSpecification instanceof SimpleFunctionExpression) {
    return guaranteeNonNullable(
      Object.keys(CUSTOM_DATE_OPTION_UNIT)
        .filter(
          (key) =>
            key ===
            (valueSpecification.parametersValues[2] as EnumValueInstanceValue)
              .values[0]?.value.name,
        )
        .map(
          (key) =>
            CUSTOM_DATE_OPTION_UNIT[
              key as keyof typeof CUSTOM_DATE_OPTION_UNIT
            ],
        )[0],
    );
  } else {
    return guaranteeNonNullable(
      Object.values(CUSTOM_DATE_OPTION_UNIT).filter(
        (value) =>
          value ===
          guaranteeType(valueSpecification.parameters[2], V1_AppliedProperty)
            .property,
      )[0],
    );
  }
};

/**
 * Generate the value of CustomDateOption.moment from the pure date adjust() function.
 */
const buildCustomDateOptionReferenceMomentValue = (
  pureDateAjustFunction: SimpleFunctionExpression | V1_AppliedFunction,
): CUSTOM_DATE_OPTION_REFERENCE_MOMENT => {
  const funcName =
    pureDateAjustFunction instanceof SimpleFunctionExpression
      ? (pureDateAjustFunction.parametersValues[0] as SimpleFunctionExpression)
          .functionName
      : (pureDateAjustFunction.parameters[0] as V1_AppliedFunction).function;
  switch (getSupportedDateFunctionFullPath(funcName)) {
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.NOW;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_THIS_YEAR;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK;
    case QUERY_BUILDER_SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK:
      return CUSTOM_DATE_OPTION_REFERENCE_MOMENT.PERVIOUS_DAY_OF_WEEK;
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
export const buildCustomDateOption = (
  valueSpecification: CustomDatePickerValueSpecification | undefined,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
): CustomDateOption => {
  if (
    (valueSpecification instanceof SimpleFunctionExpression &&
      matchFunctionName(
        valueSpecification.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
      )) ||
    (valueSpecification instanceof V1_AppliedFunction &&
      matchFunctionName(
        valueSpecification.function,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
      ))
  ) {
    try {
      const customDateOption = new CustomDateOption(
        '',
        CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        buildCustomDateOptionDurationValue(valueSpecification),
        buildCustomDateOptionUnitValue(valueSpecification),
        buildCustomDateOptionDirectionValue(valueSpecification),
        buildCustomDateOptionReferenceMomentValue(valueSpecification),
      );
      const matchedPreservedCustomAdjustDates =
        reservedCustomDateOptions.filter(
          (t) =>
            t.generateDisplayLabel() ===
            customDateOption.generateDisplayLabel(),
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
    } catch (error) {
      assertErrorThrown(error);
      applicationStore.notificationService.notifyError(error);
    }
  }
  return new CustomDateOption('', '', 0, undefined, undefined, undefined);
};

/**
 * Build DatePickerOption from pure date functions or PrimitiveInstanceValue
 */
export const buildDatePickerOption = (
  valueSpecification: CustomDatePickerValueSpecification | undefined,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
): DatePickerOption => {
  if (
    valueSpecification instanceof SimpleFunctionExpression ||
    valueSpecification instanceof V1_AppliedFunction
  ) {
    const functionName =
      valueSpecification instanceof SimpleFunctionExpression
        ? valueSpecification.functionName
        : valueSpecification.function;
    switch (getSupportedDateFunctionFullPath(functionName)) {
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY:
        return new DatePickerOption(
          CUSTOM_DATE_PICKER_OPTION.TODAY,
          CUSTOM_DATE_PICKER_OPTION.TODAY,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW:
        return new DatePickerOption(
          CUSTOM_DATE_PICKER_OPTION.NOW,
          CUSTOM_DATE_PICKER_OPTION.NOW,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR:
        return new CustomFirstDayOfOption(
          CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_THIS_YEAR,
          CUSTOM_DATE_FIRST_DAY_OF_UNIT.YEAR,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER:
        return new CustomFirstDayOfOption(
          CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_QUARTER,
          CUSTOM_DATE_FIRST_DAY_OF_UNIT.QUARTER,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH:
        return new CustomFirstDayOfOption(
          CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_MONTH,
          CUSTOM_DATE_FIRST_DAY_OF_UNIT.MONTH,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK:
        return new CustomFirstDayOfOption(
          CUSTOM_DATE_OPTION_REFERENCE_MOMENT.FIRST_DAY_OF_WEEK,
          CUSTOM_DATE_FIRST_DAY_OF_UNIT.WEEK,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK:
        const dayOfWeek =
          valueSpecification instanceof SimpleFunctionExpression
            ? (valueSpecification.parametersValues[0] as EnumValueInstanceValue)
                .values[0]?.value.name
            : guaranteeType(
                valueSpecification.parameters[0],
                V1_AppliedProperty,
              ).property;
        return new CustomPreviousDayOfWeekOption(
          `Previous ${dayOfWeek}`,
          dayOfWeek as CUSTOM_DATE_DAY_OF_WEEK,
        );
      case QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST:
        return buildCustomDateOption(valueSpecification, applicationStore);
      default:
        return new DatePickerOption('', '');
    }
  } else if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.genericType.value.rawType.path ===
      PRIMITIVE_TYPE.LATESTDATE
      ? new DatePickerOption(
          CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
          CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
        )
      : new DatePickerOption(
          (valueSpecification.values[0] ?? '') as string,
          valueSpecification.values[0] === null
            ? ''
            : valueSpecification.genericType.value.rawType.path ===
                PRIMITIVE_TYPE.DATETIME
              ? CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME
              : CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
        );
  } else {
    if (valueSpecification instanceof V1_CLatestDate) {
      return new DatePickerOption(
        CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
        CUSTOM_DATE_PICKER_OPTION.LATEST_DATE,
      );
    } else if (valueSpecification instanceof V1_CStrictDate) {
      return new DatePickerOption(
        valueSpecification.value,
        valueSpecification.value === null
          ? ''
          : CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
      );
    } else if (valueSpecification instanceof V1_CDateTime) {
      return new DatePickerOption(
        valueSpecification.value,
        valueSpecification.value === null
          ? ''
          : CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
      );
    }
    throw new Error(
      `Unexpected date V1_ValueSpecification: ${valueSpecification}`,
    );
  }
};
