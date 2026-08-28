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
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import { Grid, Tooltip, Typography } from '@mui/material';
import { SearchResultsViewMode } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import { LakehouseProductCard } from '../LakehouseProductCard/LakehouseProductCard.js';
import { LakehouseProductListItem } from '../LakehouseProductCard/LakehouseProductListItem.js';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { PaginationControls } from '../Pagination/PaginationControls.js';

/**
 * Shared body of a marketplace search results page: loading state, empty state, the
 * tile/list product grid, the "show all" prompt, and pagination. Used by both the
 * DataSpaces and Lakehouse Access pages, which differ only in what feeds these props —
 * `canShowAll` in particular folds in whatever page-specific conditions (e.g. producer
 * search) gate the "show all" prompt on a given page, so this component doesn't need to
 * know about them.
 */
export const SearchResultsCardGrid: React.FC<{
  isLoading: boolean;
  totalItems: number;
  viewMode: SearchResultsViewMode;
  products: ProductCardState[] | undefined;
  onProductCardClick: (productCardState: ProductCardState) => void;
  canShowAll: boolean;
  onShowAllProducts: () => void;
  itemsPerPage: number;
  page: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}> = observer(
  ({
    isLoading,
    totalItems,
    viewMode,
    products,
    onProductCardClick,
    canShowAll,
    onShowAllProducts,
    itemsPerPage,
    page,
    onPageChange,
    onItemsPerPageChange,
  }) => {
    if (isLoading) {
      return (
        <div className="marketplace-lakehouse-search-results__loading-container">
          <CubesLoadingIndicator
            isLoading={true}
            className="marketplace-lakehouse-search-results__loading-data-products-indicator"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        </div>
      );
    }
    if (totalItems === 0) {
      return (
        <div className="marketplace-lakehouse-search-results__empty-state">
          <Typography
            variant="h5"
            className="marketplace-lakehouse-search-results__empty-state__title"
          >
            No results found
          </Typography>
          <Typography
            variant="body1"
            className="marketplace-lakehouse-search-results__empty-state__message"
          >
            We couldn&apos;t find any data products matching your search. Try
            adjusting your search terms or clearing filters.
          </Typography>
        </div>
      );
    }
    return (
      <>
        {viewMode === SearchResultsViewMode.TILE && (
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, xxl: 4 }}
            columns={{ sm: 1, md: 2, lg: 3, xxl: 4 }}
            className="marketplace-lakehouse-search-results__data-product-cards"
          >
            {products?.map((productCardState) => (
              <Grid key={productCardState.guid} size={1}>
                <LakehouseProductCard
                  productCardState={productCardState}
                  moreInfoPreview="small"
                  onClick={() => onProductCardClick(productCardState)}
                />
              </Grid>
            ))}
          </Grid>
        )}
        {viewMode === SearchResultsViewMode.LIST && (
          <div className="marketplace-lakehouse-search-results__list-view">
            {products?.map((productCardState) => (
              <LakehouseProductListItem
                key={productCardState.guid}
                productCardState={productCardState}
                onClick={onProductCardClick}
              />
            ))}
          </div>
        )}
        {canShowAll && (
          <div className="marketplace-lakehouse-search-results__show-all-container">
            <div className="marketplace-lakehouse-search-results__show-all-text-row">
              <Typography
                variant="body1"
                className="marketplace-lakehouse-search-results__show-all-text"
              >
                Can&apos;t find what you&apos;re looking for?
              </Typography>
              <Tooltip
                title="Data products might be automatically filtered out if they are identified as duplicates (e.g. QA, UAT, DEV)"
                placement="top"
                arrow={true}
              >
                <span className="marketplace-lakehouse-search-results__show-all-info-icon">
                  <InfoCircleIcon />
                </span>
              </Tooltip>
            </div>
            <button
              className="marketplace-lakehouse-search-results__show-all-btn"
              onClick={onShowAllProducts}
            >
              Show all data products
            </button>
          </div>
        )}
        <PaginationControls
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          page={page}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          disabled={isLoading}
        />
      </>
    );
  },
);
