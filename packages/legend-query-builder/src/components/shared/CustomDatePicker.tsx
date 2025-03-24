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
  type SelectComponent,
  BasePopover,
  BaseRadioGroup,
  CustomSelectorInput,
  clsx,
} from '@finos/legend-art';
import {
  type PureModel,
  type Enum,
  type Type,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  GenericType,
  PrimitiveInstanceValue,
  GenericTypeExplicitReference,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  matchFunctionName,
  type ObserverContext,
  PrimitiveType,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CInteger,
  V1_CString,
  V1_CStrictDate,
  V1_CDateTime,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  parseNumber,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { useEffect, useRef, useState } from 'react';
import {
  buildPrimitiveInstanceValue,
  createSupportedFunctionExpression,
} from '../../stores/shared/ValueSpecificationEditorHelper.js';
import {
  functionExpression_addParameterValue,
  instanceValue_setValue,
  instanceValue_setValues,
  valueSpecification_setGenericType,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';
import {
  useApplicationStore,
  type ApplicationStore,
  type LegendApplicationConfig,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import type { V1_CDate } from '../../../../legend-graph/src/graph-manager/protocol/pure/v1/model/valueSpecification/raw/V1_CDate.js';
import type { PrimitiveInstanceValueEditorProps } from './BasicValueSpecificationEditor.js';

export type CustomDatePickerValueSpecification =
  | SimpleFunctionExpression
  | PrimitiveInstanceValue
  | V1_AppliedFunction
  | V1_CDate
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

enum CUSTOM_DATE_OPTION_UNIT {
  DAYS = 'Day(s)',
  WEEKS = 'Week(s)',
  MONTHS = 'Month(s)',
  YEARS = 'Year(s)',
}

enum CUSTOM_DATE_FIRST_DAY_OF_UNIT {
  WEEK = 'Week',
  MONTH = 'Month',
  QUARTER = 'Quarter',
  YEAR = 'Year',
}

enum CUSTOM_DATE_DAY_OF_WEEK {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WENDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

enum CUSTOM_DATE_OPTION_DIRECTION {
  BEFORE = 'Before',
  AFTER = 'After',
}

enum CUSTOM_DATE_OPTION_REFERENCE_MOMENT {
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

const reservedCustomDateOptions: CustomDateOption[] = [
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
      Object.keys(CUSTOM_DATE_OPTION_UNIT)
        .filter(
          (key) =>
            key ===
            guaranteeType(valueSpecification.parameters[2], V1_AppliedProperty)
              .property,
        )
        .map(
          (key) =>
            CUSTOM_DATE_OPTION_UNIT[
              key as keyof typeof CUSTOM_DATE_OPTION_UNIT
            ],
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
const buildCustomDateOption = (
  valueSpecification:
    | SimpleFunctionExpression
    | PrimitiveInstanceValue
    | V1_AppliedFunction
    | V1_CDate,
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
  valueSpecification:
    | SimpleFunctionExpression
    | PrimitiveInstanceValue
    | V1_AppliedFunction
    | V1_CDate
    | V1_CString,
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
    // LatestDate gets passed as a V1_CString
    if (valueSpecification instanceof V1_CString) {
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

interface AbsoluteDateValueSpecificationEditorProps<
  T extends CustomDatePickerValueSpecification,
> extends Omit<CustomDatePickerProps<T>, 'typeCheckOption'> {
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const AbsoluteDateValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification,
>(
  props: AbsoluteDateValueSpecificationEditorProps<T>,
) => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    setDatePickerOption,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const absoluteDateValue = valueSelector(valueSpecification);
  const updateAbsoluteDateValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    updateValueSpecification(valueSpecification, event.target.value, {
      primitiveTypeEnum: PRIMITIVE_TYPE.STRICTDATE,
    });
    setDatePickerOption(
      new DatePickerOption(
        event.target.value,
        CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
      ),
    );
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="value-spec-editor__date-picker__absolute-date">
      <input
        ref={inputRef}
        className="panel__content__form__section__input value-spec-editor__date-picker__absolute-date__input input--dark"
        type="date"
        spellCheck={false}
        value={absoluteDateValue ?? ''}
        onChange={updateAbsoluteDateValue}
      />
    </div>
  );
};

interface AbsoluteTimeValueSpecificationEditorProps<
  T extends CustomDatePickerValueSpecification,
> extends Omit<CustomDatePickerProps<T>, 'typeCheckOption'> {
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const AbsoluteTimeValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification,
>(
  props: AbsoluteTimeValueSpecificationEditorProps<T>,
) => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    setDatePickerOption,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const absoluteTimeValue = valueSelector(valueSpecification);
  const updateAbsoluteTimeValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const value = new Date(event.target.value).getUTCSeconds()
      ? event.target.value
      : `${event.target.value}:00`;
    updateValueSpecification(valueSpecification, value, {
      primitiveTypeEnum: PRIMITIVE_TYPE.DATETIME,
    });
    setDatePickerOption(
      new DatePickerOption(
        event.target.value,
        CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
      ),
    );
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="value-spec-editor__date-picker__absolute-date">
      <input
        ref={inputRef}
        className="panel__content__form__section__input value-spec-editor__date-picker__absolute-date__input input--dark"
        // Despite its name this would actually allow us to register time in UTC
        // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#setting_timezones
        type="datetime-local"
        // Configure the step to show seconds picker
        // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#step
        step="1"
        spellCheck={false}
        value={absoluteTimeValue ?? ''}
        onChange={updateAbsoluteTimeValue}
      />
    </div>
  );
};

interface CustomDateInstanceValueEditorProps<
  T extends CustomDatePickerValueSpecification,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateOptionValue: CustomDateOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomDateInstanceValueEditor = <
  T extends CustomDatePickerValueSpecification,
>(
  props: CustomDateInstanceValueEditorProps<T>,
) => {
  const {
    customDateOptionValue,
    updateValueSpecification,
    setDatePickerOption,
  } = props;
  const applicationStore = useApplicationStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [durationValue, setDurationValue] = useState(
    customDateOptionValue.duration,
  );
  const [unitValue, setUnitValue] = useState(
    customDateOptionValue.unit ?? CUSTOM_DATE_OPTION_UNIT.DAYS,
  );
  const [directionValue, setDirectionValue] = useState(
    customDateOptionValue.direction ?? CUSTOM_DATE_OPTION_DIRECTION.BEFORE,
  );
  const [referenceMomentValue, setReferenceMomentValueValue] = useState(
    customDateOptionValue.referenceMoment ??
      CUSTOM_DATE_OPTION_REFERENCE_MOMENT.TODAY,
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
        CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        latestDurationValue,
        latestUnitValue as CUSTOM_DATE_OPTION_UNIT,
        latestDirectionValue as CUSTOM_DATE_OPTION_DIRECTION,
        latestReferenceMomentValue as CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
      );
      updateValueSpecification(undefined, dateOption);
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
      event.target.value !== ''
        ? (returnUndefOnError(() => parseNumber(event.target.value)) ?? 0)
        : 0;
    setDurationValue(duration);
    changeValue(duration, unitValue, directionValue, referenceMomentValue);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="value-spec-editor__date-picker__custom-date">
      <div className="value-spec-editor__date-picker__custom-date__input">
        <input
          ref={inputRef}
          className="value-spec-editor__date-picker__custom-date__input-text-editor input--dark"
          spellCheck={false}
          value={durationValue}
          type="number"
          onChange={changeDurationValue}
        />
      </div>
      <div className="value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          placeholder="Unit"
          className="value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(CUSTOM_DATE_OPTION_UNIT).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string }): void => {
            setUnitValue(val.value as CUSTOM_DATE_OPTION_UNIT);
            changeValue(
              durationValue,
              val.value,
              directionValue,
              referenceMomentValue,
            );
          }}
          value={{ value: unitValue, label: unitValue }}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <div className="value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          className="value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(CUSTOM_DATE_OPTION_DIRECTION).map((t) => ({
            value: t.toString(),
            label: t.toString(),
          }))}
          onChange={(val: { label: string; value: string }): void => {
            setDirectionValue(val.value as CUSTOM_DATE_OPTION_DIRECTION);
            changeValue(
              durationValue,
              unitValue,
              val.value,
              referenceMomentValue,
            );
          }}
          value={{ value: directionValue, label: directionValue }}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <div className="value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          className="value-spec-editor__date-picker__custom-date__input-dropdown"
          options={Object.values(CUSTOM_DATE_OPTION_REFERENCE_MOMENT).map(
            (t) => ({
              value: t.toString(),
              label: t.toString(),
            }),
          )}
          onChange={(val: { label: string; value: string }): void => {
            setReferenceMomentValueValue(
              val.value as CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
            );
            changeValue(durationValue, unitValue, directionValue, val.value);
          }}
          value={{ value: referenceMomentValue, label: referenceMomentValue }}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
    </div>
  );
};

interface CustomFirstDayOfValueSpecificationEditorProps<
  T extends CustomDatePickerValueSpecification,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateAdjustOptionValue: DatePickerOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomFirstDayOfValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification,
>(
  props: CustomFirstDayOfValueSpecificationEditorProps<T>,
) => {
  const {
    customDateAdjustOptionValue,
    updateValueSpecification,
    setDatePickerOption,
  } = props;
  const applicationStore = useApplicationStore();
  const selectorRef = useRef<SelectComponent>(null);
  const [unitValue, setUnitValue] = useState(
    customDateAdjustOptionValue instanceof CustomFirstDayOfOption
      ? (customDateAdjustOptionValue.unit as string)
      : null,
  );
  const changeValue = (latestUnitValue: string): void => {
    if (latestUnitValue !== '') {
      const targetUnitValue = Object.values(
        CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
      ).filter((moment) => moment.toString().includes(latestUnitValue));
      const startDayOfDateOption =
        targetUnitValue.length > 0
          ? new CustomFirstDayOfOption(
              guaranteeNonNullable(targetUnitValue[0]?.toString()),
              latestUnitValue as CUSTOM_DATE_FIRST_DAY_OF_UNIT,
            )
          : new CustomFirstDayOfOption('', undefined);
      updateValueSpecification(undefined, startDayOfDateOption);
      setDatePickerOption(startDayOfDateOption);
    }
  };

  useEffect(() => {
    selectorRef.current?.focus();
  }, []);

  return (
    <div className="value-spec-editor__date-picker__custom-date">
      <div className="value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          inputRef={selectorRef}
          placeholder="Choose a unit..."
          className="value-spec-editor__date-picker__custom-date__input-dropdown value-spec-editor__date-picker__custom-date__input-dropdown--full"
          options={Object.values(CUSTOM_DATE_FIRST_DAY_OF_UNIT).map((t) => ({
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
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
    </div>
  );
};

interface CustomPreviousDayOfWeekValueSpecificationEditorProps<
  T extends CustomDatePickerValueSpecification,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateAdjustOptionValue: DatePickerOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomPreviousDayOfWeekValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification,
>(
  props: CustomPreviousDayOfWeekValueSpecificationEditorProps<T>,
) => {
  const {
    customDateAdjustOptionValue,
    updateValueSpecification,
    setDatePickerOption,
  } = props;
  const applicationStore = useApplicationStore();
  const selectorRef = useRef<SelectComponent>(null);
  const [dayOfWeekValue, setDayOfWeekValue] = useState(
    customDateAdjustOptionValue instanceof CustomPreviousDayOfWeekOption
      ? (customDateAdjustOptionValue.day as string)
      : null,
  );
  const changeValue = (latestDurationUnitValue: string): void => {
    if (latestDurationUnitValue !== '') {
      const previousDayOfWeekDateOption = new CustomPreviousDayOfWeekOption(
        `Previous ${latestDurationUnitValue}`,
        latestDurationUnitValue as CUSTOM_DATE_DAY_OF_WEEK,
      );
      updateValueSpecification(undefined, previousDayOfWeekDateOption);
      setDatePickerOption(previousDayOfWeekDateOption);
    }
  };

  useEffect(() => {
    selectorRef.current?.focus();
  }, []);

  return (
    <div className="value-spec-editor__date-picker__custom-date">
      <div className="value-spec-editor__date-picker__custom-date__input">
        <CustomSelectorInput
          inputRef={selectorRef}
          placeholder="Choose a day..."
          className="value-spec-editor__date-picker__custom-date__input-dropdown value-spec-editor__date-picker__custom-date__input-dropdown--full"
          options={Object.values(CUSTOM_DATE_DAY_OF_WEEK).map((t) => ({
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
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
    </div>
  );
};

interface CustomDatePickerProps<T extends CustomDatePickerValueSpecification>
  extends Omit<
    PrimitiveInstanceValueEditorProps<T, string | null>,
    'updateValueSpecification' | 'resetValue'
  > {
  updateValueSpecification: CustomDatePickerUpdateValueSpecification<T>;
  hasError?: boolean;
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
  displayAsEditableValue?: boolean | undefined;
  handleBlur?: (() => void) | undefined;
}

export const CustomDatePicker = <T extends CustomDatePickerValueSpecification>(
  props: CustomDatePickerProps<T>,
) => {
  const {
    valueSpecification,
    valueSelector,
    updateValueSpecification,
    hasError,
    typeCheckOption,
    displayAsEditableValue,
    handleBlur,
  } = props;
  const applicationStore = useApplicationStore();
  // For some cases where types need to be matched strictly.
  // Some options need to be filtered out for DateTime.
  const targetDateOptionsEnum = typeCheckOption.match
    ? Object.values([
        CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
        CUSTOM_DATE_PICKER_OPTION.NOW,
      ])
    : Object.values(CUSTOM_DATE_PICKER_OPTION);
  const [datePickerOption, setDatePickerOption] = useState(
    buildDatePickerOption(valueSpecification, applicationStore),
  );

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const openCustomDatePickerPopover = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget);
  };
  const handleEnter = (): void => {
    setDatePickerOption(
      buildDatePickerOption(valueSpecification, applicationStore),
    );
  };
  const closeCustomDatePickerPopover = (): void => {
    setDatePickerOption(
      buildDatePickerOption(valueSpecification, applicationStore),
    );
    setAnchorEl(null);
    handleBlur?.();
  };
  const handleDatePickerOptionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const chosenDatePickerOption = new DatePickerOption(
      (event.target as HTMLInputElement).value,
      (event.target as HTMLInputElement).value,
    );
    if (
      CUSTOM_DATE_PICKER_OPTION.LATEST_DATE === chosenDatePickerOption.value
    ) {
      updateValueSpecification(undefined, event.target.value, {
        primitiveTypeEnum: PRIMITIVE_TYPE.LATESTDATE,
      });
    } else if (
      // Elements in this list will trigger children date components
      ![
        CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE,
        CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME,
        CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE,
        CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF,
        CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK,
      ].includes(chosenDatePickerOption.value as CUSTOM_DATE_PICKER_OPTION)
    ) {
      const theReservedCustomDateOption = reservedCustomDateOptions.filter(
        (d) => d.value === chosenDatePickerOption.value,
      );
      if (theReservedCustomDateOption.length > 0) {
        updateValueSpecification(
          undefined,
          guaranteeNonNullable(theReservedCustomDateOption[0]),
        );
      } else {
        updateValueSpecification(undefined, chosenDatePickerOption);
      }
    }
    setDatePickerOption(chosenDatePickerOption);
  };
  const renderChildrenDateComponents = (): React.ReactNode => {
    switch (datePickerOption.value) {
      case CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_DATE:
        return (
          <AbsoluteDateValueSpecificationEditor<T>
            valueSpecification={valueSpecification}
            valueSelector={valueSelector}
            updateValueSpecification={updateValueSpecification}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case CUSTOM_DATE_PICKER_OPTION.ABSOLUTE_TIME:
        return (
          <AbsoluteTimeValueSpecificationEditor<T>
            valueSpecification={valueSpecification}
            valueSelector={valueSelector}
            updateValueSpecification={updateValueSpecification}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case CUSTOM_DATE_PICKER_OPTION.CUSTOM_DATE:
        return (
          <CustomDateInstanceValueEditor<T>
            customDateOptionValue={buildCustomDateOption(
              valueSpecification,
              applicationStore,
            )}
            updateValueSpecification={updateValueSpecification}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case CUSTOM_DATE_PICKER_OPTION.FIRST_DAY_OF:
        return (
          <CustomFirstDayOfValueSpecificationEditor<T>
            customDateAdjustOptionValue={buildDatePickerOption(
              valueSpecification,
              applicationStore,
            )}
            updateValueSpecification={updateValueSpecification}
            setDatePickerOption={setDatePickerOption}
          />
        );
      case CUSTOM_DATE_PICKER_OPTION.PREVIOUS_DAY_OF_WEEK:
        return (
          <CustomPreviousDayOfWeekValueSpecificationEditor<T>
            customDateAdjustOptionValue={buildDatePickerOption(
              valueSpecification,
              applicationStore,
            )}
            updateValueSpecification={updateValueSpecification}
            setDatePickerOption={setDatePickerOption}
          />
        );
      default:
        return null;
    }
  };

  // make sure the date picker label is updated when the value is reset or changed somehow
  useEffect(() => {
    setDatePickerOption(
      buildDatePickerOption(valueSpecification, applicationStore),
    );
  }, [applicationStore, valueSpecification]);

  return (
    <>
      {displayAsEditableValue ? (
        <span
          className={clsx(
            'value-spec-editor__date-picker__editable__display--content editable-value',
            {
              'value-spec-editor__date-picker__editable__display--content--error':
                hasError,
            },
          )}
          title="Click to edit and pick from more date options"
          onClick={openCustomDatePickerPopover}
        >
          {datePickerOption.label ? (
            `"${datePickerOption.label}"`
          ) : (
            <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</>
          )}
        </span>
      ) : (
        <button
          className={clsx('value-spec-editor__date-picker__trigger', {
            'value-spec-editor__date-picker__trigger--error': hasError,
          })}
          title="Click to edit and pick from more date options"
          onClick={openCustomDatePickerPopover}
        >
          {datePickerOption.label || 'Select value'}
        </button>
      )}
      <BasePopover
        open={Boolean(anchorEl)}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        anchorEl={anchorEl}
        onClose={closeCustomDatePickerPopover}
        anchorOrigin={{
          vertical: displayAsEditableValue ? 20 : 'bottom',
          horizontal: displayAsEditableValue ? 50 : 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <BaseRadioGroup
          className="value-spec-editor__date-picker__options"
          value={datePickerOption.value}
          onChange={handleDatePickerOptionChange}
          row={true}
          options={targetDateOptionsEnum}
          size={2}
        />
        {renderChildrenDateComponents()}
      </BasePopover>
    </>
  );
};
