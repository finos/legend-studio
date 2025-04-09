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
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  parseNumber,
  returnUndefOnError,
} from '@finos/legend-shared';
import { useEffect, useRef, useState } from 'react';
import { useApplicationStore } from '@finos/legend-application';
import type {
  PrimitiveInstanceValueEditorProps,
  TypeCheckOption,
} from './BasicValueSpecificationEditor.js';
import {
  buildCustomDateOption,
  buildDatePickerOption,
  CUSTOM_DATE_DAY_OF_WEEK,
  CUSTOM_DATE_FIRST_DAY_OF_UNIT,
  CUSTOM_DATE_OPTION_DIRECTION,
  CUSTOM_DATE_OPTION_REFERENCE_MOMENT,
  CUSTOM_DATE_OPTION_UNIT,
  CUSTOM_DATE_PICKER_OPTION,
  CustomDateOption,
  CustomFirstDayOfOption,
  CustomPreviousDayOfWeekOption,
  DatePickerOption,
  reservedCustomDateOptions,
  type CustomDatePickerUpdateValueSpecification,
  type CustomDatePickerValueSpecification,
} from './CustomDatePickerHelper.js';
import type { V1_TypeCheckOption } from './V1_BasicValueSpecificationEditor.js';

interface AbsoluteDateValueSpecificationEditorProps<
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<CustomDatePickerProps<T>, 'typeCheckOption'> {
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const AbsoluteDateValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification | undefined,
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
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<CustomDatePickerProps<T>, 'typeCheckOption'> {
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const AbsoluteTimeValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification | undefined,
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
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateOptionValue: CustomDateOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomDateInstanceValueEditor = <
  T extends CustomDatePickerValueSpecification | undefined,
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
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateAdjustOptionValue: DatePickerOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomFirstDayOfValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification | undefined,
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
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<
    CustomDatePickerProps<T>,
    'typeCheckOption' | 'valueSpecification' | 'valueSelector'
  > {
  customDateAdjustOptionValue: DatePickerOption;
  setDatePickerOption: (datePickerOption: DatePickerOption) => void;
}

const CustomPreviousDayOfWeekValueSpecificationEditor = <
  T extends CustomDatePickerValueSpecification | undefined,
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

interface CustomDatePickerProps<
  T extends CustomDatePickerValueSpecification | undefined,
> extends Omit<
    PrimitiveInstanceValueEditorProps<T, string | null>,
    'updateValueSpecification' | 'resetValue'
  > {
  updateValueSpecification: CustomDatePickerUpdateValueSpecification<T>;
  hasError?: boolean;
  typeCheckOption: TypeCheckOption | V1_TypeCheckOption;
  displayAsEditableValue?: boolean | undefined;
  handleBlur?: (() => void) | undefined;
}

export const CustomDatePicker = <
  T extends CustomDatePickerValueSpecification | undefined,
>(
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
    readOnly,
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
          title={
            readOnly ? '' : 'Click to edit and pick from more date options'
          }
          onClick={readOnly ? () => {} : openCustomDatePickerPopover}
          style={{ cursor: readOnly ? 'not-allowed' : 'unset' }}
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
          title={
            readOnly ? '' : 'Click to edit and pick from more date options'
          }
          onClick={openCustomDatePickerPopover}
          disabled={readOnly}
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
