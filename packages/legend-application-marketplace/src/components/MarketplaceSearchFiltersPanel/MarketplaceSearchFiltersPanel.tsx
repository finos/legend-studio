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
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Checkbox, InputAdornment, TextField, Typography } from '@mui/material';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  SearchIcon,
  TimesIcon,
} from '@finos/legend-art';
import type { TaxonomyNode } from '@finos/legend-server-marketplace';
import {
  type LegendMarketplaceSearchResultsStore,
  DataProductTypeFilter,
  DataProductSourceFilter,
} from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';

interface FlatSearchGroup {
  parentPath: string | undefined;
  matches: TaxonomyNode[];
}

const buildFlatSearchResults = (
  nodes: TaxonomyNode[],
  searchTerm: string,
): FlatSearchGroup[] => {
  if (!searchTerm.trim()) {
    return [];
  }
  const lowerTerm = searchTerm.toLowerCase();
  const groupMap = new Map<string, FlatSearchGroup>();

  const findMatches = (
    currentNodes: TaxonomyNode[],
    ancestorLabels: string[],
  ): void => {
    for (const node of currentNodes) {
      if (node.label.toLowerCase().includes(lowerTerm)) {
        const key =
          ancestorLabels.length > 0 ? ancestorLabels.join('.') : '__root__';
        let group = groupMap.get(key);
        if (!group) {
          group = {
            parentPath:
              ancestorLabels.length > 0 ? ancestorLabels.join('.') : undefined,
            matches: [],
          };
          groupMap.set(key, group);
        }
        group.matches.push(node);
      }
      findMatches(node.children, [...ancestorLabels, node.label]);
    }
  };

  findMatches(nodes, []);
  return Array.from(groupMap.values());
};

