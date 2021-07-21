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

import { generatePath } from 'react-router-dom';

export enum PATH_PARAM_TOKEN {
  SDLC_SERVER_KEY = 'sdlcServerKey',
  PROJECT_ID = 'projectId',
  WORKSPACE_ID = 'workspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
}

export const URL_PATH_PLACEHOLDER = '-';

export const generateRoutePatternWithSDLCServerKey = (
  pattern: string,
): string => `/:${PATH_PARAM_TOKEN.SDLC_SERVER_KEY}${pattern}`;

export const ROUTE_PATTERN = Object.freeze({
  VIEW: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}`,
  ),
  VIEW_BY_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}/entity/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  VIEW_BY_REVISION: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${PATH_PARAM_TOKEN.REVISION_ID}`,
  ),
  VIEW_BY_VERSION: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}/version/:${PATH_PARAM_TOKEN.VERSION_ID}`,
  ),
  VIEW_BY_REVISION_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${PATH_PARAM_TOKEN.REVISION_ID}/entity/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  VIEW_BY_VERSION_ENTITY: generateRoutePatternWithSDLCServerKey(
    `/view/:${PATH_PARAM_TOKEN.PROJECT_ID}/version/:${PATH_PARAM_TOKEN.VERSION_ID}/entity/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ),
  REVIEW: generateRoutePatternWithSDLCServerKey(
    `/review/:${PATH_PARAM_TOKEN.PROJECT_ID}/:${PATH_PARAM_TOKEN.REVIEW_ID}`,
  ),
  EDIT: generateRoutePatternWithSDLCServerKey(
    `/edit/:${PATH_PARAM_TOKEN.PROJECT_ID}/:${PATH_PARAM_TOKEN.WORKSPACE_ID}/`,
  ),
  SETUP: generateRoutePatternWithSDLCServerKey(
    `/setup/:${PATH_PARAM_TOKEN.PROJECT_ID}?/:${PATH_PARAM_TOKEN.WORKSPACE_ID}?`,
  ),
});

export const generateSetupRoute = (
  sdlcServerKey: string,
  projectId: string | undefined,
  workspaceId?: string,
): string =>
  generatePath(ROUTE_PATTERN.SETUP, {
    sdlcServerKey,
    projectId,
    workspaceId,
  });
export const generateEditorRoute = (
  sdlcServerKey: string,
  projectId: string,
  workspaceId: string,
): string =>
  generatePath(ROUTE_PATTERN.EDIT, {
    sdlcServerKey,
    projectId,
    workspaceId,
  });
export const generateReviewRoute = (
  sdlcServerKey: string,
  projectId: string,
  reviewId?: string,
): string =>
  generatePath(ROUTE_PATTERN.REVIEW, {
    sdlcServerKey,
    projectId,
    reviewId,
  });
export const generateViewProjectRoute = (
  sdlcServerKey: string,
  projectId: string,
): string =>
  generatePath(ROUTE_PATTERN.VIEW, {
    sdlcServerKey,
    projectId,
  });
export const generateViewVersionRoute = (
  sdlcServerKey: string,
  projectId: string,
  versionId: string,
): string =>
  generatePath(ROUTE_PATTERN.VIEW_BY_VERSION, {
    sdlcServerKey,
    projectId,
    versionId,
  });
export const generateVieweRevisionRoute = (
  sdlcServerKey: string,
  projectId: string,
  revisionId: string,
): string =>
  generatePath(ROUTE_PATTERN.VIEW_BY_REVISION, {
    sdlcServerKey,
    projectId,
    revisionId,
  });
export const generateViewEntityRoute = (
  sdlcServerKey: string,
  projectId: string,
  entityPath: string,
): string =>
  generatePath(ROUTE_PATTERN.VIEW_BY_ENTITY, {
    sdlcServerKey,
    projectId,
    entityPath,
  });

export interface SDLCServerKeyPathParams {
  [PATH_PARAM_TOKEN.SDLC_SERVER_KEY]: string;
}

export interface ReviewPathParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.REVIEW_ID]: string;
}

export interface ViewerPathParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.VERSION_ID]?: string;
  [PATH_PARAM_TOKEN.REVISION_ID]?: string;
  [PATH_PARAM_TOKEN.ENTITY_PATH]?: string;
}

export interface EditorPathParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.WORKSPACE_ID]: string;
}

export interface SetupPathParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]?: string;
  [PATH_PARAM_TOKEN.WORKSPACE_ID]?: string;
}
