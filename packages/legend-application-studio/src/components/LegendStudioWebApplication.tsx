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
import { WorkspaceSetup } from './workspace-setup/WorkspaceSetup.js';
import { Editor } from './editor/Editor.js';
import { ProjectReviewer } from './project-reviewer/ProjectReviewer.js';
import { ProjectViewer } from './project-view/ProjectViewer.js';
import { observer } from 'mobx-react-lite';
import { clsx, GhostIcon, MarkdownTextViewer } from '@finos/legend-art';
import {
  LEGEND_STUDIO_ROUTE_PATTERN,
  LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN,
} from '../__lib__/LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import {
  LegendStudioFrameworkProvider,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from './LegendStudioFrameworkProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  BrowserEnvironmentProvider,
  generateExtensionUrlPattern,
  Route,
  Switch,
  type TEMPORARY__ReactRouterComponentType,
} from '@finos/legend-application/browser';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../__lib__/LegendStudioDocumentation.js';
import { LazyTextEditor } from './lazy-text-editor/LazyTextEditor.js';
import { PureCompatibilityTestManager } from './pct/PureCompatibilityTest.js';
import { ShowcaseViewer } from './showcase/ShowcaseViewer.js';

const NotFoundPage = observer(() => {
  const applicationStore = useApplicationStore();

  const currentPath =
    applicationStore.navigationService.navigator.getCurrentLocation();

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
              {applicationStore.navigationService.navigator.generateAddress(
                currentPath,
              )}
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

export const LegendStudioWebApplicationRouter = observer(() => {
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
      {baseStore.initState.hasCompleted && (
        <>
          {baseStore.isSDLCAuthorized === undefined && (
            <>
              <Switch>
                <Route
                  exact={true}
                  path={[
                    LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV,
                    LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY,
                  ]}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    ProjectViewer as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  path={
                    LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE_PROJECT
                  }
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    ShowcaseViewer as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PCT_REPORT}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    PureCompatibilityTestManager as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route>
                  <NotFoundPage />
                </Route>
              </Switch>
            </>
          )}
          {baseStore.isSDLCAuthorized && (
            <>
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
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    ProjectViewer as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  path={LEGEND_STUDIO_ROUTE_PATTERN.REVIEW}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    ProjectReviewer as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  strict={true}
                  path={[
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE_ENTITY,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE_ENTITY,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE_ENTITY,
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE_ENTITY,
                  ]}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    Editor as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  strict={true}
                  path={[
                    LEGEND_STUDIO_ROUTE_PATTERN.TEXT_GROUP_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.TEXT_WORKSPACE,
                  ]}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    LazyTextEditor as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  path={[
                    // root path will lead to setup page (home page)
                    '/',
                    LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP_WORKSPACE,
                    LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_GROUP_WORKSPACE,
                  ]}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    WorkspaceSetup as TEMPORARY__ReactRouterComponentType
                  }
                />
                <Route
                  exact={true}
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PCT_REPORT}
                  component={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    PureCompatibilityTestManager as TEMPORARY__ReactRouterComponentType
                  }
                />
                {extraApplicationPageEntries.map((entry) => (
                  <Route
                    key={entry.key}
                    exact={true}
                    path={entry.addressPatterns.map(
                      generateExtensionUrlPattern,
                    )}
                    component={
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      entry.renderer as TEMPORARY__ReactRouterComponentType
                    }
                  />
                ))}
                <Route>
                  <NotFoundPage />
                </Route>
              </Switch>
            </>
          )}
        </>
      )}
    </div>
  );
});

export const LegendStudioWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;

    return (
      <BrowserEnvironmentProvider baseUrl={baseUrl}>
        <LegendStudioFrameworkProvider>
          <LegendStudioWebApplicationRouter />
        </LegendStudioFrameworkProvider>
      </BrowserEnvironmentProvider>
    );
  },
);
