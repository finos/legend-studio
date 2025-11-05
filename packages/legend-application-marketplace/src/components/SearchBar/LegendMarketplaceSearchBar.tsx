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
import {
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { clsx, InfoCircleIcon, SearchIcon, TuneIcon } from '@finos/legend-art';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = (props: {
  marketplaceBaseStore: LegendMarketplaceBaseStore;
  onSearch?: (query: string | undefined) => void;
  initialValue?: string | undefined;
  placeholder?: string;
  onChange?: (query: string) => void;
  className?: string | undefined;
}): JSX.Element => {
  const {
    marketplaceBaseStore,
    onSearch,
    initialValue,
    placeholder,
    onChange,
    className,
  } = props;

  const [searchQuery, setSearchQuery] = useState<string>(initialValue ?? '');
  const [searchMenuAnchorEl, setSearchMenuAnchorEl] =
    useState<HTMLElement | null>();

  const searchMenuOpen = Boolean(searchMenuAnchorEl);

  return (
    <form
      className={clsx('legend-marketplace__search-bar', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.(searchQuery);
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
                <IconButton
                  onClick={(event) =>
                    setSearchMenuAnchorEl(event.currentTarget)
                  }
                  title="filter"
                >
                  <TuneIcon />
                </IconButton>
                <IconButton
                  onClick={() => onSearch?.(searchQuery)}
                  title="search"
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Menu
        anchorEl={searchMenuAnchorEl}
        open={searchMenuOpen}
        onClose={() => setSearchMenuAnchorEl(null)}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={marketplaceBaseStore.useIndexSearch}
                onChange={(event) => {
                  marketplaceBaseStore.setUseIndexSearch(event.target.checked);
                }}
              />
            }
            label={
              <>
                Use Index Search{' '}
                <Tooltip title="Index search provides the most up-to-date results by searching directly on deployed data products. Only use index search if you are trying to find a recently deployed data product.">
                  <InfoCircleIcon />
                </Tooltip>
              </>
            }
          />
        </MenuItem>
      </Menu>
    </form>
  );
};
