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

import { observer } from 'mobx-react-lite';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import {
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  Tooltip,
  Typography,
} from '@mui/material';
import { useApplicationStore } from '@finos/legend-application';
import type { Filter, ProviderResult } from '@finos/legend-server-marketplace';
import { LegendMarketplaceProviderCard } from '../../components/ProviderCard/LegendMarketplaceProviderCard.js';
import {
  type LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../../stores/LegendMarketPlaceVendorDataStore.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { InfoCircleIcon } from '@finos/legend-art';
import { useEffect } from 'react';
import {
  useLegendMarketPlaceVendorDataStore,
  withLegendMarketplaceVendorDataStore,
} from '../../application/providers/LegendMarketplaceVendorDataProvider.js';

export const RefinedVendorRadioSelector = observer(
  (props: { vendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { vendorDataState } = props;
    const radioOptions = [
      VendorDataProviderType.ALL,
      VendorDataProviderType.DATAFEEDS,
      VendorDataProviderType.TERMINAL_LICENSE,
      VendorDataProviderType.ADD_ONS,
    ];

    return (
      <ButtonGroup variant="outlined">
        {radioOptions.map((option) => (
          <Button
            key={option}
            onClick={() => vendorDataState.setProviderDisplayState(option)}
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
    providerResults: ProviderResult[];
    sectionTitle: VendorDataProviderType;
    seeAll?: boolean;
    tooltip?: string;
  }) => {
    const { vendorDataState, providerResults, sectionTitle, seeAll, tooltip } =
      props;
    const applicationStore = useApplicationStore();

    const onAddToCartClick = (providerResult: ProviderResult) => {
      applicationStore.notificationService.notifySuccess(
        `'${providerResult.productName}' is added to your cart`,
      );
    };

    return (
      <div>
        <div className="legend-marketplace-vendordata-main-search-results__category">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            {sectionTitle}
          </div>
          {tooltip && (
            <Tooltip title={tooltip} placement={'right'} arrow={true}>
              <InfoCircleIcon />
            </Tooltip>
          )}
          {seeAll && (
            <a
              href="#"
              className="see-all"
              onClick={() => {
                vendorDataState.setProviderDisplayState(sectionTitle);
              }}
            >
              <strong>See All&gt;</strong>
            </a>
          )}
        </div>
        <Grid
          container={true}
          spacing={{ xs: 4 }}
          columns={{ xs: 1, sm: 2, lg: 3, xxl: 4, xxxl: 5, xxxxl: 6 }}
          className="legend-marketplace-vendordata-main-search-results__card-group"
        >
          {providerResults.map((provider) => (
            <Grid key={provider.id} size={1}>
              <LegendMarketplaceProviderCard
                providerResult={provider}
                onAddToCartClick={() => onAddToCartClick(provider)}
              />
            </Grid>
          ))}
        </Grid>
      </div>
    );
  },
);

export const VendorDataMainContent = observer(
  (props: { marketPlaceVendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { marketPlaceVendorDataState } = props;

    const addOnsInfoMessage =
      'Addons cannot be ordered standalone. You must order terminal license with them.';

    return (
      <div className="legend-marketplace-vendordata-main">
        <div className="legend-marketplace-vendordata-main-sidebar col-sm-4">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            Filters
          </div>
          <hr></hr>
          <div className="legend-marketplace-vendordata-main-sidebar__subtitle">
            Providers
          </div>
          <div className="legend-marketplace-vendordata-main-content__sidebar__checkbox-filter-group">
            <FormGroup sx={{ gap: '1rem' }}>
              {marketPlaceVendorDataState.dataFeedProviders.map((vendor) => (
                <FormControlLabel
                  key={vendor.id}
                  control={<Checkbox color={'primary'} />}
                  label={
                    <Typography sx={{ fontSize: '14px' }}>
                      {vendor.providerName}
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          </div>
        </div>
        <div className="legend-marketplace-vendordata-main-search-results">
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.ALL && (
            <>
              <SearchResultsRenderer
                vendorDataState={marketPlaceVendorDataState}
                providerResults={marketPlaceVendorDataState.dataFeedProviders}
                sectionTitle={VendorDataProviderType.DATAFEEDS}
                seeAll={true}
              />
              <hr />
              <SearchResultsRenderer
                vendorDataState={marketPlaceVendorDataState}
                providerResults={marketPlaceVendorDataState.terminalProviders}
                sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
                seeAll={true}
              />
              <hr />
              <SearchResultsRenderer
                vendorDataState={marketPlaceVendorDataState}
                providerResults={marketPlaceVendorDataState.addOnProviders}
                sectionTitle={VendorDataProviderType.ADD_ONS}
                seeAll={true}
                tooltip={addOnsInfoMessage}
              />
            </>
          )}
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.DATAFEEDS && (
            <SearchResultsRenderer
              vendorDataState={marketPlaceVendorDataState}
              providerResults={marketPlaceVendorDataState.dataFeedProviders}
              sectionTitle={VendorDataProviderType.DATAFEEDS}
              seeAll={false}
            />
          )}
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.TERMINAL_LICENSE && (
            <SearchResultsRenderer
              vendorDataState={marketPlaceVendorDataState}
              providerResults={marketPlaceVendorDataState.terminalProviders}
              sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
              seeAll={false}
            />
          )}
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.ADD_ONS && (
            <SearchResultsRenderer
              vendorDataState={marketPlaceVendorDataState}
              providerResults={marketPlaceVendorDataState.addOnProviders}
              sectionTitle={VendorDataProviderType.ADD_ONS}
              seeAll={false}
              tooltip={addOnsInfoMessage}
            />
          )}
        </div>
      </div>
    );
  },
);

export const LegendMarketplaceVendorData = withLegendMarketplaceVendorDataStore(
  observer(() => {
    const marketPlaceVendorDataStore = useLegendMarketPlaceVendorDataStore();

    const onChange = (query: string | undefined) => {
      const filters: Filter[] = [];

      if (query) {
        filters.push({
          label: 'query',
          value: query,
        });
      }
      marketPlaceVendorDataStore.setProvidersFilters(filters);
    };

    useEffect(() => {
      marketPlaceVendorDataStore.init();
    }, [marketPlaceVendorDataStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-vendor-data">
        <div className="legend-marketplace-banner">
          <div className="legend-marketplace-banner__title">Vendor Data</div>
          <div className="legend-marketplace-banner__subtitle">
            <p>Discover high quality data</p>
          </div>
        </div>
        <div className="legend-marketplace-new-datasets">
          <h3>Recently Onboarded</h3>
          <div className="legend-marketplace-new-datasets__buttons">
            {marketPlaceVendorDataStore.dataFeedProviders
              .slice(0, 10)
              .map((vendor) => (
                <Badge
                  className="legend-marketplace-new-datasets__providers"
                  title={vendor.productName}
                  key={vendor.id}
                >
                  {vendor.productName}
                </Badge>
              ))}
          </div>
        </div>
        <div className="legend-marketplace-body__content">
          <RefinedVendorRadioSelector
            vendorDataState={marketPlaceVendorDataStore}
          />
          <LegendMarketplaceSearchBar onSearch={onChange} />
          <VendorDataMainContent
            marketPlaceVendorDataState={marketPlaceVendorDataStore}
          />
        </div>
      </LegendMarketplacePage>
    );
  }),
);
