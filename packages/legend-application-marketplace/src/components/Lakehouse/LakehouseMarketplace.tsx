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
import {
  useMarketplaceLakehouseStore,
  withMarketplaceLakehouseStore,
} from './MarketLakehouseStoreProvider.js';
import { useEffect } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { LegendMarketplaceHeader } from '../Header/LegendMarketplaceHeader.js';
import { Grid2 as Grid } from '@mui/material';
import { LegendMarketplaceVendorCard } from '../VendorCard/LegendMarketplaceVendorCard.js';
import type { DataAsset } from '@finos/legend-server-marketplace';

export const LakehouseMarketplace = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();

    useEffect(() => {
      marketPlaceStore.init();
    }, [marketPlaceStore]);

    return (
      <div className="app__page">
        <div className="legend-marketplace-home">
          <div className="legend-marketplace-home__body">
            <LegendMarketplaceHeader />
            <div className="legend-marketplace-home__content">
              <div className="legend-marketplace-data-products__content">
                <CubesLoadingIndicator
                  isLoading={marketPlaceStore.loadingProductsState.isInProgress}
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
                <div className="legend-marketplace-home__vendors-cards">
                  <Grid
                    container={true}
                    spacing={{ xs: 2, md: 3, xl: 4 }}
                    columns={{ xs: 1, sm: 2, md: 3, xl: 6 }}
                    sx={{ justifyContent: 'center' }}
                  >
                    {marketPlaceStore.productStates
                      ?.map((e) => e.dataSet)
                      .map((asset) => (
                        <Grid
                          key={`${asset.provider}.${asset.type}.${asset.description}`}
                          size={1}
                        >
                          <LegendMarketplaceVendorCard
                            dataAsset={asset}
                            onClick={(dataAsset: DataAsset) => {
                              {
                                // TODO: for now lets have it take you to the studio project
                                // eslint-disable-next-line no-console
                                console.log('clicked');
                              }
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
      </div>
    );
  }),
);
