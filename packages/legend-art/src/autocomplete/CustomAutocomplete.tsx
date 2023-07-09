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
  Autocomplete,
  TextField,
  type useAutocomplete,
  Popper,
  type PopperProps,
} from '@mui/material';
import { clsx } from 'clsx';
import React, { forwardRef } from 'react';

export interface AutocompleteRenderInputParamsTrue {
  id: string;
  disabled: boolean;
  fullWidth: boolean;
  InputProps: {
    ref: React.RefObject<HTMLDivElement>;
    className: string;
    startAdornment: React.ReactNode;
    endAdornment: React.ReactNode;
  };
  inputProps: ReturnType<ReturnType<typeof useAutocomplete>['getInputProps']>;
}

export const CustomAutocompleteInput = forwardRef<
  HTMLInputElement,
  {
    className?: string;
    options: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (val: { label: string; value: any }) => void;
    hasError?: boolean;
    darkMode?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }
>(function CustomAutocompleteInput(props, ref) {
  const {
    className,
    disabled,
    hasError,
    darkMode,
    placeholder,
    ...otherProps
  } = props;
  const isDarkMode = darkMode ?? false;
  const isDisabled = Boolean(disabled);
  const CustomPopper = (popperProps: PopperProps): JSX.Element => (
    <Popper
      {...popperProps}
      className={clsx('autocomplete__options', {
        'autocomplete__options--dark': isDarkMode,
      })}
      placement="bottom-start"
    />
  );

  return (
    <Autocomplete
      {...otherProps}
      ref={ref}
      onChange={(__event, selectedOption, reason) => {
        if (reason === 'selectOption') {
          otherProps.onChange(selectedOption);
        }
      }}
      multiple={false}
      placeholder={placeholder}
      disableClearable={true}
      selectOnFocus={false}
      fullWidth={true}
      PopperComponent={CustomPopper}
      disabled={isDisabled}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={(params) => (
        <TextField
          hiddenLabel={true}
          className={clsx(
            'autocomplete-input',
            { 'autocomplete-input--dark ': isDarkMode },
            { 'autocomplete-input--has-error ': hasError },
            { 'autocomplete-input--is-disabled ': isDisabled },
          )}
          {...(params as AutocompleteRenderInputParamsTrue)}
          InputProps={{
            ...(params as AutocompleteRenderInputParamsTrue).InputProps,
            disableUnderline: true,
          }}
          variant={'filled' as const}
        />
      )}
    />
  );
});
