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
} from '../MarketplaceLakehouseStoreProvider.js';
import { useEffect } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LakehouseDataProductPathParams,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { DataProductViewer } from './DataProductViewer.js';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';

export const LakehouseDataProduct = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const applicationStore = marketPlaceStore.applicationStore;
    const params = useParams<LakehouseDataProductPathParams>();
    const auth = useAuth();
    const dataProductId = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID],
    );
    const deploymentId = parseInt(
      guaranteeNonNullable(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID],
      ),
    );

    useEffect(() => {
      marketPlaceStore.initWithProduct(dataProductId, deploymentId, auth);
    }, [auth, dataProductId, marketPlaceStore, deploymentId]);

    useEffect(() => {
      applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
        {
          persist: true,
        },
      );
    }, [applicationStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-data-product">
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
      </LegendMarketplacePage>
    );
  }),
);
