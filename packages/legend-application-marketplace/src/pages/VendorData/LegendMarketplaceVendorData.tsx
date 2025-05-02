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
import { useEffect, useState } from 'react';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import {
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import type { ProviderResult } from '@finos/legend-server-marketplace';
import { LegendMarketplaceProviderCard } from '../../components/ProviderCard/LegendMarketplaceProviderCard.js';
import type { LegendMarketPlaceVendorDataState } from '../../stores/LegendMarketPlaceVendorDataState.js';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';

export const RefinedVendorRadioSelector = observer(() => {
  const radioOptions = ['All', 'Datafeeds', 'Terminal License', 'Add-Ons'];

  const [selected, setSelected] = useState<string>(radioOptions[0] ?? 'All');

  return (
    <ButtonGroup variant="outlined">
      {radioOptions.map((option) => (
        <Button
          key={option}
          onClick={() => setSelected(option)}
          variant={selected === option ? 'contained' : 'outlined'}
          sx={{
            fontSize: '12px',
            backgroundColor: selected === option ? 'primary' : 'white',
          }}
        >
          {option}
        </Button>
      ))}
    </ButtonGroup>
  );
});

const SearchResultsRenderer = observer(
  (props: { providerResults: ProviderResult[]; sectionTitle: string }) => {
    const { providerResults, sectionTitle } = props;
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
          <a href="#" className="see-all">
            <strong>See All&gt;</strong>
          </a>
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
  (props: { marketPlaceVendorDataState: LegendMarketPlaceVendorDataState }) => {
    const { marketPlaceVendorDataState } = props;

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
          <SearchResultsRenderer
            providerResults={marketPlaceVendorDataState.dataFeedProviders}
            sectionTitle="Data Feed"
          />
          <hr />
          <SearchResultsRenderer
            providerResults={marketPlaceVendorDataState.terminalProviders}
            sectionTitle="Terminal License"
          />
          <hr />
          <SearchResultsRenderer
            providerResults={marketPlaceVendorDataState.addOnProviders}
            sectionTitle="Add-Ons"
          />
        </div>
      </div>
    );
  },
);

export const LegendMarketplaceVendorData = observer(() => {
  const applicationStore = useApplicationStore();
  const baseStore = useLegendMarketplaceBaseStore();
  const marketPlaceVendorDataState = baseStore.marketplaceVendorDataState;

  const onChange = (
    provider: string | undefined,
    query: string | undefined,
  ) => {
    // Handle search logic here
  };

  useEffect(() => {
    flowResult(marketPlaceVendorDataState.populateProviders()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [marketPlaceVendorDataState, applicationStore]);

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
          {marketPlaceVendorDataState.dataFeedProviders
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
        <RefinedVendorRadioSelector />
        <LegendMarketplaceSearchBar onSearch={onChange} />
        <VendorDataMainContent
          marketPlaceVendorDataState={marketPlaceVendorDataState}
        />
      </div>
    </LegendMarketplacePage>
  );
});
