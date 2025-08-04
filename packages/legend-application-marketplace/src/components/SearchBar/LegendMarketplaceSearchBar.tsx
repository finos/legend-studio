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

import { type JSX, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { clsx, SearchIcon } from '@finos/legend-art';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = (props: {
  onSearch?: (provider: string | undefined, query: string | undefined) => void;
  initialValue?: string;
  placeholder?: string;
  onChange?: (query: string) => void;
  className?: string | undefined;
}): JSX.Element => {
  const { onSearch, initialValue, placeholder, onChange, className } = props;

  const [searchQuery, setSearchQuery] = useState<string>(initialValue ?? '');

  return (
    <form
      className={clsx('legend-marketplace__search-bar', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.(undefined, searchQuery);
      }}
    >
      <TextField
        className="legend-marketplace__search-bar__text-field"
        type="search"
        placeholder={placeholder ?? 'Search'}
        fullWidth={true}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          onChange?.(event.target.value);
        }}
        slotProps={{
          input: {
            className: 'legend-marketplace__search-bar__input',
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon
                  onClick={() => onSearch?.(undefined, searchQuery)}
                />
              </InputAdornment>
            ),
          },
        }}
      />
    </form>
  );
};
