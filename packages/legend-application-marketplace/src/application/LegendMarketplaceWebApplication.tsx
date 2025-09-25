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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  GhostIcon,
} from '@finos/legend-art';
import {
  LEGEND_APPLICATION_COLOR_THEME,
  useApplicationStore,
} from '@finos/legend-application';
import {
  BrowserEnvironmentProvider,
  Outlet,
  Route,
  Routes,
  Navigate,
} from '@finos/legend-application/browser';
import {
  LegendMarketplaceFrameworkProvider,
  useLegendMarketplaceApplicationStore,
  useLegendMarketplaceBaseStore,
} from './providers/LegendMarketplaceFrameworkProvider.js';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../__lib__/LegendMarketplaceNavigation.js';
import { MarketplaceLakehouseHome } from '../pages/Lakehouse/MarketplaceLakehouseHome.js';
import {
  type AuthProviderProps,
  AuthProvider,
  withAuthenticationRequired,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import type { LegendMarketplaceOidcConfig } from './LegendMarketplaceApplicationConfig.js';
import { LakehouseDataProduct } from '../pages/Lakehouse/dataProduct/LakehouseDataProduct.js';
import { TerminalProduct } from '../pages/Lakehouse/dataProduct/TerminalProduct.js';
import { LegendMarketplaceDataAPIs } from '../pages/DataAPIs/LegendMarketplaceDataAPIs.js';
import { LakehouseEntitlements } from '../pages/Lakehouse/entitlements/LakehouseEntitlements.js';
import { LakehouseAdmin } from '../pages/Lakehouse/admin/LakehouseAdmin.js';
import { MarketplaceLakehouseHeader } from '../components/Header/LegendMarketplaceHeader.js';
import { LegendMarketplacePage } from '../pages/LegendMarketplacePage.js';
import { MarketplaceLakehouseOAuthCallback } from '../pages/Lakehouse/MarketplaceLakehouseOAuthCallback.js';
import { LakehouseSDLCDataProduct } from '../pages/Lakehouse/dataProduct/LakehouseSDLCDataProduct.js';
import { MarketplaceLakehouseSearchResults } from '../pages/Lakehouse/searchResults/MarketplaceLakehouseSearchResults.js';
import { LegacyDataProduct } from '../pages/Lakehouse/dataProduct/LegacyDataProduct.js';
import { LegendMarketplaceAgents } from '../pages/Agents/LegendMarketplaceAgents.js';
import { LegendMarketplaceInventory } from '../pages/Inventory/LegendMarketplaceInventory.js';
import { LegendMarketplaceTerminalsAddOnsComingSoon } from '../pages/VendorDetails/LegendMarketplaceVendorDetails.js';
import { flowResult } from 'mobx';

const NotFoundPage = observer(() => {
  const applicationStore = useApplicationStore();

  const currentPath =
    applicationStore.navigationService.navigator.getCurrentLocation();

  return (
    <LegendMarketplacePage className="legend-marketplace__not-found">
      <div className="not-found-screen not-found-screen--no-documentation">
        <div className="not-found-screen__icon">
          <div className="not-found-screen__icon__ghost">
            <GhostIcon />
          </div>
          <div className="not-found-screen__icon__shadow">
            <svg viewBox="0 0 600 400">
              <g transform="translate(300 200)">
                <ellipse
                  className="not-found-screen__icon__shadow__inner"
                  rx="320"
                  ry="80"
                ></ellipse>
              </g>
            </svg>
          </div>
        </div>
        <div className="not-found-screen__text-content">
          <div className="not-found-screen__text-content__title">
            404. Not Found
          </div>
          <div className="not-found-screen__text-content__detail">
            The requested URL
            <span className="not-found-screen__text-content__detail__url">
              {applicationStore.navigationService.navigator.generateAddress(
                currentPath,
              )}
            </span>
            was not found in the application
          </div>
        </div>
      </div>
    </LegendMarketplacePage>
  );
});

export const LegendMarketplaceWebApplicationRouter = observer(() => {
  const marketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = useLegendMarketplaceApplicationStore();

  useEffect(() => {
    if (marketplaceBaseStore.initState.isInInitialState) {
      flowResult(marketplaceBaseStore.initialize()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }, [applicationStore.alertUnhandledError, marketplaceBaseStore]);

  useEffect(() => {
    applicationStore.layoutService.setColorTheme(
      LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
      {
        persist: true,
      },
    );
  }, [applicationStore]);

  const ProtectedLakehouseMarketplace = withAuthenticationRequired(
    MarketplaceLakehouseHome,
    {
      OnRedirecting: () => (
        <CubesLoadingIndicator isLoading={true}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
      ),
      signinRedirectArgs: {
        state: `${window.location.pathname}${window.location.search}`,
      },
    },
  );

  const ProtectedLakehouseSearchResults = withAuthenticationRequired(
    MarketplaceLakehouseSearchResults,
    {
      OnRedirecting: () => (
        <CubesLoadingIndicator isLoading={true}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
      ),
      signinRedirectArgs: {
        state: `${window.location.pathname}${window.location.search}`,
      },
    },
  );

  const ProtectedLakehouseDataProduct = withAuthenticationRequired(
    LakehouseDataProduct,
    {
      OnRedirecting: () => (
        <CubesLoadingIndicator isLoading={true}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
      ),
      signinRedirectArgs: {
        state: `${window.location.pathname}${window.location.search}`,
      },
    },
  );

  const ProtectedTerminalProduct = withAuthenticationRequired(TerminalProduct, {
    OnRedirecting: () => (
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ),
    signinRedirectArgs: {
      state: `${window.location.pathname}${window.location.search}`,
    },
  });

  const ProtectedLakehouseEntitlements = withAuthenticationRequired(
    LakehouseEntitlements,
    {
      OnRedirecting: () => (
        <CubesLoadingIndicator isLoading={true}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
      ),
      signinRedirectArgs: {
        state: `${window.location.pathname}${window.location.search}`,
      },
    },
  );

  const ProtectedLakehouseAdmin = withAuthenticationRequired(LakehouseAdmin, {
    OnRedirecting: () => (
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ),
    signinRedirectArgs: {
      state: `${window.location.pathname}${window.location.search}`,
    },
  });

  return (
    <div className="app">
      {marketplaceBaseStore.initState.hasCompleted && (
        <Routes>
          <Route
            element={
              <>
                <MarketplaceLakehouseHeader />
                <Outlet />
              </>
            }
          >
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.OAUTH_CALLBACK}
              element={<MarketplaceLakehouseOAuthCallback />}
            />

            {/* Marketplace Routes */}
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT_SEARCH_RESULTS
              }
              element={<ProtectedLakehouseSearchResults />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_APIS}
              element={<LegendMarketplaceDataAPIs />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.AGENTS}
              element={<LegendMarketplaceAgents />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.INVENTORY}
              element={<LegendMarketplaceInventory />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DETAILS}
              element={<LegendMarketplaceTerminalsAddOnsComingSoon />}
            />

            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT}
              element={<ProtectedLakehouseDataProduct />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.TERMINAL_PRODUCT}
              element={<ProtectedTerminalProduct />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.SDLC_DATA_PRODUCT}
              element={<LakehouseSDLCDataProduct />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LEGACY_DATA_PRODUCT}
              element={<LegacyDataProduct />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS}
              element={<ProtectedLakehouseEntitlements />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.HOME_PAGE}
              element={<ProtectedLakehouseMarketplace />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ADMIN}
              element={<ProtectedLakehouseAdmin />}
            />

            {/* Reroute pages */}
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.DEPRECATED_LAKEHOUSE}
              element={
                <Navigate
                  to={LEGEND_MARKETPLACE_ROUTE_PATTERN.HOME_PAGE}
                  replace={true}
                />
              }
            />
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.DEPRECATED_LAKEHOUSE_SEARCH_RESULTS
              }
              element={
                <Navigate
                  to={
                    LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT_SEARCH_RESULTS
                  }
                  replace={true}
                />
              }
            />
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.DEPRECATED_LAKEHOUSE_PRODUCT
              }
              element={
                <Navigate
                  to={LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT}
                  replace={true}
                />
              }
            />
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.DEPRECATED_LAKEHOUSE_SDLC_PRODUCT
              }
              element={
                <Navigate
                  to={LEGEND_MARKETPLACE_ROUTE_PATTERN.SDLC_DATA_PRODUCT}
                  replace={true}
                />
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      )}
    </div>
  );
});

export const LegendMarketplaceWebApplication = observer(
  (props: {
    baseUrl: string;
    oidcConfig?: LegendMarketplaceOidcConfig | undefined;
  }) => {
    const { baseUrl, oidcConfig } = props;

    const onSigninCallback = (_user: User | undefined) => {
      window.location.href = (_user?.state as string | undefined) ?? '/';
    };

    const mergedOIDCConfig: AuthProviderProps | undefined = oidcConfig
      ? {
          ...oidcConfig.authProviderProps,
          redirect_uri: `${window.location.origin}${oidcConfig.redirectPath}`,
          silent_redirect_uri: `${window.location.origin}${oidcConfig.silentRedirectPath}`,
          onSigninCallback,
        }
      : undefined;

    return (
      <AuthProvider {...mergedOIDCConfig}>
        <BrowserEnvironmentProvider baseUrl={baseUrl}>
          <LegendMarketplaceFrameworkProvider>
            <LegendMarketplaceWebApplicationRouter />
          </LegendMarketplaceFrameworkProvider>
        </BrowserEnvironmentProvider>
      </AuthProvider>
    );
  },
);
