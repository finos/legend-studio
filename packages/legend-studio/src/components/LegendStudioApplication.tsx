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
import { Switch, Route, Redirect, useRouteMatch } from 'react-router-dom';
import { Setup } from './setup/Setup';
import { Editor } from './editor/Editor';
import { Review } from './review/Review';
import { Viewer } from './viewer/Viewer';
import { observer } from 'mobx-react-lite';
import {
  LegendMaterialUITheme,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import type { SDLCServerKeyPathParams } from '../stores/LegendStudioRouter';
import {
  URL_PATH_PLACEHOLDER,
  generateSetupRoute,
  LEGEND_STUDIO_ROUTE_PATTERN,
  generateRoutePatternWithSDLCServerKey,
} from '../stores/LegendStudioRouter';
import { AppHeader } from './shared/AppHeader';
import { AppHeaderMenu } from './editor/header/AppHeaderMenu';
import { ThemeProvider } from '@material-ui/core/styles';
import type { StudioPluginManager } from '../application/StudioPluginManager';
import type { Log } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { SDLCServerClientProvider } from '@finos/legend-server-sdlc';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { StudioStoreProvider, useStudioStore } from './StudioStoreProvider';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  NotificationSnackbar,
  useApplicationStore,
  useWebApplicationNavigator,
} from '@finos/legend-application';
import type { StudioConfig } from '../application/StudioConfig';

export const LegendStudioApplicationRoot = observer(() => {
  const studioStore = useStudioStore();
  const applicationStore = useApplicationStore<StudioConfig>();
  const extraApplicationPageRenderEntries = studioStore.pluginManager
    .getStudioPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageRenderEntries?.() ?? []);

  useEffect(() => {
    flowResult(studioStore.initialize()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, studioStore]);

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
      {!studioStore.isSDLCAuthorized && (
        <div className="app__page">
          <AppHeader>
            <AppHeaderMenu />
          </AppHeader>
          <PanelLoadingIndicator isLoading={true} />
          <div className="app__content" />
        </div>
      )}
      {studioStore.isSDLCAuthorized && (
        <Switch>
          <Route
            exact={true}
            path={[
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY,
              ...LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY,
            ]}
            component={Viewer}
          />
          <Route
            exact={true}
            path={LEGEND_STUDIO_ROUTE_PATTERN.REVIEW}
            component={Review}
          />
          <Route
            exact={true}
            strict={true}
            path={[
              ...LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP,
              ...LEGEND_STUDIO_ROUTE_PATTERN.EDIT,
            ]}
            component={Editor}
          />
          <Route
            exact={true}
            path={[
              ...LEGEND_STUDIO_ROUTE_PATTERN.SETUP,
              ...LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP,
            ]}
            component={Setup}
          />
          {extraApplicationPageRenderEntries.map((entry) => (
            <Route
              key={entry.key}
              exact={true}
              path={entry.urlPatterns}
              component={entry.component as React.ComponentType<unknown>}
            />
          ))}
          <Redirect
            to={generateSetupRoute(
              applicationStore.config.defaultSDLCServerOption,
              undefined,
            )}
          />
        </Switch>
      )}
    </div>
  );
});

export const LegendStudioApplication = observer(
  (props: {
    config: StudioConfig;
    pluginManager: StudioPluginManager;
    log: Log;
  }) => {
    const { config, pluginManager, log } = props;
    const navigator = useWebApplicationNavigator();
    const routeMatch = useRouteMatch<SDLCServerKeyPathParams>(
      generateRoutePatternWithSDLCServerKey('/'),
    );
    const matchedSDLCServerKey = routeMatch?.params.sdlcServerKey;
    const matchingSDLCServerOption = config.SDLCServerOptions.find((option) => {
      if (matchedSDLCServerKey === URL_PATH_PLACEHOLDER) {
        return config.defaultSDLCServerOption;
      }
      return option.key === matchedSDLCServerKey;
    });

    /**
     * NOTE: here we handle 3 cases:
     * 1. When the URL matches SDLC-instance pattern: and the key is found: if the key doesn't match
     *    the current SDLC option, update the current SDLC option.
     * 2. When the URL matches SDLC-instance pattern: and the key is NOT found: auto-fix the URL by
     *    redirecting users to the setup page with the default SDLC server option.
     * 3. When the URL DOES NOT match SDLC-instance pattern: do nothing here, let the app flows through
     *    because this might represent a sub-application that does not need to specify a SDLC instance
     *    (i.e. use the default SDLC server)
     */
    useEffect(() => {
      if (matchedSDLCServerKey) {
        // auto-fix the URL by using the default SDLC server option
        if (!matchingSDLCServerOption) {
          navigator.goTo(
            generateSetupRoute(config.defaultSDLCServerOption, undefined),
          );
        } else if (
          matchingSDLCServerOption !== config.currentSDLCServerOption
        ) {
          config.setCurrentSDLCServerOption(matchingSDLCServerOption);
        }
      }
    }, [config, navigator, matchedSDLCServerKey, matchingSDLCServerOption]);

    if (
      // See the note above, we will only pass when the either the SDLC server option is properly set
      // or the URL does not match the SDLC-instance pattern at all (i.e. some sub applications that just
      // uses the default SDLC server option)
      matchedSDLCServerKey &&
      (!matchingSDLCServerOption ||
        matchingSDLCServerOption !== config.currentSDLCServerOption)
    ) {
      return null;
    }
    return (
      <ApplicationStoreProvider config={config} navigator={navigator} log={log}>
        <SDLCServerClientProvider
          config={{
            env: config.env,
            serverUrl: config.sdlcServerUrl,
          }}
        >
          <DepotServerClientProvider
            config={{
              serverUrl: config.depotServerUrl,
            }}
          >
            <GraphManagerStateProvider pluginManager={pluginManager} log={log}>
              <StudioStoreProvider pluginManager={pluginManager}>
                <ThemeProvider theme={LegendMaterialUITheme}>
                  <LegendStudioApplicationRoot />
                </ThemeProvider>
              </StudioStoreProvider>
            </GraphManagerStateProvider>
          </DepotServerClientProvider>
        </SDLCServerClientProvider>
      </ApplicationStoreProvider>
    );
  },
);
