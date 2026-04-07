/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import {
  useLegendMarketplaceDataAPIsStore,
  withLegendMarketplaceDataAPIsStore,
} from '../../application/providers/LegendMarketplaceDataAPIsStoreProvider.js';
import { useCallback, useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import {
  CheckIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  StarIcon,
  ViewHeadlineIcon,
  WindowIcon,
  clsx,
} from '@finos/legend-art';
import {
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import {
  type LegendServiceCardState,
  LegendServiceSort,
  ServicesViewMode,
} from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import { LegendServiceCard } from '../../components/LegendServiceCard/LegendServiceCard.js';
import { LegendServiceListRow } from '../../components/LegendServiceCard/LegendServiceListRow.js';
import { PaginationControls } from '../../components/Pagination/PaginationControls.js';
import { DataAPIsFiltersPanel } from '../../components/DataAPIsFiltersPanel/DataAPIsFiltersPanel.js';
import { useSearchParams } from '@finos/legend-application/browser';
import { LEGEND_MARKETPLACE_DATA_APIS_QUERY_PARAM_TOKEN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

export const LegendMarketplaceDataAPIs = withLegendMarketplaceDataAPIsStore(
  observer(() => {
    const dataAPIsStore = useLegendMarketplaceDataAPIsStore();
    const applicationStore =
      dataAPIsStore.marketplaceBaseStore.applicationStore;
    const [searchParams, setSearchParams] = useSearchParams();
    const { viewMode } = dataAPIsStore;
    const pageRef = useRef<HTMLDivElement>(null);
    const queryFromUrl = searchParams.get(
      LEGEND_MARKETPLACE_DATA_APIS_QUERY_PARAM_TOKEN.QUERY,
    );

    useEffect(() => {
      if (queryFromUrl) {
        dataAPIsStore.setSearchQuery(queryFromUrl);
      }
      flowResult(dataAPIsStore.fetchAllServices()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [dataAPIsStore, applicationStore, queryFromUrl]);

    const handlePageChange = useCallback(
      (page: number) => {
        dataAPIsStore.setPage(page);
        pageRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      [dataAPIsStore],
    );

    const handleItemsPerPageChange = useCallback(
      (itemsPerPage: number) => {
        dataAPIsStore.setItemsPerPage(itemsPerPage);
      },
      [dataAPIsStore],
    );

    const handleSearch = useCallback(
      (query: string | undefined) => {
        dataAPIsStore.setSearchQuery(query ?? '');
        if (query) {
          LegendMarketplaceTelemetryHelper.logEvent_SearchServices(
            applicationStore.telemetryService,
            query,
          );
        }
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (query) {
            next.set(
              LEGEND_MARKETPLACE_DATA_APIS_QUERY_PARAM_TOKEN.QUERY,
              query,
            );
          } else {
            next.delete(LEGEND_MARKETPLACE_DATA_APIS_QUERY_PARAM_TOKEN.QUERY);
          }
          return next;
        });
      },
      [dataAPIsStore, setSearchParams, applicationStore],
    );

    const handleServiceClick = useCallback(
      (serviceCardState: LegendServiceCardState) => {
        LegendMarketplaceTelemetryHelper.logEvent_ClickServiceCard(
          applicationStore.telemetryService,
          serviceCardState.service.pattern,
          serviceCardState.title,
        );
        const legendServicesUrl =
          dataAPIsStore.marketplaceBaseStore.applicationStore.config
            .legendServicesUrl;
        if (legendServicesUrl) {
          const encodedPattern = serviceCardState.service.pattern
            .replace(/^\//, '')
            .replaceAll('/', '%2F');
          applicationStore.navigationService.navigator.visitAddress(
            `${legendServicesUrl}/${encodedPattern}`,
          );
        }
      },
      [dataAPIsStore, applicationStore],
    );

    const renderServiceView = (): React.ReactNode => {
      switch (viewMode) {
        case ServicesViewMode.LIST:
          return (
            <>
              <div className="marketplace-alloy-service-list">
                {dataAPIsStore.paginatedServices.map((serviceCardState) => (
                  <LegendServiceListRow
                    key={serviceCardState.guid}
                    serviceCardState={serviceCardState}
                    onClick={() => handleServiceClick(serviceCardState)}
                    isFavorite={dataAPIsStore.isFavorite(
                      serviceCardState.service.pattern,
                    )}
                    onToggleFavorite={() =>
                      dataAPIsStore.toggleFavorite(
                        serviceCardState.service.pattern,
                      )
                    }
                  />
                ))}
              </div>
              {dataAPIsStore.isLoading && (
                <CubesLoadingIndicator
                  isLoading={true}
                  className="marketplace-lakehouse-search-results__loading-data-products-indicator"
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
              )}
            </>
          );
        case ServicesViewMode.TILE:
          return (
            <Grid
              container={true}
              spacing={{ xs: 2, sm: 3, xxl: 4 }}
              columns={{ sm: 1, md: 2, lg: 3, xxl: 4 }}
              className="marketplace-lakehouse-search-results__data-product-cards"
            >
              {dataAPIsStore.paginatedServices.map((serviceCardState) => (
                <Grid key={serviceCardState.guid} size={1}>
                  <LegendServiceCard
                    serviceCardState={serviceCardState}
                    onClick={() => handleServiceClick(serviceCardState)}
                    isFavorite={dataAPIsStore.isFavorite(
                      serviceCardState.service.pattern,
                    )}
                    onToggleFavorite={() =>
                      dataAPIsStore.toggleFavorite(
                        serviceCardState.service.pattern,
                      )
                    }
                  />
                </Grid>
              ))}
              {dataAPIsStore.isLoading && (
                <Grid size={1}>
                  <CubesLoadingIndicator
                    isLoading={true}
                    className="marketplace-lakehouse-search-results__loading-data-products-indicator"
                  >
                    <CubesLoadingIndicatorIcon />
                  </CubesLoadingIndicator>
                </Grid>
              )}
            </Grid>
          );
        default:
          return null;
      }
    };

    return (
      <LegendMarketplacePage className="marketplace-data-apis">
        <div ref={pageRef} />
        <Container className="marketplace-data-apis__search-container">
          <LegendMarketplaceSearchBar
            stateSearchQuery={dataAPIsStore.searchQuery}
            onSearch={(query) => handleSearch(query)}
            placeholder="Search Legend Services..."
            className="marketplace-data-apis__search-bar"
            enableAutosuggest={false}
          />
        </Container>
        <div className="legend-marketplace-search-results__sort-bar">
          <div className="legend-marketplace-search-results__sort-bar__container">
            <Typography
              variant="h4"
              className="marketplace-lakehouse-search-results__subtitles"
            >
              {dataAPIsStore.totalFilteredCount} Services
            </Typography>
            <div className="legend-marketplace-search-results__sort-bar__controls">
              <FormControlLabel
                className="legend-marketplace-search-results__own-services-toggle"
                control={
                  <Switch
                    checked={dataAPIsStore.showOwnServicesOnly}
                    onChange={(e) => {
                      dataAPIsStore.setShowOwnServicesOnly(e.target.checked);
                    }}
                    size="small"
                  />
                }
                label="My Services"
              />
              <span className="legend-marketplace-search-results__sort-bar__controls-divider" />
              <IconButton
                className={clsx(
                  'legend-marketplace-search-results__favorites-toggle',
                  dataAPIsStore.showFavoritesOnly &&
                    'legend-marketplace-search-results__favorites-toggle--active',
                )}
                onClick={() =>
                  dataAPIsStore.setShowFavoritesOnly(
                    !dataAPIsStore.showFavoritesOnly,
                  )
                }
                title={
                  dataAPIsStore.showFavoritesOnly
                    ? 'Show all services'
                    : 'Show favorites only'
                }
                size="small"
              >
                <StarIcon />
              </IconButton>
              <span className="legend-marketplace-search-results__sort-bar__controls-divider" />
              <div className="legend-marketplace-search-results__view-toggle">
                <div
                  className={clsx(
                    'legend-marketplace-search-results__view-toggle__slider',
                    viewMode === ServicesViewMode.LIST &&
                      'legend-marketplace-search-results__view-toggle__slider--right',
                  )}
                />
                <IconButton
                  className={clsx(
                    'legend-marketplace-search-results__view-toggle__btn',
                    viewMode === ServicesViewMode.TILE &&
                      'legend-marketplace-search-results__view-toggle__btn--active',
                  )}
                  onClick={() => {
                    dataAPIsStore.setViewMode(ServicesViewMode.TILE);
                    dataAPIsStore.setPage(1);
                    LegendMarketplaceTelemetryHelper.logEvent_ToggleServicesViewMode(
                      applicationStore.telemetryService,
                      ServicesViewMode.TILE,
                    );
                  }}
                  title="Tile View"
                  size="small"
                >
                  <WindowIcon />
                </IconButton>
                <IconButton
                  className={clsx(
                    'legend-marketplace-search-results__view-toggle__btn',
                    viewMode === ServicesViewMode.LIST &&
                      'legend-marketplace-search-results__view-toggle__btn--active',
                  )}
                  onClick={() => {
                    dataAPIsStore.setViewMode(ServicesViewMode.LIST);
                    dataAPIsStore.setPage(1);
                    LegendMarketplaceTelemetryHelper.logEvent_ToggleServicesViewMode(
                      applicationStore.telemetryService,
                      ServicesViewMode.LIST,
                    );
                  }}
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
                  value={dataAPIsStore.sort}
                  renderValue={() => 'Sort'}
                  onChange={(e) => {
                    const sortValue = e.target.value as LegendServiceSort;
                    dataAPIsStore.setSort(sortValue);
                    LegendMarketplaceTelemetryHelper.logEvent_SortServices(
                      applicationStore.telemetryService,
                      sortValue,
                    );
                  }}
                  className="legend-marketplace-search-results__sort-select"
                >
                  <MenuItem disabled={true} value="Sort">
                    Sort
                  </MenuItem>
                  {Object.values(LegendServiceSort).map((sortValue) => (
                    <MenuItem
                      key={sortValue}
                      value={sortValue}
                      className="legend-marketplace-search-results__sort-menu-item"
                    >
                      {sortValue}
                      {dataAPIsStore.sort === sortValue && <CheckIcon />}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        </div>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-search-results__results-container"
        >
          <div className="marketplace-lakehouse-search-results__results-layout">
            <div className="marketplace-lakehouse-search-results__sidebar">
              <DataAPIsFiltersPanel store={dataAPIsStore} />
            </div>
            <div className="marketplace-lakehouse-search-results__main-content">
              {dataAPIsStore.serviceCardStates.length > 0 &&
              dataAPIsStore.totalFilteredCount === 0 ? (
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
                    We couldn&apos;t find any Services matching your search. Try
                    adjusting your search terms or clearing filters.
                  </Typography>
                </div>
              ) : (
                <>
                  <div
                    key={viewMode}
                    className="marketplace-data-apis__view-content"
                  >
                    {renderServiceView()}
                  </div>
                  <PaginationControls
                    totalItems={dataAPIsStore.totalFilteredCount}
                    itemsPerPage={dataAPIsStore.itemsPerPage}
                    page={dataAPIsStore.page}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    disabled={dataAPIsStore.isLoading}
                  />
                </>
              )}
            </div>
          </div>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
