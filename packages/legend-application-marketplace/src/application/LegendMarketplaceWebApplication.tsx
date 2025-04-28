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
import { GhostIcon } from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  BrowserEnvironmentProvider,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import {
  LegendMarketplaceFrameworkProvider,
  useLegendMarketplaceApplicationStore,
  useLegendMarketplaceBaseStore,
} from './LegendMarketplaceFrameworkProvider.js';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../__lib__/LegendMarketplaceNavigation.js';
import { LakehouseMarketplace } from '../components/Lakehouse/LakehouseMarketplace.js';
import { LegendMarketplaceHome } from '../pages/Home/LegendMarketplaceHome.js';
import { LegendMarketplaceSearchResults } from '../pages/SearchResults/LegendMarketplaceSearchResults.js';
import {
  AuthProvider,
  withAuthenticationRequired,
  type AuthProviderProps,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';

const NotFoundPage = observer(() => {
  const applicationStore = useApplicationStore();

  const currentPath =
    applicationStore.navigationService.navigator.getCurrentLocation();

  return (
    <div className="app__page legend-marketplace__app__page">
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
    </div>
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

  const ProtectedLakehouseMarketplace =
    withAuthenticationRequired(LakehouseMarketplace);

  return (
    <div className="app">
      {baseStore.initState.hasCompleted && (
        <>
          <Routes>
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </>
      )}
    </div>
  );
});

export const LegendMarketplaceWebApplication = observer(
  (props: { baseUrl: string; oidcConfig?: AuthProviderProps | undefined }) => {
    const { baseUrl, oidcConfig } = props;

    const mergedOIDCConfig: AuthProviderProps | undefined = oidcConfig
      ? {
          ...oidcConfig,
          onSigninCallback: (_user: User | undefined) => {
            window.history.replaceState(
              {},
              document.title,
              _user?.state ? (_user.state as string) : '/',
            );
          },
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
