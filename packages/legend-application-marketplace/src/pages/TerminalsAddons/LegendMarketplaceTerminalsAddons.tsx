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
import { type JSX, useEffect, useCallback } from 'react';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import {
  Tooltip,
  Typography,
  List,
  ListItem,
  CircularProgress,
} from '@mui/material';
import type {
  TerminalResult,
  TraderProfile,
} from '@finos/legend-server-marketplace';
import { LegendMarketplaceTerminalCard } from '../../components/ProviderCard/LegendMarketplaceTerminalCard.js';
import { LegendMarketplaceOrderProfileCard } from '../../components/ProviderCard/LegendMarketplaceOrderProfileCard.js';
import {
  type LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../../stores/LegendMarketPlaceVendorDataStore.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
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
import { LegendMarketplaceOptionSelector } from '../../components/OptionSelector/LegendMarketplaceOptionSelector.js';

export const RefinedVendorRadioSelector = observer(
  (props: { vendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { vendorDataState } = props;
    const radioOptions = [
      VendorDataProviderType.ALL,
      VendorDataProviderType.TERMINAL_LICENSE,
      VendorDataProviderType.ADD_ONS,
      VendorDataProviderType.ORDER_PROFILE,
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
      <LegendMarketplaceOptionSelector
        options={radioOptions}
        selectedOption={vendorDataState.providerDisplayState}
        onChange={onRadioChange}
        ariaLabel="Vendor data provider type"
      />
    );
  },
);

/**
 * Shared section wrapper that renders the header (title, count badge, tooltip,
 * "See All" button) plus any card content passed via the `renderCards` prop.
 * Use this as the base for both terminal/add-on and order-profile sections so
 * the header logic lives in exactly one place.
 */
const SearchResultsSection = observer(
  (props: {
    vendorDataState: LegendMarketPlaceVendorDataStore;
    sectionTitle: VendorDataProviderType;
    itemCount: number;
    totalCount: number | undefined;
    tooltip: string | undefined;
    seeAll: boolean | undefined;
    renderCards: () => JSX.Element;
  }): JSX.Element => {
    const {
      vendorDataState,
      sectionTitle,
      itemCount,
      totalCount,
      tooltip,
      seeAll,
      renderCards,
    } = props;
    const showCount = vendorDataState.searchTerm.trim().length > 0;

    return (
      <div>
        <div className="legend-marketplace-vendordata-main-search-results__category">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            {sectionTitle}
            {showCount && (
              <span className="legend-marketplace-vendordata-main-sidebar__title__count">
                ({totalCount ?? itemCount})
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
        {renderCards()}
      </div>
    );
  },
);

const SearchResultsRenderer = observer(
  (props: {
    vendorDataState: LegendMarketPlaceVendorDataStore;
    terminalResults: TerminalResult[];
    sectionTitle: VendorDataProviderType;
    totalCount?: number;
    seeAll?: boolean;
    tooltip?: string;
  }): JSX.Element => {
    const {
      vendorDataState,
      terminalResults,
      sectionTitle,
      totalCount,
      seeAll,
      tooltip,
    } = props;

    return (
      <SearchResultsSection
        vendorDataState={vendorDataState}
        sectionTitle={sectionTitle}
        itemCount={terminalResults.length}
        totalCount={totalCount}
        seeAll={seeAll}
        tooltip={tooltip}
        renderCards={() => (
          <div className="legend-marketplace-vendordata-main-search-results__card-group">
            {terminalResults.map((terminal) => (
              <LegendMarketplaceTerminalCard
                key={terminal.id}
                terminalResult={terminal}
              />
            ))}
          </div>
        )}
      />
    );
  },
);

const OrderProfileSearchResultsRenderer = observer(
  (props: {
    vendorDataState: LegendMarketPlaceVendorDataStore;
    traderProfiles: TraderProfile[];
    totalCount?: number;
    tooltip?: string;
    seeAll?: boolean;
  }): JSX.Element => {
    const { vendorDataState, traderProfiles, totalCount, tooltip, seeAll } =
      props;

    return (
      <SearchResultsSection
        vendorDataState={vendorDataState}
        sectionTitle={VendorDataProviderType.ORDER_PROFILE}
        itemCount={traderProfiles.length}
        totalCount={totalCount}
        seeAll={seeAll}
        tooltip={tooltip}
        renderCards={() =>
          traderProfiles.length === 0 ? (
            <div className="legend-marketplace-vendordata-main__empty">
              No Order Profiles available
            </div>
          ) : (
            <div className="legend-marketplace-vendordata-main-search-results__card-group">
              {traderProfiles.map((profile) => (
                <LegendMarketplaceOrderProfileCard
                  key={profile.id}
                  traderProfile={profile}
                />
              ))}
            </div>
          )
        }
      />
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
                  <hr />
                  <OrderProfileSearchResultsRenderer
                    vendorDataState={marketPlaceVendorDataState}
                    traderProfiles={
                      marketPlaceVendorDataState.traderProfileProviders
                    }
                    totalCount={
                      marketPlaceVendorDataState.totalTraderProfileItems
                    }
                    seeAll={true}
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
              {marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ORDER_PROFILE && (
                <OrderProfileSearchResultsRenderer
                  vendorDataState={marketPlaceVendorDataState}
                  traderProfiles={
                    marketPlaceVendorDataState.traderProfileAllProviders
                  }
                  totalCount={marketPlaceVendorDataState.totalItems}
                />
              )}
            </div>
            {(marketPlaceVendorDataState.providerDisplayState ===
              VendorDataProviderType.TERMINAL_LICENSE ||
              marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ADD_ONS ||
              marketPlaceVendorDataState.providerDisplayState ===
                VendorDataProviderType.ORDER_PROFILE) && (
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
                    flowResult(cartStore.setTargetUser(undefined)).catch(
                      marketplaceStore.applicationStore.alertUnhandledError,
                    );
                  } else {
                    marketPlaceVendorDataStore.setSelectedUser(_user);
                    flowResult(cartStore.setTargetUser(_user.id)).catch(
                      marketplaceStore.applicationStore.alertUnhandledError,
                    );
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
            <div className="legend-marketplace-body__action-buttons">
              {marketplaceStore.applicationStore.config.options
                .generalInquiriesUrl && (
                <Button
                  variant="outlined"
                  className="legend-marketplace-body__action-button"
                  onClick={() => {
                    const url =
                      marketplaceStore.applicationStore.config.options
                        .generalInquiriesUrl;
                    if (url) {
                      marketplaceStore.applicationStore.navigationService.navigator.visitAddress(
                        url,
                      );
                    }
                  }}
                >
                  General Inquiries
                </Button>
              )}
              {marketplaceStore.applicationStore.config.options
                .requestInternalAppUrl && (
                <Button
                  variant="outlined"
                  className="legend-marketplace-body__action-button"
                  onClick={() => {
                    const url =
                      marketplaceStore.applicationStore.config.options
                        .requestInternalAppUrl;
                    if (url) {
                      marketplaceStore.applicationStore.navigationService.navigator.visitAddress(
                        url,
                      );
                    }
                  }}
                >
                  Request Internal Application
                </Button>
              )}
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
