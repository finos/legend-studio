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
import { Switch, Route } from 'react-router';
import { WorkspaceSetup } from './workspace-setup/WorkspaceSetup.js';
import { Editor } from './editor/Editor.js';
import { WorkspaceReview } from './workspace-review/WorkspaceReview.js';
import { ProjectViewer } from './project-viewer/ProjectViewer.js';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  GhostIcon,
  MarkdownTextViewer,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { LEGEND_STUDIO_ROUTE_PATTERN } from '../stores/LegendStudioRouter.js';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import { flowResult } from 'mobx';
import { SDLCServerClientProvider } from '@finos/legend-server-sdlc';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import {
  LegendStudioBaseStoreProvider,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from './LegendStudioBaseStoreProvider.js';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  generateExtensionUrlPattern,
  LegendApplicationComponentFrameworkProvider,
  useApplicationStore,
  VirtualAssistant,
} from '@finos/legend-application';
import type { LegendStudioApplicationConfig } from '../application/LegendStudioApplicationConfig.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../stores/LegendStudioDocumentation.js';

const LegendStudioNotFoundRouteScreen = observer(() => {
  const applicationStore = useApplicationStore();

  const currentPath = applicationStore.navigator.getCurrentLocationPath();

  const documentation = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.NOT_FOUND_HELP,
  );

  return (
    <div className="app__page">
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
            <MarkdownTextViewer
              value={documentation.markdownText}
              className="markdown-content--page"
            />
          </div>
        )}
      </div>
    </div>
  );
});

export const LegendStudioApplicationRoot = observer(() => {
  const baseStore = useLegendStudioBaseStore();
  const applicationStore = useLegendStudioApplicationStore();
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
      {!baseStore.isSDLCAuthorized && (
        <div className="app__page">
          <PanelLoadingIndicator isLoading={true} />
        </div>
      )}
      {baseStore.isSDLCAuthorized && (
        <>
          {/* TODO: consider moving this to `LegendApplicationComponentFrameworkProvider` */}
          <VirtualAssistant />
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
              component={ProjectViewer}
            />
            <Route
              exact={true}
              path={LEGEND_STUDIO_ROUTE_PATTERN.REVIEW}
              component={WorkspaceReview}
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
              component={WorkspaceSetup}
            />
            {extraApplicationPageEntries.map((entry) => (
              <Route
                key={entry.key}
                exact={true}
                path={entry.urlPatterns.map(generateExtensionUrlPattern)}
                component={entry.renderer as React.ComponentType<unknown>}
              />
            ))}
            <Route>
              <LegendStudioNotFoundRouteScreen />
            </Route>
          </Switch>
        </>
      )}
    </div>
  );
});

export const LegendStudioApplication = observer(
  (props: {
    config: LegendStudioApplicationConfig;
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
            <LegendStudioBaseStoreProvider>
              <LegendApplicationComponentFrameworkProvider>
                <LegendStudioApplicationRoot />
              </LegendApplicationComponentFrameworkProvider>
            </LegendStudioBaseStoreProvider>
          </GraphManagerStateProvider>
        </DepotServerClientProvider>
      </SDLCServerClientProvider>
    );
  },
);
