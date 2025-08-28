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
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LegendTerminalProductPathParams,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { ProductViewer } from './ProductViewer.js';

export const TerminalProduct = withLegendMarketplaceProductViewerStore(
  observer(() => {
    const productViewerStore = useLegendMarketplaceProductViewerStore();
    const applicationStore =
      productViewerStore.marketplaceBaseStore.applicationStore;
    const params = useParams<LegendTerminalProductPathParams>();

    const terminalId = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID],
    );

    useEffect(() => {
      productViewerStore.initWithTerminal(terminalId);
    }, [productViewerStore, terminalId]);

    useEffect(() => {
      applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
        {
          persist: true,
        },
      );
    }, [applicationStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-terminal-data-product">
        <CubesLoadingIndicator
          isLoading={productViewerStore.loadingProductState.isInProgress}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>

        {productViewerStore.terminalProductViewer && (
          <ProductViewer
            productViewerState={productViewerStore.terminalProductViewer}
          />
        )}
      </LegendMarketplacePage>
    );
  }),
);
