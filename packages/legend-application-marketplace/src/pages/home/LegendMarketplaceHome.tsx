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
import { LegendMarketplaceHeader } from '../../components/Header/LegendMarketplaceHeader.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  generateSearchResultsRoute,
  generateVendorDetailsRoute,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import type { DataAsset } from '@finos/legend-server-marketplace';
import { shuffle } from '@finos/legend-shared';
import { LegendMarketplaceVendorCard } from '../../components/VendorCard/LegendMarketplaceVendorCard.js';
import { Grid2 as Grid } from '@mui/material';

// Temporary placeholder data for assets

const dataAssets: DataAsset[] = [
  {
    description: 'This is a test data asset',
    provider: 'Vendor 1',
    type: 'vendor',
    moreInfo: 'More information about the test data asset',
  },
  {
    description: 'This is another test data asset',
    provider: 'Vendor 2',
    type: 'curated',
    moreInfo: 'More information about the test2 data asset',
  },
  {
    description: 'This is a third test data asset',
    provider: 'Vendor 3',
    type: 'vendor',
    moreInfo: 'More information about the test3 data asset',
  },
  {
    description: 'This is a fourth test data asset',
    provider: 'Vendor 4',
    type: 'curated',
    moreInfo: 'More information about the test4 data asset',
  },
  {
    description: 'This is a fifth test data asset',
    provider: 'Vendor 5',
    type: 'vendor',
    moreInfo: 'More information about the test5 data asset',
  },
  {
    description: 'This is a sixth test data asset',
    provider: 'Vendor 6',
    type: 'curated',
    moreInfo: '',
  },
];

export const LegendMarketplaceHome = observer(() => {
  const applicationStore = useApplicationStore();

  const onSearch = (
    provider: string | undefined,
    query: string | undefined,
  ): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateSearchResultsRoute(provider, query),
    );
  };

  return (
    <div className="app__page">
      <div className="legend-marketplace-home">
        <div className="legend-marketplace-home__body">
          <LegendMarketplaceHeader />
          <div className="legend-marketplace-home__content">
            <div className="legend-marketplace-home__landing">
              <div className="legend-marketplace-home__landing__title">
                <h1>
                  <span style={{ color: '#76A1E3' }}>All data in </span>
                  <span style={{ color: 'white' }}>One Place</span>
                </h1>
              </div>
              <div className="legend-marketplace-home__landing__description">
                <h3>
                  Discover the right data and accelerate analytic productivity.
                </h3>
              </div>
              <div className="legend-marketplace-home__landing__search-bar">
                <LegendMarketplaceSearchBar onSearch={onSearch} />
              </div>
            </div>
            <div className="legend-marketplace-home__vendors-title">
              <h3>Explore our Data</h3>
            </div>
            <div className="legend-marketplace-home__vendors-cards">
              <Grid
                container={true}
                spacing={{ xs: 2, md: 3, xl: 6 }}
                columns={{ xs: 2, md: 3, xl: 6 }}
                sx={{ justifyContent: 'center' }}
              >
                {shuffle(dataAssets).map((asset) => (
                  <Grid
                    key={`${asset.provider}.${asset.type}.${asset.description}`}
                    size={1}
                  >
                    <LegendMarketplaceVendorCard
                      dataAsset={asset}
                      onClick={(dataAsset: DataAsset) => {
                        applicationStore.navigationService.navigator.goToLocation(
                          generateVendorDetailsRoute(dataAsset.provider),
                        );
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
