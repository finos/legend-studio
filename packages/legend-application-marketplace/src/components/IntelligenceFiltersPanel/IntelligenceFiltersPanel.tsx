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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { InputAdornment, TextField, Typography } from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from '@finos/legend-art';
import {
  FilterCheckboxOption,
  FilterSection,
} from '../MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';
import type { IntelligenceCatalogStore } from '../../stores/intelligence/IntelligenceCatalogStore.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

const COLLAPSED_VENDOR_COUNT = 8;

export const IntelligenceFiltersPanel: React.FC<{
  store: IntelligenceCatalogStore;
}> = observer(({ store }) => {
  const [isVendorSectionExpanded, setIsVendorSectionExpanded] = useState(false);
  const telemetryService =
    store.marketplaceBaseStore.applicationStore.telemetryService;
  // the clear control is both clickable and key-activated, so both routes report once
  const clearFilters = (): void => {
    LegendMarketplaceTelemetryHelper.logEvent_ClearIntelligenceCatalogFilters(
      telemetryService,
    );
    store.clearFilters();
  };
  const toggleVendorSection = (): void => {
    LegendMarketplaceTelemetryHelper.logEvent_ShowAllIntelligenceCatalogVendors(
      telemetryService,
      !isVendorSectionExpanded,
    );
    setIsVendorSectionExpanded(!isVendorSectionExpanded);
  };
  const vendors = isVendorSectionExpanded
    ? store.searchableVendors
    : store.searchableVendors.slice(0, COLLAPSED_VENDOR_COUNT);
  const hasHiddenVendors =
    store.searchableVendors.length > COLLAPSED_VENDOR_COUNT;

  return (
    <div className="marketplace-search-filters-panel">
      <div className="marketplace-search-filters-panel__header">
        <Typography className="marketplace-search-filters-panel__header__title">
          Filters
        </Typography>
        {store.hasActiveFilters && (
          <Typography
            className="marketplace-search-filters-panel__header__clear"
            onClick={clearFilters}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                clearFilters();
              }
            }}
          >
            Clear all
          </Typography>
        )}
      </div>
      <div className="marketplace-search-filters-panel__content">
        <FilterSection title="Provider">
          <div className="marketplace-search-filters-panel__search">
            <TextField
              variant="outlined"
              size="small"
              fullWidth={true}
              placeholder="Search providers..."
              value={store.vendorSearchTerm}
              onChange={(event) =>
                store.setVendorSearchTerm(event.target.value)
              }
              className="marketplace-search-filters-panel__search__input"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </div>
          {vendors.map((vendor) => (
            <FilterCheckboxOption
              key={vendor}
              label={vendor}
              checked={store.vendorFilters.includes(vendor)}
              onChange={() => {
                LegendMarketplaceTelemetryHelper.logEvent_ToggleIntelligenceCatalogVendorFilter(
                  telemetryService,
                  vendor,
                  !store.vendorFilters.includes(vendor),
                );
                store.toggleVendorFilter(vendor);
              }}
              count={store.countMcpServersForVendor(vendor)}
            />
          ))}
          {store.searchableVendors.length === 0 && (
            <Typography className="marketplace-search-filters-panel__empty">
              No providers match
            </Typography>
          )}
          {hasHiddenVendors && (
            <button
              type="button"
              className="marketplace-search-filters-panel__section__show-more"
              aria-expanded={isVendorSectionExpanded}
              onClick={toggleVendorSection}
            >
              <span className="marketplace-search-filters-panel__section__show-more__label">
                {isVendorSectionExpanded
                  ? 'Show less'
                  : `Show all ${store.searchableVendors.length}`}
              </span>
              <span className="marketplace-search-filters-panel__section__show-more__icon">
                {isVendorSectionExpanded ? (
                  <ChevronUpIcon />
                ) : (
                  <ChevronDownIcon />
                )}
              </span>
            </button>
          )}
        </FilterSection>
      </div>
    </div>
  );
});
