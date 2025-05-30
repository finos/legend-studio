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
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  GhostIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
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
  Routes,
} from '@finos/legend-application/browser';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../__lib__/LegendStudioDocumentation.js';
import { LazyTextEditor } from './lazy-text-editor/LazyTextEditor.js';
import { PureCompatibilityTestManager } from './pct/PureCompatibilityTest.js';
import { ShowcaseViewer } from './showcase/ShowcaseViewer.js';
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
              <Routes>
                <Route
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV}
                  element={<ProjectViewer />}
                />
                <Route
                  path={
                    LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY
                  }
                  element={<ProjectViewer />}
                />

                <Route
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE}
                  element={<ShowcaseViewer />}
                />

                <Route
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PCT_REPORT}
                  element={<PureCompatibilityTestManager />}
                />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </>
          )}
          {baseStore.isSDLCAuthorized && (
            <>
              <Routes>
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW}
                  element={<ProjectViewer />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY}
                  element={<ProjectViewer />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION}
                  element={<ProjectViewer />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION}
                  element={<ProjectViewer />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY}
                  element={<ProjectViewer />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY}
                  element={<ProjectViewer />}
                />

                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.REVIEW}
                  element={<ProjectReviewer />}
                />

                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE}
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE}
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE_ENTITY}
                  element={<Editor />}
                />
                <Route
                  path={
                    LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE_ENTITY
                  }
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE}
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE}
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE_ENTITY}
                  element={<Editor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE_ENTITY}
                  element={<Editor />}
                />

                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.TEXT_GROUP_WORKSPACE}
                  element={<LazyTextEditor />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.TEXT_WORKSPACE}
                  element={<LazyTextEditor />}
                />

                <Route
                  // root path will lead to setup page (home page)
                  path=""
                  element={<WorkspaceSetup />}
                />
                <Route
                  // root path will lead to setup page (home page)
                  path="/"
                  element={<WorkspaceSetup />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE}
                  element={<WorkspaceSetup />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_WORKSPACE}
                  element={<WorkspaceSetup />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP_WORKSPACE}
                  element={<WorkspaceSetup />}
                />
                <Route
                  path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_GROUP_WORKSPACE}
                  element={<WorkspaceSetup />}
                />

                <Route
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE}
                  element={<ShowcaseViewer />}
                />

                <Route
                  path={LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PCT_REPORT}
                  element={<PureCompatibilityTestManager />}
                />

                {extraApplicationPageEntries.flatMap((entry) =>
                  entry.addressPatterns
                    .map(generateExtensionUrlPattern)
                    .map((path) => (
                      <Route
                        key={entry.key}
                        path={path}
                        element={entry.renderer()}
                      />
                    )),
                )}

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </>
          )}
        </>
      )}
    </div>
  );
});

const LegendStudioWebProvider: React.FC<{
  baseUrl: string;
}> = ({ baseUrl }) => {
  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendStudioFrameworkProvider>
        <LegendStudioWebApplicationRouter />
      </LegendStudioFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};

const AuthenticatedLegendStudioWebProvider = withAuthenticationRequired(
  LegendStudioWebProvider,
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

export const LegendStudioWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;

    const applicationStore = useLegendStudioApplicationStore();
    const oidcConfig =
      applicationStore.config.options.ingestDeploymentConfig?.deployment
        .oidcConfig;
    const enableOauthFlow = applicationStore.config.options.enableOauthFlow;
    if (oidcConfig) {
      const onSigninCallback = (_user: User | undefined) => {
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
            <AuthenticatedLegendStudioWebProvider baseUrl={baseUrl} />
          </AuthProvider>
        );
      }
      return (
        <AuthProvider {...mergedOIDCConfig}>
          <LegendStudioWebProvider baseUrl={baseUrl} />
        </AuthProvider>
      );
    }

    return <LegendStudioWebProvider baseUrl={baseUrl} />;
  },
);
