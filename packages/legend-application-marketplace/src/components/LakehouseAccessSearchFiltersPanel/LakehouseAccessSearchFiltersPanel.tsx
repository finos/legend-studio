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
import { Chip, TextField } from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import type { DeploymentIdFilterableSearchStore } from '../../stores/lakehouse/LegendMarketplaceLakehouseAccessSearchResultsStore.js';
import {
  FilterSection,
  FiltersPanelHeader,
  SourceFilterSection,
} from '../MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';

/**
 * Filters for the Lakehouse Access search experience.
 *
 * Deliberately narrower than {@link MarketplaceSearchFiltersPanel}: there is no taxonomy
 * section, because the server builds the taxonomy tree unscoped by product type and its
 * counts would describe the DataSpace corpus rather than the Lakehouse Data Products
 * shown here. Deployment ID takes its place. Shares the header chrome and Source
 * section with {@link MarketplaceSearchFiltersPanel} rather than duplicating them.
 */
export const LakehouseAccessSearchFiltersPanel: React.FC<{
  store: DeploymentIdFilterableSearchStore;
  onFiltersChanged: () => void;
}> = observer(({ store, onFiltersChanged }) => {
  const [deploymentIdInput, setDeploymentIdInput] = useState('');

  const triggerSearch = (): void => {
    store.setPage(1);
    onFiltersChanged();
  };

  const handleClearAll = (): void => {
    store.clearAllFilters();
    setDeploymentIdInput('');
    triggerSearch();
  };

  const handleApplyDeploymentId = (): void => {
    if (deploymentIdInput.trim().length === 0) {
      return;
    }
    store.addDeploymentId(deploymentIdInput);
    setDeploymentIdInput('');
    triggerSearch();
  };

  const handleRemoveDeploymentId = (deploymentId: string): void => {
    store.removeDeploymentId(deploymentId);
    triggerSearch();
  };

  return (
    <div className="marketplace-search-filters-panel">
      <FiltersPanelHeader
        hasActiveFilters={store.hasActiveFilters}
        onClearAll={handleClearAll}
      />
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
            <SourceFilterSection store={store} onFilterChange={triggerSearch} />
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
                onBlur={handleApplyDeploymentId}
                placeholder="e.g. 12345"
                size="small"
                fullWidth={true}
                slotProps={{
                  htmlInput: { 'aria-label': 'Deployment ID' },
                }}
                helperText="Press Enter or click away to apply."
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
