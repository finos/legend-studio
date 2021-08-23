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
  CustomSelectorInput,
  LegendMaterialUITheme,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import type { SDLCServerKeyPathParams } from '../stores/LegendStudioRouter';
import {
  generateSetupRoute,
  LEGEND_STUDIO_ROUTE_PATTERN,
  generateRoutePatternWithSDLCServerKey,
} from '../stores/LegendStudioRouter';
import { AppHeader, BasicAppHeader } from './shared/AppHeader';
import { AppHeaderMenu } from './editor/header/AppHeaderMenu';
import { ThemeProvider } from '@material-ui/core/styles';
import type { StudioPluginManager } from '../application/StudioPluginManager';
import type { Log } from '@finos/legend-shared';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { SDLCServerClientProvider } from '@finos/legend-server-sdlc';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { StudioStoreProvider, useStudioStore } from './StudioStoreProvider';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import type {
  ApplicationConfig,
  SDLCServerOption,
} from '@finos/legend-application';
import {
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  NotificationSnackbar,
  useApplicationStore,
  useWebApplicationNavigator,
} from '@finos/legend-application';

export const LegendStudioApplicationRoot = observer(() => {
  const studioStore = useStudioStore();
  const applicationStore = useApplicationStore();
  const extraApplicationPageRenderEntries = studioStore.pluginManager
    .getStudioPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageRenderEntries?.() ?? [])
    .filter((entry) => {
      /**
       * NOTE: Make sure the first path in the url pattern is not a token which could make it the catch-all route.
       *
       * TODO: maybe there's a more sophisticated way to manage URL pattern conflicts, but this is sufficient for now.
       */
      if (entry.urlPattern.startsWith('/:')) {
        applicationStore.notifyIllegalState(
          `Can't render extra application page with URL pattern '${entry.urlPattern}' from plugins due to pattern conflicts`,
        );
        return false;
      }
      return true;
    });

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
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY,
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
            path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT}
            component={Editor}
          />
          <Route
            exact={true}
            path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP}
            component={Setup}
          />
          {extraApplicationPageRenderEntries.map((entry) => (
            <Route
              key={entry.urlPattern}
              exact={true}
              path={generateRoutePatternWithSDLCServerKey(entry.urlPattern)}
              component={entry.component as React.ComponentType<unknown>}
            />
          ))}
          <Redirect
            to={generateSetupRoute(
              applicationStore.config.sdlcServerKey,
              undefined,
            )}
          />
        </Switch>
      )}
    </div>
  );
});

const LegendStudioApplicationConfigEditor = observer(
  (props: { config: ApplicationConfig }) => {
    const { config } = props;
    const navigator = useWebApplicationNavigator();
    const sdlcServerOptions = config.sdlcServerOptions.map((option) => ({
      label: option.label,
      value: option,
    }));
    const onSDLCServerChange = (val: {
      label: string;
      value: SDLCServerOption;
    }): void => {
      config.setSDLCServerKey(val.value.key);
    };
    const currentSDLCServerOption = guaranteeNonNullable(
      sdlcServerOptions.find(
        (option) => option.value.key === config.sdlcServerKey,
      ),
    );

    const configure = (): void => {
      config.setConfigured(true);
      // go to the default URL after confiruing SDLC server
      navigator.goTo(generateSetupRoute(config.sdlcServerKey, undefined));
    };

    return (
      <div className="app">
        <div className="app__page">
          <BasicAppHeader config={config} />
          <div className="app__content app__configuration-editor">
            <div className="app__configuration-editor__content">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  SDLC Server
                </div>
                <CustomSelectorInput
                  options={sdlcServerOptions}
                  onChange={onSDLCServerChange}
                  value={currentSDLCServerOption}
                  darkMode={true}
                />
                <button
                  className="btn btn--dark u-pull-right app__configuration-editor__action"
                  onClick={configure}
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const LegendStudioApplication = observer(
  (props: {
    config: ApplicationConfig;
    pluginManager: StudioPluginManager;
    log: Log;
  }) => {
    const { config, pluginManager, log } = props;
    const navigator = useWebApplicationNavigator();
    const routeMatch = useRouteMatch<SDLCServerKeyPathParams>(
      generateRoutePatternWithSDLCServerKey('/'),
    );
    const sdlcServerKey = config.sdlcServerOptions.find(
      (option) => option.key === routeMatch?.params.sdlcServerKey,
    )?.key;

    useEffect(() => {
      if (!config.isConfigured) {
        if (sdlcServerKey !== undefined) {
          config.setSDLCServerKey(sdlcServerKey);
          config.setConfigured(true);
        } else if (config.sdlcServerOptions.length === 1) {
          // when there is only one SDLC server and the sdlc server key provided is unrecognized,
          // auto-fix the URL
          navigator.goTo(
            generateSetupRoute(config.sdlcServerOptions[0].key, undefined),
          );
        } else {
          // set this by default for the app config editor
          config.setSDLCServerKey(config.sdlcServerOptions[0].key);
        }
      }
    }, [config, navigator, sdlcServerKey]);

    if (!config.isConfigured) {
      if (!config._sdlcServerKey) {
        return null;
      }
      return (
        <ThemeProvider theme={LegendMaterialUITheme}>
          <LegendStudioApplicationConfigEditor config={config} />
        </ThemeProvider>
      );
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
