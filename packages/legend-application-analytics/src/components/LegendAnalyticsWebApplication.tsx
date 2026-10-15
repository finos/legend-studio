/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { LegendTokenSync } from '@finos/legend-application';
import {
  BrowserEnvironmentProvider,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import {
  AuthProvider,
  type AuthProviderProps,
  withAuthenticationRequired,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import { LEGEND_ANALYTICS_ROUTE_PATTERN } from '../__lib__/LegendAnalyticsNavigation.js';
import {
  LegendAnalyticsFrameworkProvider,
  useLegendAnalyticsApplicationStore,
  useLegendAnalyticsBaseStore,
} from './LegendAnalyticsFrameworkProvider.js';
import { LegendAnalyticsCubePage } from './LegendAnalyticsCubePage.js';

const LegendAnalyticsWebApplicationRouter = observer(() => {
  const applicationStore = useLegendAnalyticsApplicationStore();
  const baseStore = useLegendAnalyticsBaseStore();

  useEffect(() => {
    flowResult(baseStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, baseStore]);

  return (
    <div className="app">
      {baseStore.initState.hasCompleted && (
        <Routes>
          <Route
            path={LEGEND_ANALYTICS_ROUTE_PATTERN.CUBE}
            element={<LegendAnalyticsCubePage />}
          />
        </Routes>
      )}
    </div>
  );
});

const LegendAnalyticsWebProvider: React.FC<{
  baseUrl: string;
}> = ({ baseUrl }) => (
  <BrowserEnvironmentProvider baseUrl={baseUrl}>
    <LegendAnalyticsFrameworkProvider>
      <LegendAnalyticsWebApplicationRouter />
    </LegendAnalyticsFrameworkProvider>
  </BrowserEnvironmentProvider>
);

const AuthenticatedLegendAnalyticsWebProvider = withAuthenticationRequired(
  LegendAnalyticsWebProvider,
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

/**
 * Legend Analytics, signing in through OIDC when the config names a provider,
 * as Legend Query does
 */
export const LegendAnalyticsWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;
    const applicationStore = useLegendAnalyticsApplicationStore();
    const { oidcConfig, enableOauthFlow } = applicationStore.config.options;

    if (!oidcConfig) {
      return <LegendAnalyticsWebProvider baseUrl={baseUrl} />;
    }
    const onSigninCallback = (user: User | undefined): void => {
      window.location.href = (user?.state as string | undefined) ?? '/';
    };
    const mergedOIDCConfig: AuthProviderProps = {
      ...oidcConfig.authProviderProps,
      redirect_uri: `${window.location.origin}${oidcConfig.redirectPath}`,
      silent_redirect_uri: `${window.location.origin}${oidcConfig.silentRedirectPath}`,
      onSigninCallback,
    };
    return (
      <AuthProvider {...mergedOIDCConfig}>
        <LegendTokenSync>
          {enableOauthFlow ? (
            <AuthenticatedLegendAnalyticsWebProvider baseUrl={baseUrl} />
          ) : (
            <LegendAnalyticsWebProvider baseUrl={baseUrl} />
          )}
        </LegendTokenSync>
      </AuthProvider>
    );
  },
);
