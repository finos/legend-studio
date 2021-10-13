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

import type { WorkspaceIdentifier } from '@finos/legend-server-sdlc';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { generatePath } from 'react-router-dom';

export enum LEGEND_STUDIO_PATH_PARAM_TOKEN {
  SDLC_SERVER_KEY = 'sdlcServerKey',
  PROJECT_ID = 'projectId',
  WORKSPACE_ID = 'workspaceId',
  GROUP_WORKSPACE_ID = 'groupWorkspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
}

export const URL_PATH_PLACEHOLDER = '-';

export const generateRoutePatternWithSDLCServerKey = (
  pattern: string,
): string => `/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY}${pattern}`;

export const LEGEND_STUDIO_ROUTE_PATTERN = Object.freeze({
  VIEW: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}`,
  ),
  VIEW_BY_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  VIEW_BY_REVISION: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVISION_ID}`,
  ),
  VIEW_BY_VERSION: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.VERSION_ID}`,
  ),
  VIEW_BY_REVISION_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVISION_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  VIEW_BY_VERSION_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.VERSION_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  REVIEW: generateRoutePatternWithSDLCServerKey(
    `/review/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVIEW_ID}`,
  ),
  EDIT: generateRoutePatternWithSDLCServerKey(
    `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID}/`,
  ),
  EDIT_GROUP: generateRoutePatternWithSDLCServerKey(
    `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID}/`,
  ),
  SETUP: generateRoutePatternWithSDLCServerKey(
    `/setup/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}?/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID}?`,
  ),
  SETUP_GROUP: generateRoutePatternWithSDLCServerKey(
    `/setup/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID}/`,
  ),
});

const generateGroupWorkspaceSetupRoute = (
  sdlcServerKey: string,
  projectId: string | undefined,
  groupWorkspaceId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP, {
    sdlcServerKey,
    projectId,
    groupWorkspaceId,
  });

const generateWorkspaceSetupRoute = (
  sdlcServerKey: string,
  projectId: string | undefined,
  workspaceId?: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP, {
    sdlcServerKey,
    projectId,
    workspaceId,
  });

export const generateSetupRoute = (
  sdlcServerKey: string,
  projectId: string | undefined,
  workspace?: WorkspaceIdentifier,
): string =>
  workspace?.workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceSetupRoute(
        sdlcServerKey,
        projectId,
        workspace.workspaceId,
      )
    : generateWorkspaceSetupRoute(
        sdlcServerKey,
        projectId,
        workspace?.workspaceId,
      );

const generateGroupWorkspaceEditorRoute = (
  sdlcServerKey: string,
  projectId: string,
  groupWorkspaceId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP, {
    sdlcServerKey,
    projectId,
    groupWorkspaceId,
  });

const generateWorkspaceEditorRoute = (
  sdlcServerKey: string,
  projectId: string,
  workspaceId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT, {
    sdlcServerKey,
    projectId,
    workspaceId,
  });
export const generateEditorRoute = (
  sdlcServerKey: string,
  projectId: string,
  workspace: WorkspaceIdentifier,
): string =>
  workspace.workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceEditorRoute(
        sdlcServerKey,
        projectId,
        workspace.workspaceId,
      )
    : generateWorkspaceEditorRoute(
        sdlcServerKey,
        projectId,
        workspace.workspaceId,
      );

export const generateReviewRoute = (
  sdlcServerKey: string,
  projectId: string,
  reviewId?: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.REVIEW, {
    sdlcServerKey,
    projectId,
    reviewId,
  });
export const generateViewProjectRoute = (
  sdlcServerKey: string,
  projectId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW, {
    sdlcServerKey,
    projectId,
  });
export const generateViewVersionRoute = (
  sdlcServerKey: string,
  projectId: string,
  versionId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION, {
    sdlcServerKey,
    projectId,
    versionId,
  });
export const generateVieweRevisionRoute = (
  sdlcServerKey: string,
  projectId: string,
  revisionId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION, {
    sdlcServerKey,
    projectId,
    revisionId,
  });
export const generateViewEntityRoute = (
  sdlcServerKey: string,
  projectId: string,
  entityPath: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY, {
    sdlcServerKey,
    projectId,
    entityPath,
  });

export interface SDLCServerKeyPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY]: string;
}

export interface ReviewPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.REVIEW_ID]: string;
}

export interface ViewerPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.VERSION_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.REVISION_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH]?: string;
}

export interface CoreEditorPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]: string;
}

export interface EditorPathParams extends CoreEditorPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID]: string;
}

export interface GroupEditorPathParams extends CoreEditorPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID]: string;
}
export interface SetupPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID]?: string;
}
