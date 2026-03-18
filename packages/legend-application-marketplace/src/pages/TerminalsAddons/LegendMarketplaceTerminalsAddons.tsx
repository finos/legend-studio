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
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import {
  Button,
  ButtonGroup,
  Tooltip,
  Typography,
  List,
  ListItem,
  CircularProgress,
} from '@mui/material';
import type { TerminalResult } from '@finos/legend-server-marketplace';
import { LegendMarketplaceTerminalCard } from '../../components/ProviderCard/LegendMarketplaceTerminalCard.js';
import {
  type LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../../stores/LegendMarketPlaceVendorDataStore.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useEffect, useCallback } from 'react';
import {
  useLegendMarketPlaceVendorDataStore,
  withLegendMarketplaceVendorDataStore,
} from '../../application/providers/LegendMarketplaceVendorDataProvider.js';
import { useParams } from '@finos/legend-application/browser';
import { InfoCircleIcon, UserSearchInput } from '@finos/legend-art';
import { flowResult } from 'mobx';
import type { LegendUser } from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { PaginationControls } from '../../components/Pagination/PaginationControls.js';
import { UserRenderer } from '@finos/legend-extension-dsl-data-product';

export const RefinedVendorRadioSelector = observer(
  (props: { vendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { vendorDataState } = props;
    const radioOptions = [
      VendorDataProviderType.ALL,
      VendorDataProviderType.TERMINAL_LICENSE,
      VendorDataProviderType.ADD_ONS,
    ];

    const onRadioChange = useCallback(
      (value: VendorDataProviderType) => {
        vendorDataState.setProviderDisplayState(value);
        flowResult(vendorDataState.populateProviders()).catch(
          vendorDataState.applicationStore.alertUnhandledError,
        );
      },
      [vendorDataState],
    );

    return (
      <ButtonGroup variant="outlined">
        {radioOptions.map((option) => (
          <Button
            key={option}
            onClick={() => onRadioChange(option)}
            variant={
              vendorDataState.providerDisplayState === option
                ? 'contained'
                : 'outlined'
            }
            sx={{
              fontSize: '12px',
              backgroundColor:
                vendorDataState.providerDisplayState === option
                  ? 'primary'
                  : 'white',
            }}
          >
            {option}
          </Button>
        ))}
      </ButtonGroup>
    );
  },
);

const SearchResultsRenderer = observer(
  (props: {
    vendorDataState: LegendMarketPlaceVendorDataStore;
    terminalResults: TerminalResult[];
    sectionTitle: VendorDataProviderType;
    totalCount?: number | undefined;
    seeAll?: boolean;
    tooltip?: string;
  }) => {
    const {
      vendorDataState,
      terminalResults,
      sectionTitle,
      totalCount,
      seeAll,
      tooltip,
    } = props;

    const showCount = vendorDataState.searchTerm.trim().length > 0;

    return (
      <div>
        <div className="legend-marketplace-vendordata-main-search-results__category">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            {sectionTitle}
            {showCount && (
              <span className="legend-marketplace-vendordata-main-sidebar__title__count">
                ({totalCount ?? terminalResults.length})
              </span>
            )}
          </div>
          {tooltip && (
            <Tooltip title={tooltip} placement={'right'} arrow={true}>
              <InfoCircleIcon />
            </Tooltip>
          )}
          {seeAll && (
            <button
              className="see-all"
              onClick={() => {
                vendorDataState.setProviderDisplayState(sectionTitle);
                flowResult(vendorDataState.populateProviders()).catch(
                  vendorDataState.applicationStore.alertUnhandledError,
                );
              }}
            >
              <strong>See All&gt;</strong>
            </button>
          )}
        </div>
        <div className="legend-marketplace-vendordata-main-search-results__card-group">
          {terminalResults.map((terminal) => (
            <LegendMarketplaceTerminalCard
              key={terminal.id}
              terminalResult={terminal}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const VendorDataMainContent = observer(
  (props: { marketPlaceVendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { marketPlaceVendorDataState } = props;

    const addOnsInfoMessage =
      'Add-ons cannot be ordered standalone. You must order terminal license with them.';

    const handlePageChange = useCallback(
      (page: number) => {
        marketPlaceVendorDataState.setPage(page);
        flowResult(marketPlaceVendorDataState.populateProviders()).catch(
          marketPlaceVendorDataState.applicationStore.alertUnhandledError,
        );
      },
      [marketPlaceVendorDataState],
    );

    const handleItemsPerPageChange = useCallback(
      (itemsPerPage: number) => {
        marketPlaceVendorDataState.setItemsPerPage(itemsPerPage);
        flowResult(marketPlaceVendorDataState.populateProviders()).catch(
          marketPlaceVendorDataState.applicationStore.alertUnhandledError,
        );
      },
      [marketPlaceVendorDataState],
    );

    return (
      <div className="legend-marketplace-vendordata-main">
        {marketPlaceVendorDataState.fetchingProvidersState.isInProgress ? (
          <div className="legend-marketplace-vendordata-main__loading">
            <CircularProgress />
          </div>
        ) : (
          <>
            <div className="legend-marketplace-vendordata-main-search-results">
              {marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ALL && (
                <>
                  <SearchResultsRenderer
                    vendorDataState={marketPlaceVendorDataState}
                    terminalResults={
                      marketPlaceVendorDataState.terminalProviders
                    }
                    sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
                    totalCount={marketPlaceVendorDataState.totalTerminalItems}
                    seeAll={true}
                  />
                  <hr />
                  <SearchResultsRenderer
                    vendorDataState={marketPlaceVendorDataState}
                    terminalResults={marketPlaceVendorDataState.addOnProviders}
                    sectionTitle={VendorDataProviderType.ADD_ONS}
                    totalCount={marketPlaceVendorDataState.totalAddOnItems}
                    seeAll={true}
                    tooltip={addOnsInfoMessage}
                  />
                </>
              )}
              {marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.TERMINAL_LICENSE && (
                <SearchResultsRenderer
                  vendorDataState={marketPlaceVendorDataState}
                  terminalResults={marketPlaceVendorDataState.providers}
                  sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
                  totalCount={marketPlaceVendorDataState.totalItems}
                  seeAll={false}
                />
              )}
              {marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ADD_ONS && (
                <SearchResultsRenderer
                  vendorDataState={marketPlaceVendorDataState}
                  terminalResults={marketPlaceVendorDataState.providers}
                  sectionTitle={VendorDataProviderType.ADD_ONS}
                  totalCount={marketPlaceVendorDataState.totalItems}
                  seeAll={false}
                  tooltip={addOnsInfoMessage}
                />
              )}
            </div>
            {(marketPlaceVendorDataState.providerDisplayState ===
              VendorDataProviderType.TERMINAL_LICENSE ||
              marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ADD_ONS) && (
              <PaginationControls
                totalItems={marketPlaceVendorDataState.totalItems}
                itemsPerPage={marketPlaceVendorDataState.itemsPerPage}
                page={marketPlaceVendorDataState.page}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </>
        )}
      </div>
    );
  },
);

export const LegendMarketplaceVendorData = withLegendMarketplaceVendorDataStore(
  observer(() => {
    const marketPlaceVendorDataStore = useLegendMarketPlaceVendorDataStore();

    const marketplaceStore = useLegendMarketplaceBaseStore();
    const cartStore = marketplaceStore.cartStore;

    const handleSearch = useCallback(
      (query: string | undefined) => {
        marketPlaceVendorDataStore.setSearchTerm(query ?? '');
        flowResult(marketPlaceVendorDataStore.populateProviders()).catch(
          marketPlaceVendorDataStore.applicationStore.alertUnhandledError,
        );
      },
      [marketPlaceVendorDataStore],
    );

    const handleSearchChange = useCallback(
      (query: string) => {
        if (query === '') {
          marketPlaceVendorDataStore.setSearchTerm('');
          flowResult(marketPlaceVendorDataStore.populateProviders()).catch(
            marketPlaceVendorDataStore.applicationStore.alertUnhandledError,
          );
        }
      },
      [marketPlaceVendorDataStore],
    );

    useEffect(() => {
      marketPlaceVendorDataStore.init();
    }, [marketPlaceVendorDataStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-vendor-data">
        <div className="legend-marketplace-banner">
          <div className="legend-marketplace-banner__search-bar">
            <LegendMarketplaceSearchBar
              onSearch={handleSearch}
              onChange={handleSearchChange}
              enableAutosuggest={false}
            />
          </div>
        </div>

        <div className="legend-marketplace-body__content">
          <div className="legend-marketplace-body__filter-bar">
            <div className="legend-marketplace-user-search-container">
              <span className="legend-marketplace-user-search-container__label">
                Target User:
              </span>
              <UserSearchInput
                className="legend-marketplace__user-input"
                userValue={marketPlaceVendorDataStore.selectedUser}
                setUserValue={(_user: LegendUser): void => {
                  if (!_user.id) {
                    marketPlaceVendorDataStore.resetSelectedUser();
                    cartStore.setTargetUser(undefined);
                  } else {
                    marketPlaceVendorDataStore.setSelectedUser(_user);
                    cartStore.setTargetUser(_user.id);
                  }
                }}
                userSearchService={marketplaceStore.userSearchService}
                label="Search user or kerberos"
                required={true}
                variant="outlined"
                renderOption={(optionProps, option) => (
                  <li {...optionProps} key={option.id}>
                    <UserRenderer
                      userId={option.id}
                      applicationStore={marketplaceStore.applicationStore}
                      userSearchService={marketplaceStore.userSearchService}
                      disableOnClick={true}
                    />
                  </li>
                )}
              />
            </div>
            <div className="legend-marketplace-body__tab">
              <RefinedVendorRadioSelector
                vendorDataState={marketPlaceVendorDataStore}
              />
            </div>
          </div>
          <VendorDataMainContent
            marketPlaceVendorDataState={marketPlaceVendorDataStore}
          />
        </div>
      </LegendMarketplacePage>
    );
  }),
);

export const LegendMarketplaceVendorDetails =
  withLegendMarketplaceVendorDataStore(
    observer(() => {
      const { vendorName } = useParams<Record<string, string | undefined>>();

      const vendorDatasets = ['Dataset 1', 'Dataset 2', 'Dataset 3'];

      return (
        <LegendMarketplacePage className="legend-marketplace-vendor-data">
          <div className="legend-marketplace-vendor-data__content">
            <Typography variant="h3" fontWeight="bold">
              {vendorName}
            </Typography>
            <List sx={{ listStyleType: 'disc', paddingLeft: '16px' }}>
              {vendorDatasets.map((dataset) => (
                <ListItem
                  key={dataset}
                  sx={{ display: 'list-item', padding: 'unset' }}
                >
                  {dataset}
                </ListItem>
              ))}
            </List>
          </div>
        </LegendMarketplacePage>
      );
    }),
  );
