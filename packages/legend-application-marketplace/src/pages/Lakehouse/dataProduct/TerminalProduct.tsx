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
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LegendTerminalProductPathParams,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';

export const TerminalProduct = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const applicationStore = marketPlaceStore.applicationStore;
    const params = useParams<LegendTerminalProductPathParams>();

    const terminalId = guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID],
    );

    useEffect(() => {
      marketPlaceStore.initWithTerminal(terminalId);
    }, [marketPlaceStore, terminalId]);

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
          isLoading={marketPlaceStore.loadingProductState.isInProgress}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>

        {marketPlaceStore.terminalProducts &&
        marketPlaceStore.terminalProducts.length > 0 ? (
          <div className="terminal-products">
            <h1>
              Terminal {terminalId} - {marketPlaceStore.terminalProducts.length}{' '}
              Products
            </h1>

            {marketPlaceStore.terminalProducts.map((terminal, index) => (
              <div
                key={index}
                className="terminal-product-card"
                style={{
                  border: '1px solid #ccc',
                  margin: '10px 0',
                  padding: '15px',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <h3>{terminal.productName || `Product ${index + 1}`}</h3>
                <div>
                  <strong>ID:</strong> {terminal.id}
                </div>
                <div>
                  <strong>Vendor:</strong> {terminal.providerName}
                </div>
                <div>
                  <strong>Category:</strong> {terminal.category}
                </div>
                <div>
                  <strong>Application:</strong> {terminal.applicationName}
                </div>
                <div>
                  <strong>Description:</strong> {terminal.description}
                </div>
                <div>
                  <strong>Price:</strong> ${terminal.price}
                </div>
                <div>
                  <strong>Vendor Profile ID:</strong> {terminal.vendorProfileId}
                </div>
                <div>
                  <strong>Model Name:</strong> {terminal.modelName}
                </div>
                <div>
                  <strong>Tiered Price:</strong> {terminal.tieredPrice}
                </div>
                <div>
                  <strong>Total Firm Price:</strong> ${terminal.totalFirmPrice}
                </div>
              </div>
            ))}

            <details style={{ marginTop: '20px' }}>
              <summary>
                Debug: Raw Terminal Data (
                {marketPlaceStore.terminalProducts.length} products)
              </summary>
              <pre
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '10px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {JSON.stringify(marketPlaceStore.terminalProducts, null, 2)}
              </pre>
            </details>
          </div>
        ) : marketPlaceStore.loadingProductState.isInProgress ? (
          <div>Loading terminal data...</div>
        ) : (
          <div>No terminal data found.</div>
        )}
      </LegendMarketplacePage>
    );
  }),
);
