/**
 * Copyright Goldman Sachs
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

export enum PATH_PARAM_TOKEN {
  PROJECT_ID = 'projectId',
  WORKSPACE_ID = 'workspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
}

export const ROUTE_PATTERN = Object.freeze({
  VIEWER: [
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}`,
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}/element/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${PATH_PARAM_TOKEN.REVISION_ID}`,
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}/version/:${PATH_PARAM_TOKEN.VERSION_ID}`,
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${PATH_PARAM_TOKEN.REVISION_ID}/element/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
    `/viewer/:${PATH_PARAM_TOKEN.PROJECT_ID}/version/:${PATH_PARAM_TOKEN.VERSION_ID}/element/:${PATH_PARAM_TOKEN.ENTITY_PATH}`,
  ],
  REVIEW: `/review/:${PATH_PARAM_TOKEN.PROJECT_ID}/:${PATH_PARAM_TOKEN.REVIEW_ID}`,
  EDITOR: `/:${PATH_PARAM_TOKEN.PROJECT_ID}/:${PATH_PARAM_TOKEN.WORKSPACE_ID}/`,
  SETUP: `/:${PATH_PARAM_TOKEN.PROJECT_ID}?/:${PATH_PARAM_TOKEN.WORKSPACE_ID}?`,
});

export const getSetupRoute = (
  projectId: string,
  workspaceId?: string,
): string => `/${projectId}${workspaceId ? `/${workspaceId}` : ''}`;
export const getEditorRoute = (
  projectId: string,
  workspaceId: string,
): string => `/${projectId}/${workspaceId}/`;
export const getReviewRoute = (projectId: string, reviewId?: string): string =>
  `/review/${projectId}/${reviewId}`;
export const getProjectViewerRoute = (projectId: string): string =>
  `/viewer/${projectId}`;
export const getVersionViewerRoute = (
  projectId: string,
  versionId: string,
): string => `/viewer/${projectId}/version/${versionId}`;
export const getRevisionViewerRoute = (
  projectId: string,
  revisionId: string,
): string => `/viewer/${projectId}/revision/${revisionId}`;
export const getElementViewerRoute = (
  projectId: string,
  entityPath: string,
): string => `/viewer/${projectId}/element/${entityPath}`;

export interface ReviewRouteParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.REVIEW_ID]: string;
}

export interface ViewerRouteParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.VERSION_ID]?: string;
  [PATH_PARAM_TOKEN.REVISION_ID]?: string;
  [PATH_PARAM_TOKEN.ENTITY_PATH]?: string;
}

export interface EditorRouteParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [PATH_PARAM_TOKEN.WORKSPACE_ID]: string;
}

export interface SetupRouteParams {
  [PATH_PARAM_TOKEN.PROJECT_ID]?: string;
  [PATH_PARAM_TOKEN.WORKSPACE_ID]?: string;
}
