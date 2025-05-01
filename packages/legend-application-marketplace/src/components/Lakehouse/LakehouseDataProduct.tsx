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
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LakehouseDataProductPathParams,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { DataProductViewer } from './DataProductViewer.js';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';

export const LakehouseDataProduct = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const applicationStore = marketPlaceStore.applicationStore;
    const params = useParams<LakehouseDataProductPathParams>();
    const gav = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV],
    );
    const product = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH],
    );

    useEffect(() => {
      marketPlaceStore.initWithProduct(gav, product);
    }, [gav, marketPlaceStore, product]);

    useEffect(() => {
      applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
        {
          persist: true,
        },
      );
    }, [applicationStore]);

    return (
      <div className="app__page">
        <div className="legend-marketplace-home">
          <div className="legend-marketplace-data-product-home__body">
            <LegendMarketplaceHeader />
            <div className="legend-marketplace-home__content">
              <div className="legend-marketplace-data-product__content">
                <CubesLoadingIndicator
                  isLoading={marketPlaceStore.loadingProductsState.isInProgress}
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
                {marketPlaceStore.dataProductViewer && (
                  <DataProductViewer
                    dataSpaceViewerState={marketPlaceStore.dataProductViewer}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
