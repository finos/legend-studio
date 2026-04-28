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

import { Container, Paper, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { useCallback, useEffect, useRef } from 'react';
import { useSyncStateAndSearchParam } from '@finos/legend-application';
import { useSearchParams } from '@finos/legend-application/browser';
import { isNonEmptyString } from '@finos/legend-shared';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { DATAPRODUCT_TYPE } from '@finos/legend-extension-dsl-data-product';
import {
  LEGEND_MARKETPLACE_FIELD_SEARCH_RESULTS_QUERY_PARAM_TOKEN,
  generateLakehouseSearchResultsRoute,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import {
  useLegendMarketplaceFieldSearchResultsStore,
  withLegendMarketplaceFieldSearchResultsStore,
} from '../../../application/providers/LegendMarketplaceFieldSearchResultsStoreProvider.js';
import { FieldSearchFiltersPanel } from '../../../components/FieldSearchFiltersPanel/FieldSearchFiltersPanel.js';
import { FieldSearchResultListRow } from '../../../components/MarketplaceCard/FieldSearchResultListItem.js';
import { LegendMarketplaceSearchBar } from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { PaginationControls } from '../../../components/Pagination/PaginationControls.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { DataProductTypeFilter } from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceFieldSearchResultsStore } from '../../../stores/lakehouse/LegendMarketplaceFieldSearchResultsStore.js';
import { type FieldSearchDataProductEntry } from '../../../stores/lakehouse/fieldSearch/FieldSearchResultState.js';

const FieldSearchResultsContent = observer(
  (props: {
    fieldSearchResultsStore: LegendMarketplaceFieldSearchResultsStore;
    handlePageChange: (page: number) => void;
    handleItemsPerPageChange: (itemsPerPage: number) => void;
    handleToggleExpandRow: (rowId: string) => void;
    handleOpenDataProduct: (dataProduct: FieldSearchDataProductEntry) => void;
  }) => {
    const {
      fieldSearchResultsStore,
      handlePageChange,
      handleItemsPerPageChange,
      handleToggleExpandRow,
      handleOpenDataProduct,
    } = props;

    if (fieldSearchResultsStore.isLoading) {
      return (
        <div className="marketplace-lakehouse-search-results__loading-container">
          <CubesLoadingIndicator isLoading={true}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        </div>
      );
    }

    if (fieldSearchResultsStore.hasFailed) {
      return (
        <div className="marketplace-lakehouse-search-results__empty-state">
          <Typography
            variant="h5"
            className="marketplace-lakehouse-search-results__empty-state__title"
          >
            Field search failed
          </Typography>
          <Typography
            variant="body1"
            className="marketplace-lakehouse-search-results__empty-state__message"
          >
            {fieldSearchResultsStore.errorMessage}
          </Typography>
        </div>
      );
    }

    if (
      fieldSearchResultsStore.hasActiveFilters &&
      fieldSearchResultsStore.totalItems === 0
    ) {
      return (
        <div className="marketplace-lakehouse-search-results__empty-state">
          <Typography
            variant="h5"
            className="marketplace-lakehouse-search-results__empty-state__title"
          >
            No fields match the current filters
          </Typography>
          <Typography
            variant="body1"
            className="marketplace-lakehouse-search-results__empty-state__message"
          >
            Clear one or more filters to see results again.
          </Typography>
        </div>
      );
    }

    if (
      !fieldSearchResultsStore.hasActiveFilters &&
      isNonEmptyString(fieldSearchResultsStore.searchQuery) &&
      fieldSearchResultsStore.totalItems === 0
    ) {
      return (
        <div className="marketplace-lakehouse-search-results__empty-state">
          <Typography
            variant="h5"
            className="marketplace-lakehouse-search-results__empty-state__title"
          >
            No fields found
          </Typography>
          <Typography
            variant="body1"
            className="marketplace-lakehouse-search-results__empty-state__message"
          >
            Try a broader query or switch back to product search.
          </Typography>
        </div>
      );
    }

    if (fieldSearchResultsStore.tableRows.length === 0) {
      return null;
    }

    return (
      <>
        <Paper
          elevation={1}
          className="marketplace-lakehouse-field-search-results__list"
        >
          <div className="marketplace-lakehouse-field-search-results__list-header">
            <Typography className="marketplace-lakehouse-field-search-results__list-header-cell">
              Field Name
            </Typography>
            <Typography className="marketplace-lakehouse-field-search-results__list-header-cell">
              Type
            </Typography>
            <Typography className="marketplace-lakehouse-field-search-results__list-header-cell">
              Description
            </Typography>
            <Typography className="marketplace-lakehouse-field-search-results__list-header-cell">
              Data Products
            </Typography>
          </div>
          <div className="marketplace-lakehouse-field-search-results__list-body">
            {fieldSearchResultsStore.tableRows.map((row) => (
              <FieldSearchResultListRow
                key={row.id}
                fieldSearchResultState={row}
                expanded={fieldSearchResultsStore.isRowExpanded(row.id)}
                onToggleExpanded={handleToggleExpandRow}
                onOpenDataProduct={handleOpenDataProduct}
              />
            ))}
          </div>
        </Paper>
        <PaginationControls
          totalItems={fieldSearchResultsStore.totalItems}
          itemsPerPage={fieldSearchResultsStore.itemsPerPage}
          page={fieldSearchResultsStore.page}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          disabled={fieldSearchResultsStore.isLoading}
        />
      </>
    );
  },
);

const LegendMarketplaceFieldSearchResultsPage = observer(() => {
  const fieldSearchResultsStore = useLegendMarketplaceFieldSearchResultsStore();
  const marketplaceBaseStore = fieldSearchResultsStore.marketplaceBaseStore;
  const applicationStore = marketplaceBaseStore.applicationStore;
  const [searchParams, setSearchParams] = useSearchParams();
  const pageRef = useRef<HTMLDivElement>(null);

  useSyncStateAndSearchParam(
    fieldSearchResultsStore.searchQuery,
    useCallback(
      (val: string | null) => {
        if (val === null) {
          return;
        }
        fieldSearchResultsStore.setSearchQuery(val);
      },
      [fieldSearchResultsStore],
    ),
    LEGEND_MARKETPLACE_FIELD_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
    searchParams.get(
      LEGEND_MARKETPLACE_FIELD_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
    ),
    setSearchParams,
    useCallback(() => true, []),
  );

  useEffect(() => {
    flowResult(fieldSearchResultsStore.executeSearch()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [
    applicationStore,
    fieldSearchResultsStore,
    fieldSearchResultsStore.searchQuery,
  ]);

  const handlePageChange = useCallback(
    (page: number) => {
      pageRef.current?.scrollIntoView({ behavior: 'smooth' });
      flowResult(fieldSearchResultsStore.changePageAndFetch(page)).catch(
        applicationStore.alertUnhandledError,
      );
    },
    [fieldSearchResultsStore, applicationStore],
  );

  const handleItemsPerPageChange = useCallback(
    (itemsPerPage: number) => {
      flowResult(
        fieldSearchResultsStore.changeItemsPerPageAndFetch(itemsPerPage),
      ).catch(applicationStore.alertUnhandledError);
    },
    [fieldSearchResultsStore, applicationStore],
  );

  const handleToggleProductType = useCallback(
    (productType: DataProductTypeFilter) => {
      flowResult(
        fieldSearchResultsStore.toggleProductTypeAndFetch(productType),
      ).catch(applicationStore.alertUnhandledError);
    },
    [fieldSearchResultsStore, applicationStore],
  );

  const handleClearFilters = useCallback(() => {
    flowResult(fieldSearchResultsStore.clearAllFiltersAndFetch()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [fieldSearchResultsStore, applicationStore]);

  const handleSearch = useCallback(
    (
      query: string | undefined,
      useProducerSearch: boolean,
      useFieldSearch: boolean,
    ) => {
      if (!isNonEmptyString(query)) {
        return;
      }
      if (!useFieldSearch) {
        applicationStore.navigationService.navigator.goToLocation(
          generateLakehouseSearchResultsRoute(query, useProducerSearch),
        );
        return;
      }
      fieldSearchResultsStore.setSearchQuery(query);
      LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
        applicationStore.telemetryService,
        query,
        false,
        LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
        true,
      );
    },
    [applicationStore, fieldSearchResultsStore],
  );

  const handleOpenDataProduct = useCallback(
    (dataProduct: FieldSearchDataProductEntry) => {
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        applicationStore.telemetryService,
        {
          origin:
            dataProduct.productType === DataProductTypeFilter.LEGACY
              ? {
                  type: DATAPRODUCT_TYPE.SDLC,
                  groupId: dataProduct.groupId,
                  artifactId: dataProduct.artifactId,
                  versionId: dataProduct.versionId,
                  path: dataProduct.entityPath,
                }
              : {
                  type: DATAPRODUCT_TYPE.ADHOC,
                },
          dataProductId: dataProduct.dataProductId,
          name: dataProduct.name,
          deploymentId: dataProduct.deploymentId,
        },
        LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
      );
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          dataProduct.path,
        ),
      );
    },
    [applicationStore],
  );

  const handleToggleExpandRow = useCallback(
    (rowId: string) => {
      fieldSearchResultsStore.toggleExpandRow(rowId);
    },
    [fieldSearchResultsStore],
  );

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-search-results marketplace-lakehouse-field-search-results">
      <div ref={pageRef} />
      <Container className="marketplace-lakehouse-search-results__search-container">
        <LegendMarketplaceSearchBar
          showSettings={true}
          onSearch={handleSearch}
          stateSearchQuery={fieldSearchResultsStore.searchQuery}
          stateUseProducerSearch={false}
          stateUseFieldSearch={true}
          placeholder="Search Marketplace fields"
          className="marketplace-lakehouse-search-results__search-bar"
          enableAutosuggest={false}
        />
      </Container>
      <div className="legend-marketplace-search-results__sort-bar">
        <div className="legend-marketplace-search-results__sort-bar__container">
          <Typography
            variant="h4"
            className="marketplace-lakehouse-search-results__subtitles"
          >
            {fieldSearchResultsStore.totalFieldMatches} Fields
          </Typography>
        </div>
      </div>
      <Container
        maxWidth="xxxl"
        className="marketplace-lakehouse-search-results__results-container"
      >
        <div className="marketplace-lakehouse-search-results__results-layout">
          <div className="marketplace-lakehouse-search-results__sidebar">
            <FieldSearchFiltersPanel
              store={fieldSearchResultsStore}
              onToggleProductType={handleToggleProductType}
              onClearFilters={handleClearFilters}
            />
          </div>
          <div className="marketplace-lakehouse-search-results__main-content">
            <FieldSearchResultsContent
              fieldSearchResultsStore={fieldSearchResultsStore}
              handlePageChange={handlePageChange}
              handleItemsPerPageChange={handleItemsPerPageChange}
              handleToggleExpandRow={handleToggleExpandRow}
              handleOpenDataProduct={handleOpenDataProduct}
            />
          </div>
        </div>
      </Container>
    </LegendMarketplacePage>
  );
});

export const LegendMarketplaceFieldSearchResults =
  withLegendMarketplaceFieldSearchResultsStore(
    LegendMarketplaceFieldSearchResultsPage,
  );
