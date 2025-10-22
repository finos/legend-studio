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

import { BrowserEnvironmentProvider } from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import {
  LegendDataCubeFrameworkProvider,
  useLegendDataCubeBaseStore,
} from './LegendDataCubeFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { LegendDataCubeBuilder } from './builder/LegendDataCubeBuilder.js';
import { LEGEND_DATA_CUBE_ROUTE_PATTERN } from '../__lib__/LegendDataCubeNavigation.js';
import { useEffect } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import type { LegendDataCubeOidcConfig } from '../application/LegendDataCubeApplicationConfig.js';
import {
  type AuthProviderProps,
  withAuthenticationRequired,
  AuthProvider,
  useAuth,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import { authStore } from '../stores/AuthStore.js';

const LegendDataCubeWebApplicationRouter = observer(() => {
  const store = useLegendDataCubeBaseStore();

  useEffect(() => {
    store
      .initialize()
      .catch((error) => store.alertService.alertUnhandledError(error));
  }, [store]);
  const auth = useAuth();

  useEffect(() => {
    if (auth.user?.access_token) {
      authStore.setAccessToken(auth.user.access_token);
    } else {
      authStore.setAccessToken(undefined);
    }
  }, [auth.user]);

  return (
    <div className="h-full">
      {store.initializeState.hasSucceeded && (
        <Routes>
          <Route
            path={LEGEND_DATA_CUBE_ROUTE_PATTERN.BUILDER}
            element={<LegendDataCubeBuilder />}
          />
        </Routes>
      )}
    </div>
  );
});

const LegendDataCubeWebProvider: React.FC<{
  baseUrl: string;
}> = ({ baseUrl }) => {
  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendDataCubeFrameworkProvider>
        <LegendDataCubeWebApplicationRouter />
      </LegendDataCubeFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};

const AuthenticatedLegendDataCubeWebProvider = withAuthenticationRequired(
  LegendDataCubeWebProvider,
  {
    OnRedirecting: () => (
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ),
    signinRedirectArgs: {
      state: `${window.location.pathname}${window.location.search}`,
      extraQueryParams: {},
    },
  },
);

export const LegendDataCubeWebApplication = observer(
  (props: {
    baseUrl: string;
    oidcConfig: LegendDataCubeOidcConfig | undefined;
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

    return mergedOIDCConfig ? (
      <AuthProvider {...mergedOIDCConfig}>
        <AuthenticatedLegendDataCubeWebProvider baseUrl={baseUrl} />
      </AuthProvider>
    ) : (
      <LegendDataCubeWebProvider baseUrl={baseUrl} />
    );
  },
);
