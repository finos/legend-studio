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
import type { DataProductState } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import {
  LATEST_VERSION_ALIAS,
  StoreProjectData,
  VersionedProjectData,
} from '@finos/legend-server-depot';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl } from '../../__lib__/LegendMarketplaceNavigation.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';

export const LakehouseMarketplace = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const auth = useAuth();

    useEffect(() => {
      marketPlaceStore.init();
    }, [marketPlaceStore]);

    useEffect(() => {
      marketPlaceStore.lakehouseServerClient.getDataProducts(
        auth.user?.access_token,
      );
    }, [auth.user?.access_token, marketPlaceStore.lakehouseServerClient]);

    const openDataProduct = async (state: DataProductState): Promise<void> => {
      const path = `${state.product.package}::${state.product.name}`;
      try {
        const studioUrl = guaranteeNonNullable(
          marketPlaceStore.applicationStore.config.studioServerUrl,
          'studio url required',
        );
        const project = StoreProjectData.serialization.fromJson(
          await marketPlaceStore.depotServerClient.getProject(
            state.productEntity.groupId,
            state.productEntity.artifactId,
          ),
        );
        const versionId =
          state.productEntity.versionId === LATEST_VERSION_ALIAS
            ? VersionedProjectData.serialization.fromJson(
                await marketPlaceStore.depotServerClient.getLatestVersion(
                  state.productEntity.groupId,
                  state.productEntity.artifactId,
                ),
              ).versionId
            : state.productEntity.versionId;

        marketPlaceStore.applicationStore.navigationService.navigator.visitAddress(
          EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
            studioUrl,
            project.projectId,
            versionId,
            path,
          ),
        );
      } catch (error) {
        assertErrorThrown(error);
        marketPlaceStore.applicationStore.notificationService.notifyError(
          path
            ? `Can't visit element of path: '${path}'`
            : `Can't visit project`,
        );
      }
    };

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
                      <Grid
                        key={`${dpState.dataSet.provider}.${dpState.dataSet.type}.${dpState.dataSet.description}`}
                        size={1}
                      >
                        <LegendMarketplaceVendorCard
                          dataAsset={dpState.dataSet}
                          onClick={(dataAsset: DataAsset) => {
                            {
                              flowResult(openDataProduct(dpState));
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
