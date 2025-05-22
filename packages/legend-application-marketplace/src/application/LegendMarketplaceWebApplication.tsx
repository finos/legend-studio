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
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  BrowserEnvironmentProvider,
  Outlet,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import {
  LegendMarketplaceFrameworkProvider,
  useLegendMarketplaceApplicationStore,
  useLegendMarketplaceBaseStore,
} from './LegendMarketplaceFrameworkProvider.js';
import {
  isLakehouseRoute,
  LEGEND_MARKETPLACE_ROUTE_PATTERN,
} from '../__lib__/LegendMarketplaceNavigation.js';
import { MarketplaceLakehouseHome } from '../pages/Lakehouse/MarketplaceLakehouseHome.js';
import { LegendMarketplaceHome } from '../pages/Home/LegendMarketplaceHome.js';
import { LegendMarketplaceSearchResults } from '../pages/SearchResults/LegendMarketplaceSearchResults.js';
import {
  type AuthProviderProps,
  AuthProvider,
  withAuthenticationRequired,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import type { LegendMarketplaceOidcConfig } from './LegendMarketplaceApplicationConfig.js';
import { LakehouseDataProduct } from '../pages/Lakehouse/dataProduct/LakehouseDataProduct.js';
import { LegendMarketplaceVendorData } from '../pages/VendorData/LegendMarketplaceVendorData.js';
import { LakehouseEntitlements } from '../pages/Lakehouse/entitlements/LakehouseEntitlements.js';
import { LakehouseSubscriptions } from '../pages/Lakehouse/subscriptions/LakehouseSubscriptions.js';
import {
  LegendMarketplaceHeader,
  MarketplaceLakehouseHeader,
} from '../components/Header/LegendMarketplaceHeader.js';
import { LegendMarketplacePage } from '../pages/LegendMarketplacePage.js';
import { LegendMarketplaceVendorDetails } from '../pages/VendorDetails/LegendMarketplaceVendorDetails.js';
import { LegendMarketplaceSubscriptions } from '../pages/Profile/LegendMarketplaceSubscriptions.js';
import { LegendMarketplaceOrders } from '../pages/Profile/LegendMarketplaceOrders.js';

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
  const baseStore = useLegendMarketplaceBaseStore();
  const applicationStore = useLegendMarketplaceApplicationStore();

  useEffect(() => {
    flowResult(baseStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, baseStore]);

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

  const ProtectedLakehouseSubscriptions = withAuthenticationRequired(
    LakehouseSubscriptions,
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

  return (
    <div className="app">
      {baseStore.initState.hasCompleted && (
        <Routes>
          <Route
            element={
              <>
                {isLakehouseRoute(
                  baseStore.applicationStore.navigationService.navigator.getCurrentLocation(),
                ) ? (
                  <MarketplaceLakehouseHeader />
                ) : (
                  <LegendMarketplaceHeader />
                )}
                <Outlet />
              </>
            }
          >
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT}
              element={<ProtectedLakehouseDataProduct />}
            />
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_TASKS
              }
              element={<ProtectedLakehouseEntitlements />}
            />
            <Route
              path={
                LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_CONTRACTS
              }
              element={<ProtectedLakehouseEntitlements />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS}
              element={<ProtectedLakehouseEntitlements />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE}
              element={<ProtectedLakehouseMarketplace />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.DEFAULT}
              element={<LegendMarketplaceHome />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS}
              element={<LegendMarketplaceSearchResults />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DATA}
              element={<LegendMarketplaceVendorData />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DETAILS}
              element={<LegendMarketplaceVendorDetails />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SUBSCRIPTIONS}
              element={<ProtectedLakehouseSubscriptions />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.SUBSCRIPTIONS}
              element={<LegendMarketplaceSubscriptions />}
            />
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.ORDERS}
              element={<LegendMarketplaceOrders />}
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
