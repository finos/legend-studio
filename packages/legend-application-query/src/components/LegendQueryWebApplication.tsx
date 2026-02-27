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
import { LEGEND_QUERY_ROUTE_PATTERN } from '../__lib__/LegendQueryNavigation.js';
import { QuerySetupLandingPage } from './QuerySetup.js';
import {
  ExistingQueryEditor,
  MappingQueryCreator,
  ServiceQueryCreator,
} from './QueryEditor.js';
import {
  BrowserEnvironmentProvider,
  generateExtensionUrlPattern,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import { LegendTokenSync } from '@finos/legend-application';
import {
  LegendQueryFrameworkProvider,
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { EditExistingQuerySetup } from './EditExistingQuerySetup.js';
import { CreateMappingQuerySetup } from './CreateMappingQuerySetup.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import { LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN } from '../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { DataSpaceTemplateQueryCreator } from './data-space/DataSpaceTemplateQueryCreator.js';
import { DataSpaceQueryCreator } from './data-space/DataSpaceQueryCreator.js';
import { ExistingQueryDataCubeViewer } from './data-cube/ExistingQueryDataCubeViewer.js';
import {
  AuthProvider,
  withAuthenticationRequired,
  type AuthProviderProps,
} from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';

const LegendQueryWebApplicationRouter = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();

  const extraApplicationPageEntries = applicationStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageEntries?.() ?? []);

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
            path={LEGEND_QUERY_ROUTE_PATTERN.DEFAULT}
            element={<DataSpaceQueryCreator />}
          />
          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY_SETUP}
            element={<EditExistingQuerySetup />}
          />

          <Route
            path={generateExtensionUrlPattern(
              LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN.TEMPLATE_QUERY,
            )}
            element={<DataSpaceTemplateQueryCreator />}
          />

          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.SETUP}
            element={<QuerySetupLandingPage />}
          />

          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_MAPPING_QUERY_SETUP}
            element={<CreateMappingQuerySetup />}
          />
          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
            element={<ExistingQueryEditor />}
          />
          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.DATA_CUBE_EXISTING_QUERY}
            element={<ExistingQueryDataCubeViewer />}
          />
          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY}
            element={<ServiceQueryCreator />}
          />
          <Route
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_MAPPING_QUERY}
            element={<MappingQueryCreator />}
          />

          {/* LEGACY DATA SPACE */}
          <Route
            path={generateExtensionUrlPattern(
              LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN.SETUP,
            )}
            element={<DataSpaceQueryCreator />}
          />

          <Route
            path={generateExtensionUrlPattern(
              LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN.CREATE,
            )}
            element={<DataSpaceQueryCreator />}
          />

          {extraApplicationPageEntries.flatMap((entry) =>
            entry.addressPatterns
              .map(generateExtensionUrlPattern)
              .map((path) => (
                <Route key={entry.key} path={path} element={entry.renderer()} />
              )),
          )}
        </Routes>
      )}
    </div>
  );
});

const LegendQueryWebProvider: React.FC<{
  baseUrl: string;
}> = ({ baseUrl }) => {
  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendQueryFrameworkProvider>
        <LegendQueryWebApplicationRouter />
      </LegendQueryFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};

const AuthenticatedLegendQueryWebProvider = withAuthenticationRequired(
  LegendQueryWebProvider,
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

export const LegendQueryWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;
    const applicationStore = useLegendQueryApplicationStore();
    const oidcConfig = applicationStore.config.options.oidcConfig;
    const enableOauthFlow = applicationStore.config.options.enableOauthFlow;

    if (oidcConfig) {
      const onSigninCallback = (_user: User | undefined): void => {
        window.location.href = (_user?.state as string | undefined) ?? '/';
      };

      const mergedOIDCConfig: AuthProviderProps = {
        ...oidcConfig.authProviderProps,
        redirect_uri: `${window.location.origin}${oidcConfig.redirectPath}`,
        silent_redirect_uri: `${window.location.origin}${oidcConfig.silentRedirectPath}`,
        onSigninCallback,
      };

      if (enableOauthFlow) {
        return (
          <AuthProvider {...mergedOIDCConfig}>
            <LegendTokenSync>
              <AuthenticatedLegendQueryWebProvider baseUrl={baseUrl} />
            </LegendTokenSync>
          </AuthProvider>
        );
      }
      return (
        <AuthProvider {...mergedOIDCConfig}>
          <LegendTokenSync>
            <LegendQueryWebProvider baseUrl={baseUrl} />
          </LegendTokenSync>
        </AuthProvider>
      );
    }

    return <LegendQueryWebProvider baseUrl={baseUrl} />;
  },
);
