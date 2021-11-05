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

import { generateGAVCoordinates } from '@finos/legend-server-depot';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { generatePath, matchPath } from 'react-router-dom';
import type { SDLCServerOption } from '../application/StudioConfig';

export enum LEGEND_STUDIO_PATH_PARAM_TOKEN {
  SDLC_SERVER_KEY = 'sdlcServerKey',
  PROJECT_ID = 'projectId',
  WORKSPACE_ID = 'workspaceId',
  GROUP_WORKSPACE_ID = 'groupWorkspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
  GAV = 'gav',
}

export const URL_PATH_PLACEHOLDER = '-';

export const generateRoutePatternWithSDLCServerKey = (
  pattern: string,
): [string, string] => [
  `/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY}(-)${pattern}`,
  `/sdlc-:${LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY}${pattern}`,
];

export const LEGEND_STUDIO_ROUTE_PATTERN = Object.freeze({
  VIEW: generateRoutePatternWithSDLCServerKey(
    `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}`,
  ),
  VIEW_BY_GAV: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GAV}`,
  VIEW_BY_GAV_ENTITY: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GAV}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
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

export interface SDLCServerKeyPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY]: string;
}

export interface ReviewPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.REVIEW_ID]: string;
}

export interface ViewerPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.GAV]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]?: string;
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

const generateGroupWorkspaceSetupRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string | undefined,
  groupWorkspaceId: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      groupWorkspaceId,
    },
  );

const generateWorkspaceSetupRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string | undefined,
  workspaceId?: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.SETUP[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.SETUP[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      workspaceId,
    },
  );

export const generateSetupRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string | undefined,
  workspaceId?: string | undefined,
  workspaceType?: WorkspaceType | undefined,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceSetupRoute(
        sdlcServerOption,
        projectId,
        guaranteeNonNullable(workspaceId),
      )
    : generateWorkspaceSetupRoute(sdlcServerOption, projectId, workspaceId);

const generateGroupWorkspaceEditorRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  groupWorkspaceId: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      groupWorkspaceId,
    },
  );

const generateWorkspaceEditorRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  workspaceId: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.EDIT[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.EDIT[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      workspaceId,
    },
  );
export const generateEditorRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  workspaceId: string,
  workspaceType: WorkspaceType,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceEditorRoute(
        sdlcServerOption,
        projectId,
        workspaceId,
      )
    : generateWorkspaceEditorRoute(sdlcServerOption, projectId, workspaceId);

export const generateReviewRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  reviewId?: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.REVIEW[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.REVIEW[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      reviewId,
    },
  );
export const generateViewProjectRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.VIEW[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
    },
  );
export const generateViewEntityRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  entityPath: string,
): string =>
  generatePath(
    sdlcServerOption.default
      ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY[0]
      : LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY[1],
    {
      sdlcServerKey: sdlcServerOption.default
        ? URL_PATH_PLACEHOLDER
        : sdlcServerOption.key,
      projectId,
      entityPath,
    },
  );
export const generateViewProjectByGAVRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV, {
        gav: generateGAVCoordinates(groupId, artifactId, versionId),
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY, {
        gav: generateGAVCoordinates(groupId, artifactId, versionId),
        entityPath,
      });
export const generateViewProjectEntityByGAVRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_GAV, {
    gav: generateGAVCoordinates(groupId, artifactId, versionId),
  });
export const generateViewVersionRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  versionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(
        sdlcServerOption.default
          ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION[0]
          : LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION[1],
        {
          sdlcServerKey: sdlcServerOption.default
            ? URL_PATH_PLACEHOLDER
            : sdlcServerOption.key,
          projectId,
          versionId,
        },
      )
    : generatePath(
        sdlcServerOption.default
          ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY[0]
          : LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY[1],
        {
          sdlcServerKey: sdlcServerOption.default
            ? URL_PATH_PLACEHOLDER
            : sdlcServerOption.key,
          projectId,
          versionId,
          entityPath,
        },
      );
export const generateViewRevisionRoute = (
  sdlcServerOption: SDLCServerOption,
  projectId: string,
  revisionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(
        sdlcServerOption.default
          ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION[0]
          : LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION[1],
        {
          sdlcServerKey: sdlcServerOption.default
            ? URL_PATH_PLACEHOLDER
            : sdlcServerOption.key,
          projectId,
          revisionId,
        },
      )
    : generatePath(
        sdlcServerOption.default
          ? LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY[0]
          : LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY[1],
        {
          sdlcServerKey: sdlcServerOption.default
            ? URL_PATH_PLACEHOLDER
            : sdlcServerOption.key,
          projectId,
          revisionId,
          entityPath,
        },
      );

/**
 * This will check if the provided path matches the SDLC-instance pattern
 * then accordingly update the path to use the new SDLC server key
 *
 * NOTE: this method returns `undefined` when no update is needed due to various reasons:
 * 1. The path doesn't match the SDLC-instance pattern
 * 2. The new SDLC server key matches the current one in the provided path
 */
export const updateRouteWithNewSDLCServerOption = (
  currentPath: string,
  newOption: SDLCServerOption,
): string | undefined => {
  const patterns = generateRoutePatternWithSDLCServerKey('/:pattern(.*)');
  const match = matchPath<SDLCServerKeyPathParams & { pattern: string }>(
    currentPath,
    patterns,
  );
  if (match) {
    const matchedSDLCServerKey = match.params.sdlcServerKey;
    if (
      matchedSDLCServerKey === newOption.key ||
      (matchedSDLCServerKey === URL_PATH_PLACEHOLDER && newOption.default)
    ) {
      return undefined;
    }
    return `${generatePath(newOption.default ? patterns[0] : patterns[1], {
      pattern: '',
      [LEGEND_STUDIO_PATH_PARAM_TOKEN.SDLC_SERVER_KEY]: newOption.default
        ? URL_PATH_PLACEHOLDER
        : newOption.key,
    })}${match.params.pattern}`;
  }
  return undefined;
};
