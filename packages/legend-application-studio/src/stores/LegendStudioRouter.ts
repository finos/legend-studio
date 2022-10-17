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

import { generateGAVCoordinates } from '@finos/legend-storage';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { generatePath } from '@finos/legend-application';

export enum LEGEND_STUDIO_PATH_PARAM_TOKEN {
  PROJECT_ID = 'projectId',
  WORKSPACE_ID = 'workspaceId',
  GROUP_WORKSPACE_ID = 'groupWorkspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
  GAV = 'gav',
}

export const LEGEND_STUDIO_ROUTE_PATTERN = Object.freeze({
  VIEW: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}`,
  VIEW_BY_ENTITY: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  VIEW_BY_REVISION: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVISION_ID}`,
  VIEW_BY_VERSION: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.VERSION_ID}`,
  VIEW_BY_REVISION_ENTITY: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVISION_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  VIEW_BY_VERSION_ENTITY: `/view/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.VERSION_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  REVIEW: `/review/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.REVIEW_ID}`,
  EDIT_WORKSPACE: `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID}/`,
  EDIT_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  EDIT_GROUP_WORKSPACE: `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID}/`,
  EDIT_GROUP_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
  SETUP_WORKSPACE: `/setup/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}?/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID}?`,
  SETUP_GROUP_WORKSPACE: `/setup/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID}/`,
});

export const LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN = Object.freeze({
  VIEW_BY_GAV: `/view/archive/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GAV}`,
  VIEW_BY_GAV_ENTITY: `/view/archive/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.GAV}/entity/:${LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH}`,
});

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

export interface WorkspaceEditorPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.ENTITY_PATH]?: string;
}
export interface SetupPathParams {
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID]?: string;
}

const generateGroupWorkspaceSetupRoute = (
  projectId: string | undefined,
  groupWorkspaceId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP_WORKSPACE, {
    // FIXME: due to some problem with typings, we will need to cast like this
    // we will fix this when upgrading react-router
    // See https://github.com/finos/legend-studio/issues/688
    projectId: projectId as string,
    groupWorkspaceId,
  });

const generateWorkspaceSetupRoute = (
  projectId: string | undefined,
  workspaceId?: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE, {
    // FIXME: due to some problem with typings, we will need to cast like this
    // we will fix this when upgrading react-router
    // See https://github.com/finos/legend-studio/issues/688
    projectId: projectId as string,
    // FIXME: due to some problem with typings, we will need to cast like this
    // we will fix this when upgrading react-router
    // See https://github.com/finos/legend-studio/issues/688
    workspaceId: workspaceId as string,
  });

export const generateSetupRoute = (
  projectId: string | undefined,
  workspaceId?: string | undefined,
  workspaceType?: WorkspaceType | undefined,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceSetupRoute(
        projectId,
        guaranteeNonNullable(workspaceId),
      )
    : generateWorkspaceSetupRoute(projectId, workspaceId);

const generateGroupWorkspaceEditorRoute = (
  projectId: string,
  groupWorkspaceId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE, {
        projectId,
        groupWorkspaceId,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE_ENTITY, {
        projectId,
        groupWorkspaceId,
        entityPath,
      });

const generateWorkspaceEditorRoute = (
  projectId: string,
  workspaceId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE, {
        projectId,
        workspaceId,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE_ENTITY, {
        projectId,
        workspaceId,
        entityPath,
      });

export const generateEditorRoute = (
  projectId: string,
  workspaceId: string,
  workspaceType: WorkspaceType,
  entityPath?: string | undefined,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceEditorRoute(projectId, workspaceId, entityPath)
    : generateWorkspaceEditorRoute(projectId, workspaceId, entityPath);

export const generateReviewRoute = (
  projectId: string,
  reviewId: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.REVIEW, {
    projectId,
    reviewId,
  });

export const generateViewProjectRoute = (projectId: string): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW, {
    projectId,
  });

export const generateViewEntityRoute = (
  projectId: string,
  entityPath: string,
): string =>
  generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_ENTITY, {
    projectId,
    entityPath,
  });

export const generateViewProjectByGAVRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV, {
        gav: generateGAVCoordinates(groupId, artifactId, versionId),
      })
    : generatePath(
        LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY,
        {
          gav: generateGAVCoordinates(groupId, artifactId, versionId),
          entityPath,
        },
      );

export const generateViewVersionRoute = (
  projectId: string,
  versionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION, {
        projectId,
        versionId,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY, {
        projectId,
        versionId,
        entityPath,
      });

export const generateViewRevisionRoute = (
  projectId: string,
  revisionId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION, {
        projectId,
        revisionId,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY, {
        projectId,
        revisionId,
        entityPath,
      });
