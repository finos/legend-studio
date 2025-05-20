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

import { forwardRef, useMemo, useState, type ChangeEvent } from 'react';
import {
  type LegendUser,
  type UserSearchService,
  debounce,
} from '@finos/legend-shared';
import { Autocomplete, TextField, type TextFieldProps } from '@mui/material';

type UserSearchInputProps = TextFieldProps & {
  userSearchService?: UserSearchService | undefined;
};

export const InputWithInlineValidation = forwardRef<
  HTMLInputElement,
  UserSearchInputProps
>(function InputWithInlineValidation(props, ref) {
  const { className, userSearchService, ...inputProps } = props;

  const [value, setValue] = useState<LegendUser | undefined>();
  const [inputValue, setInputValue] = useState<string>('');
  const [userOptions, setUserOptions] = useState<LegendUser[]>([]);
  const [loadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  const debouncedSearchUsers = useMemo(
    () =>
      debounce(async (input: string): Promise<void> => {
        setIsLoadingUsers(true);
        const users = await userSearchService?.executeSearch(input);
        setUserOptions(users ?? []);
        setIsLoadingUsers(false);
      }, 500),
    [userSearchService],
  );

  const handleChange = (
    _option: React.SyntheticEvent,
    newValue: LegendUser | null | undefined,
  ) => {
    setValue(newValue ?? undefined);
  };

  const handleInputChange = (
    _: React.SyntheticEvent,
    newInputValue: string,
  ): void => {
    setInputValue(newInputValue);
    if (userSearchService) {
      if (newInputValue === '') {
        setUserOptions([]);
      } else {
        debouncedSearchUsers(newInputValue);
      }
    }
  };

  if (userSearchService) {
    return (
      <Autocomplete
        className={className ?? ''}
        value={value}
        inputValue={inputValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        options={userOptions}
        loading={loadingUsers}
        filterOptions={(x) => x}
        renderInput={(params) => {
          console.log('renderInput params:', params);
          return <TextField label="Search" />;
        }}
        isOptionEqualToValue={(option, _value) =>
          option?.kerberos === _value?.kerberos
        }
        getOptionLabel={(option) => option?.displayName ?? ''}
        ref={ref}
      />
    );
  } else {
    return (
      <TextField
        {...inputProps}
        variant="outlined"
        margin="dense"
        fullWidth={true}
        value={inputValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setInputValue(event.target.value);
        }}
        ref={ref}
      />
    );
  }
});
