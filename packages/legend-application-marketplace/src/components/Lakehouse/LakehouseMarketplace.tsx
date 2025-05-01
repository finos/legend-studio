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
import { useEffect, type JSX } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { LegendMarketplaceHeader } from '../Header/LegendMarketplaceHeader.js';
import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid2 as Grid,
} from '@mui/material';
import type { DataProductState } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { generateLakehouseDataProduct } from '../../__lib__/LegendMarketplaceNavigation.js';
import { useAuth } from 'react-oidc-context';
import { generateGAVCoordinates } from '@finos/legend-storage';

export const LegendDataProductVendorCard = (props: {
  dataAsset: DataProductState;
  onClick: (dataAsset: DataProductState) => void;
}): JSX.Element => {
  const { dataAsset, onClick } = props;
  return (
    <Card variant="outlined" className="legend-marketplace-vendor-card">
      <CardActionArea
        onClick={() => onClick(dataAsset)}
        sx={{ height: '100%' }}
      >
        <CardContent className="legend-marketplace-vendor-card__content">
          <Chip
            label={dataAsset.productEntity.versionId}
            className={clsx('legend-marketplace-vendor-card__type')}
          />
          <div className="legend-marketplace-vendor-card__name">
            {dataAsset.productEntity.path}
          </div>
          <div className="legend-marketplace-vendor-card__description">
            {`${dataAsset.productEntity.groupId}:${dataAsset.productEntity.artifactId}`}
          </div>
        </CardContent>

        <CardContent className="legend-marketplace-vendor-card__more-info">
          <div>{dataAsset.productEntity.path}</div>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export const LakehouseMarketplace = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const auth = useAuth();

    useEffect(() => {
      marketPlaceStore.init();
    }, [marketPlaceStore]);

    useEffect(() => {
      // eslint-disable-next-line no-void
      void marketPlaceStore.lakehouseServerClient.getDataProducts(
        auth.user?.access_token,
      );
    }, [auth.user?.access_token, marketPlaceStore.lakehouseServerClient]);

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
                    {marketPlaceStore.productStates?.map((dpState) => (
                      <Grid key={dpState.id} size={1}>
                        <LegendDataProductVendorCard
                          dataAsset={dpState}
                          onClick={(dataAsset: DataProductState) => {
                            {
                              marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                                generateLakehouseDataProduct(
                                  generateGAVCoordinates(
                                    dpState.productEntity.groupId,
                                    dpState.productEntity.artifactId,
                                    dpState.productEntity.versionId,
                                  ),
                                  dpState.productEntity.path,
                                ),
                              );
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
