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

import { useForkRef } from '@mui/material';
import {
  DatePicker as BaseDatePicker,
  DateCalendar as BaseDateCalendar,
  type BaseSingleInputFieldProps,
  type DatePickerProps,
  type DateValidationError,
  type FieldSection,
  type UseDateFieldProps,
  type DateCalendarProps,
} from '@mui/x-date-pickers';
import { useDateField } from '@mui/x-date-pickers/DateField/useDateField.js';
import { forwardRef } from 'react';

export const DateCalendar = forwardRef<HTMLDivElement, DateCalendarProps<Date>>(
  function DatePicker(props, ref) {
    return <BaseDateCalendar ref={ref} {...props} />;
  },
);

export const DatePicker = forwardRef<
  HTMLInputElement,
  DatePickerProps<Date, false>
>(function DatePicker(props, ref) {
  return <BaseDatePicker ref={ref} {...props} />;
});

// Make text field work with the browser input
// See https://mui.com/x/react-date-pickers/custom-field/#using-the-browser-input
const DatePickerFieldInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    className?: string;
    InputProps?: {
      ref?: React.Ref<HTMLInputElement>;
      endAdornment?: React.ReactNode;
      startAdornment?: React.ReactNode;
    };

    // props to be ignored
    inputRef?: React.Ref<HTMLInputElement>;
    ownerState?: unknown;
    enableAccessibleFieldDOMStructure: boolean;
    clearable?: boolean;
    error?: boolean;
    focused?: boolean;
    onClear?: React.MouseEventHandler<Element>;
  }
>(function DatePickerFieldInput(props, ref) {
  const {
    inputRef,
    className,
    disabled,
    InputProps: { ref: containerRef, endAdornment } = {},

    // ignore
    ownerState,
    enableAccessibleFieldDOMStructure,
    clearable,
    onClear,
    error,
    focused,

    ...otherProps
  } = props;
  const handleRef = useForkRef(containerRef, ref);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
      ref={handleRef}
    >
      <input
        className={className}
        disabled={disabled}
        ref={inputRef}
        {...otherProps}
      />
      {endAdornment}
    </div>
  );
});

interface DatePickerFieldProps
  extends UseDateFieldProps<Date, false>,
    BaseSingleInputFieldProps<
      Date | null,
      Date,
      FieldSection,
      false,
      DateValidationError
    > {}

export const DatePickerField = forwardRef<
  HTMLInputElement,
  DatePickerFieldProps
>(function DatePickerField(props, ref) {
  const { slots, slotProps, onClear, ...textFieldProps } = props;
  const fieldResponse = useDateField<Date, false, DatePickerFieldProps>({
    ...textFieldProps,
  });

  return <DatePickerFieldInput {...fieldResponse} ref={ref} />;
});
