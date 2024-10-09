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
import { generatePath } from '@finos/legend-application/browser';

export enum LEGEND_STUDIO_ROUTE_PATTERN_TOKEN {
  SHOWCASE_PATH = 'showcasePath',
  PROJECT_ID = 'projectId',
  PATCH_RELEASE_VERSION_ID = 'patchReleaseVersionId',
  WORKSPACE_ID = 'workspaceId',
  GROUP_WORKSPACE_ID = 'groupWorkspaceId',
  REVISION_ID = 'revisionId',
  VERSION_ID = 'versionId',
  REVIEW_ID = 'reviewId',
  ENTITY_PATH = 'entityPath',
  GAV = 'gav',
}

export const LEGEND_STUDIO_ROUTE_PATTERN = Object.freeze({
  VIEW: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}`,
  VIEW_BY_ENTITY: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  VIEW_BY_REVISION: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVISION_ID}`,
  VIEW_BY_VERSION: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.VERSION_ID}`,
  VIEW_BY_REVISION_ENTITY: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/revision/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVISION_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  VIEW_BY_VERSION_ENTITY: `/view/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/version/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.VERSION_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  REVIEW: `/review/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVIEW_ID}`,
  PATCH_REVIEW: `/review/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVIEW_ID}`,
  EDIT_WORKSPACE: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}/`,
  EDIT_PATCH_WORKSPACE: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}/`,
  EDIT_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  EDIT_PATCH_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  EDIT_GROUP_WORKSPACE: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/`,
  EDIT_PATCH_GROUP_WORKSPACE: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/`,
  EDIT_GROUP_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  EDIT_PATCH_GROUP_WORKSPACE_ENTITY: `/edit/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  SETUP_WORKSPACE: `/setup/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}?/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}?`,
  SETUP_PATCH_WORKSPACE: `/setup/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}?/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}?`,
  SETUP_GROUP_WORKSPACE: `/setup/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/`,
  SETUP_PATCH_GROUP_WORKSPACE: `/setup/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/patches/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID}?/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/`,
  TEXT_GROUP_WORKSPACE: `/text/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/groupWorkspace/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/`,
  TEXT_WORKSPACE: `/text/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID}/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID}/`,
});

export const LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN = Object.freeze({
  VIEW_BY_GAV: `/view/archive/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GAV}`,
  VIEW_BY_GAV_ENTITY: `/view/archive/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GAV}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}`,
  PREVIEW_BY_GAV_ENTITY: `/view/archive/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GAV}/entity/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH}/preview`,
  SHOWCASE: `/showcase/:${LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.SHOWCASE_PATH}`,
  PCT_REPORT: '/pct',
});

export type ProjectReviewerPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVIEW_ID]: string;
};

export type ProjectViewerPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GAV]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.VERSION_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.REVISION_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH]?: string;
};

export type ShowcaseViewerPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.SHOWCASE_PATH]?: string;
};

export type WorkspaceEditorPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH]?: string;
};

export type LazyTextEditorPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID]: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]?: string;
};

export type WorkspaceSetupPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PATCH_RELEASE_VERSION_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID]?: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]?: string;
};

export type ElementPreviewPathParams = {
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.ENTITY_PATH]: string;
};

const generateGroupWorkspaceSetupRoute = (
  projectId: string | undefined,
  patchReleaseVersionId: string | undefined,
  groupWorkspaceId: string,
): string =>
  patchReleaseVersionId
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_GROUP_WORKSPACE, {
        // FIXME: due to some problem with typings, we will need to cast like this
        // we will fix this when upgrading react-router
        // See https://github.com/finos/legend-studio/issues/688
        projectId: projectId as string,
        patchReleaseVersionId: patchReleaseVersionId,
        groupWorkspaceId,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_GROUP_WORKSPACE, {
        // FIXME: due to some problem with typings, we will need to cast like this
        // we will fix this when upgrading react-router
        // See https://github.com/finos/legend-studio/issues/688
        projectId: projectId as string,
        groupWorkspaceId,
      });

const generateWorkspaceSetupRoute = (
  projectId: string | undefined,
  patchReleaseVersionId: string | undefined,
  workspaceId?: string,
): string =>
  patchReleaseVersionId
    ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_PATCH_WORKSPACE, {
        // FIXME: due to some problem with typings, we will need to cast like this
        // we will fix this when upgrading react-router
        // See https://github.com/finos/legend-studio/issues/688
        projectId: projectId as string,
        patchReleaseVersionId: patchReleaseVersionId,
        // FIXME: due to some problem with typings, we will need to cast like this
        // we will fix this when upgrading react-router
        // See https://github.com/finos/legend-studio/issues/688
        workspaceId: workspaceId as string,
      })
    : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE, {
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
  patchReleaseVersionId: string | undefined,
  workspaceId?: string | undefined,
  workspaceType?: WorkspaceType | undefined,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceSetupRoute(
        projectId,
        patchReleaseVersionId,
        guaranteeNonNullable(workspaceId),
      )
    : generateWorkspaceSetupRoute(
        projectId,
        patchReleaseVersionId,
        workspaceId,
      );

const generateGroupWorkspaceEditorRoute = (
  projectId: string,
  patchReleaseVersionId: string | undefined,
  groupWorkspaceId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? patchReleaseVersionId
      ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE, {
          projectId,
          patchReleaseVersionId,
          groupWorkspaceId,
        })
      : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE, {
          projectId,
          groupWorkspaceId,
        })
    : patchReleaseVersionId
      ? generatePath(
          LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_GROUP_WORKSPACE_ENTITY,
          {
            projectId,
            patchReleaseVersionId,
            groupWorkspaceId,
            entityPath,
          },
        )
      : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_GROUP_WORKSPACE_ENTITY, {
          projectId,
          groupWorkspaceId,
          entityPath,
        });

const generateWorkspaceEditorRoute = (
  projectId: string,
  patchReleaseVersionId: string | undefined,
  workspaceId: string,
  entityPath?: string | undefined,
): string =>
  !entityPath
    ? patchReleaseVersionId
      ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE, {
          projectId,
          patchReleaseVersionId,
          workspaceId,
        })
      : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE, {
          projectId,
          workspaceId,
        })
    : patchReleaseVersionId
      ? generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_PATCH_WORKSPACE_ENTITY, {
          projectId,
          patchReleaseVersionId,
          workspaceId,
          entityPath,
        })
      : generatePath(LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE_ENTITY, {
          projectId,
          workspaceId,
          entityPath,
        });

export const generateEditorRoute = (
  projectId: string,
  patchReleaseVersionId: string | undefined,
  workspaceId: string,
  workspaceType: WorkspaceType,
  entityPath?: string | undefined,
): string =>
  workspaceType === WorkspaceType.GROUP
    ? generateGroupWorkspaceEditorRoute(
        projectId,
        patchReleaseVersionId,
        workspaceId,
        entityPath,
      )
    : generateWorkspaceEditorRoute(
        projectId,
        patchReleaseVersionId,
        workspaceId,
        entityPath,
      );

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

export const generateViewProjectByGAVRoute = (
  groupId: string,
  artifactId: string,
  versionId: string | undefined,
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

export const generateElementPreviewRoute = (
  groupId: string,
  artifactId: string,
  versionId: string | undefined,
  entityPath: string,
): string =>
  generatePath(
    LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PREVIEW_BY_GAV_ENTITY,
    {
      gav: generateGAVCoordinates(groupId, artifactId, versionId),
      entityPath,
    },
  );

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl = (
  queryApplicationUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
): string =>
  `${queryApplicationUrl}/create-from-service/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}/${servicePath}`;

export const generateShowcasePath = (showcasePath: string): string =>
  generatePath(LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE, {
    showcasePath: encodeURIComponent(showcasePath),
  });
