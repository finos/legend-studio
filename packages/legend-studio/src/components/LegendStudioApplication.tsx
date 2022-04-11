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
import { Switch, Route } from 'react-router-dom';
import { Setup } from './setup/Setup';
import { Editor } from './editor/Editor';
import { Review } from './review/Review';
import { Viewer } from './viewer/Viewer';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  GhostIcon,
  MarkdownTextViewer,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { LEGEND_STUDIO_ROUTE_PATTERN } from '../stores/LegendStudioRouter';
import { LegendStudioAppHeaderMenu } from './editor/header/LegendStudioAppHeaderMenu';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager';
import { flowResult } from 'mobx';
import { SDLCServerClientProvider } from '@finos/legend-server-sdlc';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import {
  LegendStudioStoreProvider,
  useLegendStudioStore,
} from './LegendStudioStoreProvider';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  AppHeader,
  LegendApplicationComponentFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendStudioConfig } from '../application/LegendStudioConfig';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../stores/LegendStudioDocumentation';

const LegendStudioNotFoundRouteScreen = observer(() => {
  const applicationStore = useApplicationStore();

  const currentPath = applicationStore.navigator.getCurrentLocationPath();

  const documentation = applicationStore.docRegistry.getEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.NOT_FOUND_HELP,
  );

  return (
    <div className="app__page">
      <AppHeader>
        <LegendStudioAppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div
          className={clsx('not-found-screen', {
            'not-found-screen--no-documentation': !documentation?.markdownText,
          })}
        >
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
                {applicationStore.navigator.generateLocation(currentPath)}
              </span>
              was not found in the application
            </div>
          </div>
          {documentation?.markdownText && (
            <div className="not-found-screen__documentation">
              <MarkdownTextViewer value={documentation.markdownText} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Prefix URL patterns coming from extensions with `/extensions/`
 * to avoid potential conflicts with main routes.
 */
const generateExtensionUrlPattern = (pattern: string): string =>
  `/extensions/${pattern}`.replace(/^\/extensions\/\//, '/extensions/');

export const LegendStudioApplicationRoot = observer(() => {
  const studioStore = useLegendStudioStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const extraApplicationPageRenderEntries = studioStore.pluginManager
    .getStudioPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageRenderEntries?.() ?? []);

  useEffect(() => {
    flowResult(studioStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, studioStore]);

  return (
    <div className="app">
      {!studioStore.isSDLCAuthorized && (
        <div className="app__page">
          <AppHeader>
            <LegendStudioAppHeaderMenu />
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
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV,
              LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY,
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
            path={[
              LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP,
              LEGEND_STUDIO_ROUTE_PATTERN.EDIT,
            ]}
            component={Editor}
          />
          <Route
            exact={true}
            path={[
              // root path will lead to setup page (home page)
              '/',
              LEGEND_STUDIO_ROUTE_PATTERN.SETUP,
              LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP,
            ]}
            component={Setup}
          />
          {extraApplicationPageRenderEntries.map((entry) => (
            <Route
              key={entry.key}
              exact={true}
              path={entry.urlPatterns.map(generateExtensionUrlPattern)}
              component={entry.component as React.ComponentType<unknown>}
            />
          ))}
          {/* <Route
            exact={true}
            path={[LEGEND_STUDIO_ROUTE_PATTERN.NOT_FOUND]}
            component={LegendStudioNotFoundRouteScreen}
          /> */}
          {/* <Redirect
            to={{
              pathname: generateNotFoundRoute(),
              state: {
                from: applicationStore.navigator.getCurrentLocationPath(),
              },
            }}
            push={false}
          /> */}
          <Route>
            <LegendStudioNotFoundRouteScreen />
          </Route>
        </Switch>
      )}
    </div>
  );
});

export const LegendStudioApplication = observer(
  (props: {
    config: LegendStudioConfig;
    pluginManager: LegendStudioPluginManager;
  }) => {
    const { config, pluginManager } = props;
    const applicationStore = useApplicationStore();

    return (
      <SDLCServerClientProvider
        config={{
          env: config.env,
          serverUrl: config.sdlcServerUrl,
          baseHeaders: config.SDLCServerBaseHeaders,
        }}
      >
        <DepotServerClientProvider
          config={{
            serverUrl: config.depotServerUrl,
          }}
        >
          <GraphManagerStateProvider
            pluginManager={pluginManager}
            log={applicationStore.log}
          >
            <LegendStudioStoreProvider pluginManager={pluginManager}>
              <LegendApplicationComponentFrameworkProvider>
                <LegendStudioApplicationRoot />
              </LegendApplicationComponentFrameworkProvider>
            </LegendStudioStoreProvider>
          </GraphManagerStateProvider>
        </DepotServerClientProvider>
      </SDLCServerClientProvider>
    );
  },
);
