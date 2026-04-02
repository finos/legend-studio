/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Chip, InputAdornment, TextField, Typography } from '@mui/material';
import { SearchIcon, clsx } from '@finos/legend-art';
import type { LegendMarketplaceDataAPIsStore } from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';

const FilterSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="marketplace-search-filters-panel__section">
    <Typography className="marketplace-search-filters-panel__section__title">
      {title}
    </Typography>
    <div className="marketplace-search-filters-panel__section__options">
      {children}
    </div>
  </div>
);

const MultiValueFilter: React.FC<{
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  chipClassName?: string;
}> = observer(({ placeholder, values, onAdd, onRemove, chipClassName }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        onAdd(trimmed);
        setInputValue('');
      }
    }
  };

  return (
    <>
      <TextField
        variant="outlined"
        size="small"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        fullWidth={true}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        className="marketplace-search-filters-panel__search__input"
      />
      {values.length > 0 && (
        <div className="marketplace-search-filters-panel__tags">
          {values.map((value) => (
            <Chip
              key={value}
              label={value}
              size="small"
              onDelete={() => onRemove(value)}
              className={clsx(
                'marketplace-search-filters-panel__tag',
                chipClassName,
              )}
            />
          ))}
        </div>
      )}
    </>
  );
});

export const DataAPIsFiltersPanel: React.FC<{
  store: LegendMarketplaceDataAPIsStore;
}> = observer(({ store }) => (
  <div className="marketplace-search-filters-panel">
    <div className="marketplace-search-filters-panel__header">
      <Typography className="marketplace-search-filters-panel__header__title">
        Filters
      </Typography>
      {store.hasActiveFilters && (
        <Typography
          className="marketplace-search-filters-panel__header__clear"
          onClick={() => store.clearAllFilters()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              store.clearAllFilters();
            }
          }}
        >
          Clear all
        </Typography>
      )}
    </div>
    <div className="marketplace-search-filters-panel__content">
      <FilterSection title="Owner">
        <MultiValueFilter
          placeholder="Type kerberos ID and press Enter..."
          values={store.ownerFilters}
          onAdd={(v) => store.addOwnerFilter(v)}
          onRemove={(v) => store.removeOwnerFilter(v)}
          chipClassName="marketplace-search-filters-panel__tag--owner"
        />
      </FilterSection>

      <FilterSection title="Deployment ID">
        <MultiValueFilter
          placeholder="Type deployment ID and press Enter..."
          values={store.deploymentIdFilters}
          onAdd={(v) => store.addDeploymentIdFilter(v)}
          onRemove={(v) => store.removeDeploymentIdFilter(v)}
          chipClassName="marketplace-search-filters-panel__tag--did"
        />
      </FilterSection>
    </div>
  </div>
));
