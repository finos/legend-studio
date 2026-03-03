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
import { useState, useCallback } from 'react';
import { Checkbox, Typography } from '@mui/material';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import type { TaxonomyNode } from '@finos/legend-server-marketplace';
import type { LegendMarketplaceSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import { useAuth } from 'react-oidc-context';

const TaxonomyTreeNode: React.FC<{
  node: TaxonomyNode;
  store: LegendMarketplaceSearchResultsStore;
  depth: number;
}> = observer(({ node, store, depth }) => {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = store.selectedTaxonomyNodeIds.has(node.id);
  const auth = useAuth();

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded],
  );

  const handleCheckboxChange = useCallback(() => {
    store.toggleTaxonomyNode(node.id);
    store.executeSearch(
      store.searchQuery ?? '',
      store.useProducerSearch ?? false,
      auth.user?.access_token,
    );
  }, [store, node.id, auth.user?.access_token]);

  return (
    <div className="taxonomy-filter-panel__tree-node">
      <div
        className="taxonomy-filter-panel__tree-node__row"
        style={{ paddingLeft: `${depth * 1.6}rem` }}
        onClick={handleCheckboxChange}
        role="button"
      >
        <div
          className="taxonomy-filter-panel__tree-node__expand-icon"
          onClick={hasChildren ? handleToggleExpand : undefined}
          role="button"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )
          ) : (
            <span className="taxonomy-filter-panel__tree-node__expand-icon--spacer" />
          )}
        </div>
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
          className="taxonomy-filter-panel__tree-node__label"
          title={node.label}
        >
          {node.label}
        </Typography>
      </div>
      {hasChildren && expanded && (
        <div className="taxonomy-filter-panel__tree-node__children">
          {node.children.map((child) => (
            <TaxonomyTreeNode
              key={child.id}
              node={child}
              store={store}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const TaxonomyFilterPanel: React.FC<{
  store: LegendMarketplaceSearchResultsStore;
}> = observer(({ store }) => {
  const isLoading = store.fetchingTaxonomyTreeState.isInProgress;
  const hasTree = store.taxonomyTree.length > 0;
  const auth = useAuth();

  const handleClearAll = useCallback(() => {
    store.setSelectedTaxonomyNodeIds([]);
    store.executeSearch(
      store.searchQuery ?? '',
      store.useProducerSearch ?? false,
      auth.user?.access_token,
    );
  }, [store, auth.user?.access_token]);

  return (
    <div className="taxonomy-filter-panel">
      <div className="taxonomy-filter-panel__header">
        <Typography className="taxonomy-filter-panel__header__title">
          Filters
        </Typography>
        {store.selectedTaxonomyNodeIds.size > 0 && (
          <Typography
            className="taxonomy-filter-panel__header__clear"
            onClick={handleClearAll}
            role="button"
          >
            Clear all
          </Typography>
        )}
      </div>
      <div className="taxonomy-filter-panel__content">
        {isLoading && (
          <CubesLoadingIndicator
            isLoading={true}
            className="taxonomy-filter-panel__loading"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        )}
        {!isLoading && !hasTree && (
          <Typography className="taxonomy-filter-panel__empty">
            No categories available
          </Typography>
        )}
        {!isLoading && hasTree && (
          <div className="taxonomy-filter-panel__tree">
            {store.taxonomyTree.map((node) => (
              <TaxonomyTreeNode
                key={node.id}
                node={node}
                store={store}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
