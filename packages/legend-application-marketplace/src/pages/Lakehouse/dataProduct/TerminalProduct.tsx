import { observer } from 'mobx-react-lite';
import {
  useMarketplaceLakehouseStore,
  withMarketplaceLakehouseStore,
} from '../MarketplaceLakehouseStoreProvider.js';
import { useEffect, useState } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN_TERMINAL } from '../../../__lib__/LegendMarketplaceNavigation.js';
import { useAuth } from 'react-oidc-context';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';

export const TerminalProduct = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const applicationStore = marketPlaceStore.applicationStore;
    const params = useParams();
    const auth = useAuth();

    const terminalId = parseInt(
      guaranteeNonNullable(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN_TERMINAL.ID],
      ),
      10,
    );

    useEffect(() => {
      marketPlaceStore.initWithTerminal(terminalId, auth);
    }, [auth, marketPlaceStore, terminalId]);

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
          isLoading={marketPlaceStore.loadingProductsState.isInProgress}
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
                <h3>{terminal.title || `Product ${index + 1}`}</h3>
                <div>
                  <strong>Vendor:</strong> {terminal.vendorName}
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
                  <strong>PerAccessMaxPrice:</strong> $
                  {terminal.perAccessMaxPrice}
                </div>
                <div>
                  <strong>Vendor Profile ID:</strong> {terminal.vendorProfileId}
                </div>
                <div>
                  <strong>Terminal Name:</strong> {terminal.terminalName}
                </div>
                <div>
                  <strong>SiteFeeMaxPrice:</strong> ${terminal.siteFeeMaxPrice}
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
        ) : marketPlaceStore.loadingProductsState.isInProgress ? (
          <div>Loading terminal data...</div>
        ) : (
          <div>No terminal data found.</div>
        )}
      </LegendMarketplacePage>
    );
  }),
);
