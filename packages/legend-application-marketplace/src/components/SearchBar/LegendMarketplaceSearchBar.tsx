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

import { type JSX, useEffect, useState } from 'react';
import {
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material';
import { clsx, SearchIcon, TuneIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LegendMarketplaceInfoTooltip } from '../InfoTooltip/LegendMarketplaceInfoTooltip.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = observer(
  (props: {
    onSearch?: (query: string | undefined, useProducerSearch: boolean) => void;
    stateSearchQuery?: string | undefined;
    placeholder?: string;
    onChange?: (query: string) => void;
    className?: string | undefined;
    showSettings?: boolean;
    stateUseProducerSearch?: boolean | undefined;
  }): JSX.Element => {
    const {
      onSearch,
      stateSearchQuery,
      placeholder,
      onChange,
      className,
      showSettings,
      stateUseProducerSearch,
    } = props;

    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    const [searchQuery, setSearchQuery] = useState<string>(
      stateSearchQuery ?? '',
    );
    const [useProducerSearch, setUseProducerSearch] = useState(
      stateUseProducerSearch ?? false,
    );
    const [searchMenuAnchorEl, setSearchMenuAnchorEl] =
      useState<HTMLElement | null>();

    const searchMenuOpen = Boolean(searchMenuAnchorEl);

    // Ensure component's state is in sync with external state
    useEffect(() => {
      setSearchQuery(stateSearchQuery ?? '');
    }, [stateSearchQuery]);

    useEffect(() => {
      setUseProducerSearch(stateUseProducerSearch ?? false);
    }, [stateUseProducerSearch]);

    return (
      <form
        className={clsx('legend-marketplace__search-bar', className)}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch?.(searchQuery, useProducerSearch);
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
                  {showSettings && (
                    <IconButton
                      onClick={(event) =>
                        setSearchMenuAnchorEl(event.currentTarget)
                      }
                      title="Search settings"
                    >
                      <TuneIcon />
                    </IconButton>
                  )}
                  <IconButton type="submit" title="Search">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {showSettings && (
          <Menu
            anchorEl={searchMenuAnchorEl}
            open={searchMenuOpen}
            onClose={() => setSearchMenuAnchorEl(null)}
          >
            <MenuItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={useProducerSearch}
                    onChange={(event) => {
                      setUseProducerSearch(event.target.checked);
                      LegendMarketplaceTelemetryHelper.logEvent_ToggleProducerSearch(
                        applicationStore.telemetryService,
                        event.target.checked,
                      );
                    }}
                  />
                }
                label={
                  <>
                    Producer Search{' '}
                    <LegendMarketplaceInfoTooltip title="Use this search if you have just created a data product and would like to immediately see it" />
                  </>
                }
              />
            </MenuItem>
          </Menu>
        )}
      </form>
    );
  },
);
