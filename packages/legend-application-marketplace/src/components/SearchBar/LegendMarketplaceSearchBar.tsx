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
import { Button, InputAdornment, TextField } from '@mui/material';
import { SearchIcon } from '@finos/legend-art';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = (props: {
  onSearch: (provider: string | undefined, query: string | undefined) => void;
}): JSX.Element => {
  const { onSearch } = props;

  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <form
      className="legend-marketplace__search-bar"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(undefined, searchQuery);
      }}
    >
      <TextField
        type="search"
        placeholder="Search"
        fullWidth={true}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          height: '100%',
          '& .MuiOutlinedInput-root': {
            height: '100%',
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          },
        }}
      />
      <Button type="submit" variant="contained" disabled={!searchQuery}>
        Go
      </Button>
    </form>
  );
};
