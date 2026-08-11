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
import { Chip, TextField, Typography } from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { DataProductSourceFilter } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceLakehouseAccessSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceLakehouseAccessSearchResultsStore.js';
import {
  FilterCheckboxOption,
  FilterSection,
} from '../MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

/**
 * Filters for the Lakehouse Access search experience.
 *
 * Deliberately narrower than {@link MarketplaceSearchFiltersPanel}: there is no taxonomy
 * section, because the server builds the taxonomy tree unscoped by product type and its
 * counts would describe the DataSpace corpus rather than the Lakehouse Data Products
 * shown here. Deployment ID takes its place.
 */
export const LakehouseAccessSearchFiltersPanel: React.FC<{
  store: LegendMarketplaceLakehouseAccessSearchResultsStore;
  onFiltersChanged: () => void;
}> = observer(({ store, onFiltersChanged }) => {
  const baseStore = useLegendMarketplaceBaseStore();
  const [deploymentIdInput, setDeploymentIdInput] = useState('');

  const triggerSearch = (): void => {
    store.setPage(1);
    onFiltersChanged();
  };

  const handleClearAll = (): void => {
    store.clearAllFilters();
    setDeploymentIdInput('');
    LegendMarketplaceTelemetryHelper.logEvent_ClearSearchFilters(
      baseStore.applicationStore.telemetryService,
      store.searchQuery,
    );
    triggerSearch();
  };

  const handleApplyDeploymentId = (): void => {
    const value = deploymentIdInput.trim();
    if (value.length === 0) {
      return;
    }
    store.addDeploymentId(value);
    setDeploymentIdInput('');
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      baseStore.applicationStore.telemetryService,
      'deployment_id',
      value,
      'select',
      store.searchQuery,
    );
    triggerSearch();
  };

  const handleRemoveDeploymentId = (deploymentId: string): void => {
    store.removeDeploymentId(deploymentId);
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      baseStore.applicationStore.telemetryService,
      'deployment_id',
      deploymentId,
      'deselect',
      store.searchQuery,
    );
    triggerSearch();
  };

  return (
    <div className="marketplace-search-filters-panel">
      <div className="marketplace-search-filters-panel__header">
        <Typography className="marketplace-search-filters-panel__header__title">
          Filters
        </Typography>
        {store.hasActiveFilters && (
          <Typography
            className="marketplace-search-filters-panel__header__clear"
            onClick={handleClearAll}
            role="button"
          >
            Clear all
          </Typography>
        )}
      </div>
      <div className="marketplace-search-filters-panel__content">
        {store.isFirstLoad ? (
          <CubesLoadingIndicator
            isLoading={true}
            className="marketplace-search-filters-panel__loading"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        ) : (
          <>
            <FilterSection title="Source">
              {Object.values(DataProductSourceFilter).map((value) => (
                <FilterCheckboxOption
                  key={value}
                  label={value}
                  checked={store.selectedSources.has(value)}
                  count={
                    value === DataProductSourceFilter.EXTERNAL
                      ? store.filterCounts.external_source_count
                      : store.filterCounts.internal_source_count
                  }
                  onChange={() => {
                    const isSelected = store.selectedSources.has(value);
                    store.toggleSource(value);
                    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
                      baseStore.applicationStore.telemetryService,
                      'source',
                      value,
                      isSelected ? 'deselect' : 'select',
                      store.searchQuery,
                    );
                    triggerSearch();
                  }}
                />
              ))}
            </FilterSection>
            <FilterSection title="Deployment ID">
              <TextField
                value={deploymentIdInput}
                onChange={(event) => setDeploymentIdInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleApplyDeploymentId();
                  }
                }}
                placeholder="e.g. 12345"
                size="small"
                fullWidth={true}
                slotProps={{
                  htmlInput: { 'aria-label': 'Deployment ID' },
                }}
                helperText="Press Enter to apply."
                className="marketplace-search-filters-panel__deployment-id-input"
              />
              {store.selectedDeploymentIds.size > 0 && (
                <div className="marketplace-search-filters-panel__chips">
                  {Array.from(store.selectedDeploymentIds).map(
                    (deploymentId) => (
                      <Chip
                        key={deploymentId}
                        label={deploymentId}
                        size="small"
                        onDelete={() => handleRemoveDeploymentId(deploymentId)}
                      />
                    ),
                  )}
                </div>
              )}
            </FilterSection>
          </>
        )}
      </div>
    </div>
  );
});
