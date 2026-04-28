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
import { Typography } from '@mui/material';
import { DataProductTypeFilter } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceFieldSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceFieldSearchResultsStore.js';
import {
  FilterCheckboxOption,
  FilterSection,
} from '../MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';

export const FieldSearchFiltersPanel: React.FC<{
  store: LegendMarketplaceFieldSearchResultsStore;
  onToggleProductType: (productType: DataProductTypeFilter) => void;
  onClearFilters: () => void;
}> = observer(({ store, onToggleProductType, onClearFilters }) => (
  <div className="marketplace-search-filters-panel">
    <div className="marketplace-search-filters-panel__header">
      <Typography className="marketplace-search-filters-panel__header__title">
        Filters
      </Typography>
      {store.hasActiveFilters && (
        <button
          type="button"
          className="marketplace-search-filters-panel__header__clear"
          onClick={onClearFilters}
        >
          Clear all
        </button>
      )}
    </div>
    <div className="marketplace-search-filters-panel__content">
      <FilterSection title="Data Product Type">
        <FilterCheckboxOption
          label="Lakehouse"
          checked={store.selectedProductTypes.has(
            DataProductTypeFilter.LAKEHOUSE,
          )}
          count={store.lakehouseCount}
          onChange={() => onToggleProductType(DataProductTypeFilter.LAKEHOUSE)}
        />
        <FilterCheckboxOption
          label="Legacy"
          checked={store.selectedProductTypes.has(DataProductTypeFilter.LEGACY)}
          count={store.legacyCount}
          onChange={() => onToggleProductType(DataProductTypeFilter.LEGACY)}
        />
      </FilterSection>
    </div>
  </div>
));
