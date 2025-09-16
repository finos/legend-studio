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
  useLegendMarketplaceProductViewerStore,
  withLegendMarketplaceProductViewerStore,
} from '../../../application/providers/LegendMarketplaceProductViewerStoreProvider.js';
import { useEffect } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  type LegacyDataProductPathParams,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { DataSpaceViewer } from '@finos/legend-extension-dsl-data-space/application';

export const LegacyDataProduct = withLegendMarketplaceProductViewerStore(
  observer(() => {
    const productViewerStore = useLegendMarketplaceProductViewerStore();
    const params = useParams<LegacyDataProductPathParams>();
    const gav = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV],
    );
    const path = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH],
    );

    useEffect(() => {
      if (!productViewerStore.loadingProductState.hasCompleted) {
        productViewerStore.initWithLegacyProduct(gav, path);
      }
    }, [gav, productViewerStore, path]);

    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-data-product">
        <CubesLoadingIndicator
          isLoading={productViewerStore.loadingProductState.isInProgress}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {productViewerStore.legacyProductViewer && (
          <DataSpaceViewer
            dataSpaceViewerState={productViewerStore.legacyProductViewer}
          />
        )}
      </LegendMarketplacePage>
    );
  }),
);
