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
import {
  CheckIcon,
  clsx,
  ViewHeadlineIcon,
  WindowIcon,
} from '@finos/legend-art';
import { FormControl, IconButton, MenuItem, Select } from '@mui/material';
import {
  DataProductSort,
  SearchResultsViewMode,
} from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';

/**
 * The tile/list view toggle plus the sort dropdown, shared by the DataSpaces and
 * Lakehouse Access search pages. Telemetry and store mutation stay with the caller
 * (via the click/change callbacks) so this component has no dependency on which
 * store — or which page's telemetry event — is involved.
 */
export const SearchResultsSortControls: React.FC<{
  viewMode: SearchResultsViewMode;
  onTileViewClick: () => void;
  onListViewClick: () => void;
  sort: DataProductSort;
  onSortChange: (sort: DataProductSort) => void;
}> = observer(
  ({ viewMode, onTileViewClick, onListViewClick, sort, onSortChange }) => (
    <div className="legend-marketplace-search-results__sort-bar__controls">
      <div className="legend-marketplace-search-results__view-toggle">
        <div
          className={clsx(
            'legend-marketplace-search-results__view-toggle__slider',
            viewMode === SearchResultsViewMode.LIST &&
              'legend-marketplace-search-results__view-toggle__slider--right',
          )}
        />
        <IconButton
          className={clsx(
            'legend-marketplace-search-results__view-toggle__btn',
            viewMode === SearchResultsViewMode.TILE &&
              'legend-marketplace-search-results__view-toggle__btn--active',
          )}
          onClick={onTileViewClick}
          title="Tile View"
          size="small"
        >
          <WindowIcon />
        </IconButton>
        <IconButton
          className={clsx(
            'legend-marketplace-search-results__view-toggle__btn',
            viewMode === SearchResultsViewMode.LIST &&
              'legend-marketplace-search-results__view-toggle__btn--active',
          )}
          onClick={onListViewClick}
          title="List View"
          size="small"
        >
          <ViewHeadlineIcon />
        </IconButton>
      </div>
      <span className="legend-marketplace-search-results__sort-bar__controls-divider" />
      <FormControl>
        <Select
          autoWidth={true}
          displayEmpty={true}
          value={'Sort'}
          onChange={(e) => {
            onSortChange(e.target.value as DataProductSort);
          }}
          className="legend-marketplace-search-results__sort-select"
        >
          <MenuItem disabled={true} value="Sort">
            Sort
          </MenuItem>
          {Object.values(DataProductSort).map((sortValue) => (
            <MenuItem
              key={sortValue}
              value={sortValue}
              sx={{
                gap: '0.5rem',
              }}
            >
              {sortValue}
              {sort === sortValue && <CheckIcon />}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  ),
);