const TaxonomyTreeNode: React.FC<{
  node: TaxonomyNode;
  store: LegendMarketplaceSearchResultsStore;
  depth: number;
  onFilterChange: () => void;
}> = observer(({ node, store, depth, onFilterChange }) => {
  const baseStore = useLegendMarketplaceBaseStore();
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = store.selectedTaxonomyNodeIds.has(node.id);

  const showCount = node.count > 0 && !(hasChildren && expanded);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded],
  );

  const handleCheckboxChange = useCallback(() => {
    const wasSelected = store.selectedTaxonomyNodeIds.has(node.id);
    store.toggleTaxonomyNode(node.id);
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      baseStore.applicationStore.telemetryService,
      'taxonomy',
      node.id,
      wasSelected ? 'deselect' : 'select',
      store.searchQuery,
    );
    onFilterChange();
  }, [store, node.id, onFilterChange, baseStore]);

  const renderExpandIcon = (): React.ReactNode => {
    if (!hasChildren) {
      return (
        <span className="marketplace-search-filters-panel__tree-node__expand-icon--spacer" />
      );
    }
    return expanded ? <ChevronDownIcon /> : <ChevronRightIcon />;
  };

  return (
    <div className="marketplace-search-filters-panel__tree-node">
      <div
        className="marketplace-search-filters-panel__tree-node__row"
        style={{ paddingLeft: `${depth * 1.6}rem` }}
        role="button"
        tabIndex={0}
        onClick={handleCheckboxChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCheckboxChange();
          }
        }}
      >
        <button
          className="marketplace-search-filters-panel__tree-node__expand-icon"
          onClick={hasChildren ? handleToggleExpand : undefined}
        >
          {renderExpandIcon()}
        </button>
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          size="small"
          sx={{
            padding: '0.2rem',
            '& .MuiSvgIcon-root': { fontSize: '2rem' },
          }}
        />
        <Typography
          className="marketplace-search-filters-panel__tree-node__label"
          title={node.label}
        >
          {node.label}
        </Typography>
        {showCount && (
          <span className="marketplace-search-filters-panel__count">
            {node.count}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="marketplace-search-filters-panel__tree-node__children">
          {node.children.map((child) => (
            <TaxonomyTreeNode
              key={child.id}
              node={child}
              store={store}
              depth={depth + 1}
              onFilterChange={onFilterChange}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const FilterSection: React.FC<{
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

export const FilterCheckboxOption: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = observer(({ label, checked, onChange, count }) => (
  <div
    className="marketplace-search-filters-panel__section__option"
    role="button"
    tabIndex={0}
    onClick={onChange}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange();
      }
    }}
  >
    <Checkbox
      checked={checked}
      onChange={onChange}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      size="small"
      sx={{
        padding: '0.2rem',
        '& .MuiSvgIcon-root': { fontSize: '2rem' },
      }}
    />
    <Typography className="marketplace-search-filters-panel__section__option__label">
      {label}
    </Typography>
    {count !== undefined && count > 0 && (
      <span className="marketplace-search-filters-panel__count">{count}</span>
    )}
  </div>
));

const renderTaxonomySearchResults = (
  flatSearchResults: FlatSearchGroup[],
  filterSearchTerm: string,
  store: LegendMarketplaceSearchResultsStore,
  baseStore: LegendMarketplaceBaseStore,
  triggerSearch: () => void,
): React.ReactNode => {
  if (flatSearchResults.length === 0) {
    return (
      <div className="marketplace-search-filters-panel__empty">
        No categories match &quot;{filterSearchTerm}&quot;
      </div>
    );
  }
  return (
    <div className="marketplace-search-filters-panel__tree">
      {flatSearchResults.map((group, idx) => (
        <div
          key={group.parentPath ?? `__root__${String(idx)}`}
          className="marketplace-search-filters-panel__tree-node"
        >
          {group.parentPath !== undefined && (
            <div
              className="marketplace-search-filters-panel__tree-node__row"
              style={{ opacity: 0.7 }}
            >
              <span className="marketplace-search-filters-panel__tree-node__expand-icon--spacer" />
              <Typography
                className="marketplace-search-filters-panel__tree-node__label"
                style={{ fontWeight: 600 }}
                title={group.parentPath}
              >
                {group.parentPath}
              </Typography>
            </div>
          )}
          {group.matches.map((matchNode) => {
            const handleFlatNodeToggle = (): void => {
              const wasSelected = store.selectedTaxonomyNodeIds.has(
                matchNode.id,
              );
              store.simpleToggleTaxonomyNode(matchNode.id);
              LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
                baseStore.applicationStore.telemetryService,
                'taxonomy',
                matchNode.id,
                wasSelected ? 'deselect' : 'select',
                store.searchQuery,
              );
              triggerSearch();
            };
            return (
              <div
                key={matchNode.id}
                className="marketplace-search-filters-panel__tree-node__row"
                role="button"
                tabIndex={0}
                style={{
                  paddingLeft:
                    group.parentPath === undefined ? undefined : '1.6rem',
                }}
                onClick={handleFlatNodeToggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFlatNodeToggle();
                  }
                }}
              >
                <span className="marketplace-search-filters-panel__tree-node__expand-icon--spacer" />
                <Checkbox
                  checked={store.selectedTaxonomyNodeIds.has(matchNode.id)}
                  onChange={handleFlatNodeToggle}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  size="small"
                  sx={{
                    padding: '0.2rem',
                    '& .MuiSvgIcon-root': {
                      fontSize: '2rem',
                    },
                  }}
                />
                <Typography
                  className="marketplace-search-filters-panel__tree-node__label"
                  title={matchNode.label}
                >
                  {matchNode.label}
                </Typography>
                {matchNode.count > 0 && (
                  <span className="marketplace-search-filters-panel__count">
                    {matchNode.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const renderTaxonomyTree = (
  store: LegendMarketplaceSearchResultsStore,
  triggerSearch: () => void,
): React.ReactNode => (
  <div className="marketplace-search-filters-panel__tree">
    {store.taxonomyTree.map((node) => (
      <TaxonomyTreeNode
        key={node.id}
        node={node}
        store={store}
        depth={0}
        onFilterChange={triggerSearch}
      />
    ))}
  </div>
);

export const MarketplaceSearchFiltersPanel: React.FC<{
  store: LegendMarketplaceSearchResultsStore;
}> = observer(({ store }) => {
  const isFirstLoad = store.executingSemanticSearchState.isInInitialState;
  const hasTree = store.taxonomyTree.length > 0;
  const auth = useAuth();
  const baseStore = useLegendMarketplaceBaseStore();
  const [filterSearchTerm, setFilterSearchTerm] = useState('');

  const tokenRef = useRef(auth.user?.access_token);

  useEffect(() => {
    tokenRef.current = auth.user?.access_token;
  }, [auth.user?.access_token]);

  const flatSearchResults = useMemo(
    () => buildFlatSearchResults(store.taxonomyTree, filterSearchTerm),
    [store.taxonomyTree, filterSearchTerm],
  );
  const isSearchActive = filterSearchTerm.trim().length > 0;

  const triggerSearch = useCallback(() => {
    store.setPage(1);
    store.executeSearch(
      store.searchQuery ?? '',
      store.useProducerSearch ?? false,
      tokenRef.current,
    );
  }, [store]);

  const handleClearAll = useCallback(() => {
    store.clearAllFilters();
    setFilterSearchTerm('');
    LegendMarketplaceTelemetryHelper.logEvent_ClearSearchFilters(
      baseStore.applicationStore.telemetryService,
      store.searchQuery,
    );
    triggerSearch();
  }, [store, baseStore, triggerSearch]);

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
        {isFirstLoad ? (
          <CubesLoadingIndicator
            isLoading={true}
            className="marketplace-search-filters-panel__loading"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        ) : (
          <>
            <FilterSection title="Data Product Type">
              {Object.values(DataProductTypeFilter).map((value) => (
                <FilterCheckboxOption
                  key={value}
                  label={
                    value === DataProductTypeFilter.LAKEHOUSE
                      ? 'Lakehouse'
                      : 'Legacy'
                  }
                  checked={store.selectedDataProductTypes.has(value)}
                  count={
                    value === DataProductTypeFilter.LAKEHOUSE
                      ? store.filterCounts.lakehouse_count
                      : store.filterCounts.legacy_count
                  }
                  onChange={() => {
                    const isSelected =
                      store.selectedDataProductTypes.has(value);
                    store.toggleDataProductType(value);
                    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
                      baseStore.applicationStore.telemetryService,
                      'dataProductType',
                      value,
                      isSelected ? 'deselect' : 'select',
                      store.searchQuery,
                    );
                    triggerSearch();
                  }}
                />
              ))}
            </FilterSection>
            <FilterSection title="Source">
              {Object.values(DataProductSourceFilter).map((value) => (
                <FilterCheckboxOption
                  key={value}
                  label={value}
                  checked={store.selectedSources.has(value)}
                  count={
                    value === DataProductSourceFilter.EXTERNAL
                      ? store.filterCounts.external_source_count
                      : store.totalItems -
                        store.filterCounts.external_source_count
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
            {hasTree && (
              <FilterSection title="Taxonomy">
                <div className="marketplace-search-filters-panel__search">
                  <TextField
                    className="marketplace-search-filters-panel__search__input"
                    placeholder="Search taxonomy..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    size="small"
                    fullWidth={true}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: isSearchActive ? (
                          <InputAdornment position="end">
                            <TimesIcon
                              className="marketplace-search-filters-panel__search__clear"
                              onClick={() => setFilterSearchTerm('')}
                            />
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                  />
                </div>
                {isSearchActive
                  ? renderTaxonomySearchResults(
                      flatSearchResults,
                      filterSearchTerm,
                      store,
                      baseStore,
                      triggerSearch,
                    )
                  : renderTaxonomyTree(store, triggerSearch)}
              </FilterSection>
            )}
          </>
        )}
      </div>
    </div>
  );
});
