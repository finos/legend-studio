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
  LegendUser,
  type UserSearchService,
  debounce,
} from '@finos/legend-shared';
import {
  Autocomplete,
  CircularProgress,
  TextField,
  type TextFieldProps,
} from '@mui/material';

type UserSearchInputProps = TextFieldProps & {
  userValue: LegendUser;
  setUserValue: (user: LegendUser) => void;
  userSearchService?: UserSearchService | undefined;
  initializing?: boolean | undefined;
};

export const UserSearchInput = forwardRef<
  HTMLInputElement,
  UserSearchInputProps
>(function UserSearchInput(props, ref) {
  const {
    className,
    userValue,
    setUserValue,
    userSearchService,
    initializing,
    ...inputProps
  } = props;

  const [inputValue, setInputValue] = useState<string>(
    userValue.displayName ?? '',
  );
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
    setUserValue(newValue ?? new LegendUser());
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
        value={userValue}
        inputValue={inputValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        options={userOptions}
        loading={loadingUsers}
        filterOptions={(x) => x}
        renderInput={(params) => {
          return (
            <TextField
              {...(params as TextFieldProps)}
              {...inputProps}
              label="User"
              placeholder="Search"
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      {initializing ? <CircularProgress size={20} /> : null}
                      {params.InputProps.startAdornment}
                    </>
                  ),
                },
              }}
            />
          );
        }}
        isOptionEqualToValue={(option, _value) => option?.id === _value?.id}
        getOptionLabel={(option) => option?.displayName ?? ''}
        fullWidth={inputProps.fullWidth ?? false}
        disabled={initializing ?? false}
        ref={ref}
      />
    );
  } else {
    return (
      <TextField
        {...inputProps}
        value={inputValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setInputValue(event.target.value);
          setUserValue(
            LegendUser.serialization.fromJson({ id: event.target.value }),
          );
        }}
        ref={ref}
      />
    );
  }
});
