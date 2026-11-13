/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  type PlainObject,
  HttpStatus,
  NetworkClientError,
  assertErrorThrown,
  escapeRegExp,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { SDLCServerClient } from '../SDLCServerClient.js';
import { AuthorizableProjectAction } from '../models/project/ProjectAccess.js';
import {
  type EntityChange,
  EntityChangeType,
} from '../models/entity/EntityChange.js';
import { Review, ReviewState } from '../models/review/Review.js';
import { Workspace, WorkspaceType } from '../models/workspace/Workspace.js';
import { Revision, RevisionAlias } from '../models/revision/Revision.js';
import { Project } from '../models/project/Project.js';
import { ProjectConfiguration } from '../models/configuration/ProjectConfiguration.js';
import { ProjectConfigurationStatusReport } from '../models/project/ProjectConfigurationStatus.js';
import { isProjectSandbox } from './ProjectUtil.js';

// Depot's `SNAPSHOT_ALIAS`, which Studio checks dependencies against: this package does not depend on Depot.
const SNAPSHOT_VERSION_SUFFIX = 'SNAPSHOT';

/** A commit pinned to a revision the workspace has since moved past: nothing was committed. */
export class WorkspaceOutdatedError extends Error {
  constructor(workspaceId: string) {
    super(
      `Workspace '${workspaceId}' changed since it was read; nothing was committed`,
    );
    this.name = 'WorkspaceOutdatedError';
  }
}

export interface ReviewPush {
  projectId: string;
  /** The group workspace to commit to; created from the project's head when absent. */
  workspaceId: string;
  /** The changes to commit, given what the workspace holds now. Throw to stop without committing. */
  changes: (entities: Entity[]) => EntityChange[] | Promise<EntityChange[]>;
  message: string;
  reviewTitle: string;
  reviewDescription: string;
}

export interface ReviewPushResult {
  workspace: Workspace;
  review: Review;
  /** What the workspace holds after the push. */
  revisionId: string;
  changeCount: number;
  isNewReview: boolean;
  isNewWorkspace: boolean;
}

const isHttpStatus = (error: unknown, status: number): boolean =>
  error instanceof NetworkClientError && error.response.status === status;

const preferGroupWorkspace = (workspaces: Workspace[]): Workspace | undefined =>
  workspaces.find((ws) => ws.workspaceType === WorkspaceType.GROUP) ??
  workspaces[0];

export class SDLCServerClientHelper {
  static async canCreateWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
  ): Promise<boolean> {
    if (!(await sdlcServerClient.isAuthorized())) {
      return false;
    }
    return (await sdlcServerClient.getAutorizedActions(projectId)).includes(
      AuthorizableProjectAction.CREATE_WORKSPACE,
    );
  }

  static async createGroupWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspaceId: string,
  ): Promise<Workspace> {
    return Workspace.serialization.fromJson(
      await sdlcServerClient.createWorkspace(
        projectId,
        undefined,
        workspaceId,
        WorkspaceType.GROUP,
      ),
    );
  }

  static async getEntity(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspace: Workspace | undefined,
    entityPath: string,
  ): Promise<Entity> {
    return (await sdlcServerClient.getEntity(
      projectId,
      workspace,
      entityPath,
    )) as unknown as Entity;
  }

  static async modifyEntity(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    entity: Entity,
    message: string,
  ): Promise<void> {
    await sdlcServerClient.performEntityChanges(
      workspace.projectId,
      workspace,
      {
        message,
        entityChanges: [
          {
            classifierPath: entity.classifierPath,
            entityPath: entity.path,
            content: entity.content,
            type: EntityChangeType.MODIFY,
          },
        ],
      },
    );
  }

  static async createReview(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    title: string,
    description: string,
  ): Promise<Review> {
    return Review.serialization.fromJson(
      await sdlcServerClient.createReview(workspace.projectId, undefined, {
        workspaceId: workspace.workspaceId,
        workspaceType: workspace.workspaceType,
        title,
        description,
      }),
    );
  }

  static async getReview(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    reviewId: string,
  ): Promise<Review> {
    return Review.serialization.fromJson(
      (await sdlcServerClient.getReview(
        projectId,
        undefined,
        reviewId,
      )) as unknown as PlainObject<Review>,
    );
  }

  /** Whether the user has an SDLC session. A 401 from the check itself is the same answer, as on Studio's cold start. */
  static async isAuthorized(
    sdlcServerClient: SDLCServerClient,
  ): Promise<boolean> {
    try {
      return await sdlcServerClient.isAuthorized();
    } catch (error) {
      if (isHttpStatus(error, HttpStatus.UNAUTHORIZED)) {
        return false;
      }
      throw error;
    }
  }

  /** Where to send the user to sign in to SDLC, returning to *returnTo*; undefined when they have a session. */
  static async getSignInUrl(
    sdlcServerClient: SDLCServerClient,
    serverUrl: string,
    returnTo: string,
    client?: string,
  ): Promise<string | undefined> {
    return (await SDLCServerClientHelper.isAuthorized(sdlcServerClient))
      ? undefined
      : SDLCServerClient.authorizeCallbackUrl(serverUrl, returnTo, client);
  }

  /**
   * Refuse, with Studio's reasons, a review Studio would refuse
   * (`WorkspaceReviewState.createWorkspaceReview`): an unconfigured or
   * sandbox project, SNAPSHOT dependencies, or a workspace in conflict
   * resolution. Read-only, so it can run before anything is written.
   */
  static async assertCanCreateReview(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspace?: Workspace,
  ): Promise<void> {
    const [status, project, configuration, inConflict] = await Promise.all([
      sdlcServerClient.projectConfigurationStatus(projectId),
      sdlcServerClient.getProject(projectId),
      sdlcServerClient.getConfiguration(projectId, workspace),
      workspace
        ? sdlcServerClient.checkIfWorkspaceIsInConflictResolutionMode(
            projectId,
            workspace,
          )
        : false,
    ]);
    if (
      !ProjectConfigurationStatusReport.serialization.fromJson(status)
        .projectConfigured
    ) {
      throw new Error(`Project ${projectId} is not configured yet`);
    }
    if (isProjectSandbox(Project.serialization.fromJson(project))) {
      throw new Error('Reviews are not supported for sandbox projects');
    }
    const snapshots = ProjectConfiguration.serialization
      .fromJson(configuration)
      .projectDependencies.filter((dependency) =>
        dependency.versionId.endsWith(SNAPSHOT_VERSION_SUFFIX),
      );
    if (snapshots.length) {
      throw new Error(
        `Reviews cannot depend on SNAPSHOT versions: ${snapshots
          .map((dependency) => dependency.projectId)
          .join(', ')}`,
      );
    }
    if (inConflict) {
      throw new Error(
        `Workspace '${workspace?.workspaceId}' is in conflict resolution; resolve it in Studio first`,
      );
    }
  }

  /**
   * The project's workspace named *workspaceId*, a group one over a user one;
   * failing an exact match, one whose id differs only by `-` for `_` (a
   * SNAPSHOT version's name for its workspace). Undefined when none matches.
   */
  static async findWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspaceId: string,
  ): Promise<Workspace | undefined> {
    const workspaces = (await sdlcServerClient.getWorkspaces(projectId)).map(
      (raw) => Workspace.serialization.fromJson(raw),
    );
    const normalized = workspaceId.replaceAll('-', '_');
    return (
      preferGroupWorkspace(
        workspaces.filter((ws) => ws.workspaceId === workspaceId),
      ) ??
      preferGroupWorkspace(
        workspaces.filter(
          (ws) => ws.workspaceId.replaceAll('-', '_') === normalized,
        ),
      )
    );
  }

  /** The group workspace *workspaceId*, created from the project's head when it does not exist. */
  static async getOrCreateGroupWorkspace(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    workspaceId: string,
  ): Promise<{ workspace: Workspace; created: boolean }> {
    try {
      const existing = await sdlcServerClient.getWorkspace(
        projectId,
        undefined,
        workspaceId,
        WorkspaceType.GROUP,
      );
      return {
        workspace: Workspace.serialization.fromJson(existing),
        created: false,
      };
    } catch (error) {
      if (!isHttpStatus(error, HttpStatus.NOT_FOUND)) {
        throw error;
      }
    }
    return {
      workspace: await SDLCServerClientHelper.createGroupWorkspace(
        sdlcServerClient,
        projectId,
        workspaceId,
      ),
      created: true,
    };
  }

  /**
   * One commit of *changes* to *workspace*; the revision it made. Given
   * *revisionId*, the commit is pinned to it, as Studio pushes local changes:
   * SDLC refuses it when the workspace moved on, raised as
   * {@link WorkspaceOutdatedError}.
   */
  static async commitEntityChanges(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    changes: EntityChange[],
    message: string,
    revisionId?: string,
  ): Promise<Revision | undefined> {
    try {
      const made = await sdlcServerClient.performEntityChanges(
        workspace.projectId,
        workspace,
        {
          message,
          entityChanges: changes,
          ...(revisionId ? { revisionId } : {}),
        },
      );
      return made ? Revision.serialization.fromJson(made) : undefined;
    } catch (error) {
      if (isHttpStatus(error, HttpStatus.CONFLICT)) {
        throw new WorkspaceOutdatedError(workspace.workspaceId);
      }
      throw error;
    }
  }

  /**
   * The open review of *workspace*, found by the workspace rather than by a
   * revision: GitLab moves a merge request's head after a push, so a lookup by
   * the revision just pushed misses it.
   */
  static async findOpenReview(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
  ): Promise<Review | undefined> {
    const reviews = (
      await sdlcServerClient.getReviews(workspace.projectId, undefined, {
        state: ReviewState.OPEN,
        workspaceIdRegex: `^${escapeRegExp(workspace.workspaceId)}$`,
        workspaceTypes: [workspace.workspaceType],
      })
    ).map((raw) => Review.serialization.fromJson(raw));
    return reviews.find(
      (review) =>
        review.workspaceId === workspace.workspaceId &&
        review.workspaceType === workspace.workspaceType,
    );
  }

  /** *workspace*'s open review, else a new one; one opened meanwhile (another tab, a retry) is used. */
  static async findOrCreateReview(
    sdlcServerClient: SDLCServerClient,
    workspace: Workspace,
    title: string,
    description: string,
  ): Promise<{ review: Review; created: boolean }> {
    const open = await SDLCServerClientHelper.findOpenReview(
      sdlcServerClient,
      workspace,
    );
    if (open) {
      return { review: open, created: false };
    }
    try {
      return {
        review: await SDLCServerClientHelper.createReview(
          sdlcServerClient,
          workspace,
          title,
          description,
        ),
        created: true,
      };
    } catch (error) {
      const opened = await SDLCServerClientHelper.findOpenReview(
        sdlcServerClient,
        workspace,
      );
      if (opened) {
        return { review: opened, created: false };
      }
      throw error;
    }
  }

  /**
   * Push changes as a review, the way Studio pushes and reviews a workspace:
   * into the group workspace (created when absent), as one commit pinned to
   * the revision the changes were worked out from, then into the workspace's
   * open review or a new one. A workspace created here is deleted again when
   * the push fails before anything was committed, so a retry does not leave
   * an empty one behind; once the commit is made the workspace stays, with
   * it, however the review step then fails.
   */
  static async pushToReview(
    sdlcServerClient: SDLCServerClient,
    push: ReviewPush,
  ): Promise<ReviewPushResult> {
    const { workspace, created } =
      await SDLCServerClientHelper.getOrCreateGroupWorkspace(
        sdlcServerClient,
        push.projectId,
        push.workspaceId,
      );
    let committed = false;
    try {
      const baseRevisionId = Revision.serialization.fromJson(
        await sdlcServerClient.getRevision(
          push.projectId,
          workspace,
          RevisionAlias.CURRENT,
        ),
      ).id;
      // The entities at that revision, not the workspace's latest: read
      // alongside it, a commit landing in between would be diffed against
      // stale content and then overwritten, with the pin none the wiser.
      const entities = await sdlcServerClient.getEntitiesByRevision(
        push.projectId,
        workspace,
        baseRevisionId,
      );
      const changes = await push.changes(entities as unknown as Entity[]);
      const made = changes.length
        ? await SDLCServerClientHelper.commitEntityChanges(
            sdlcServerClient,
            workspace,
            changes,
            push.message,
            baseRevisionId,
          )
        : undefined;
      // Committed once SDLC accepted it, even when it returned no revision: a workspace
      // holding the commit is never deleted below.
      committed = changes.length > 0;
      const { review, created: isNewReview } =
        await SDLCServerClientHelper.findOrCreateReview(
          sdlcServerClient,
          workspace,
          push.reviewTitle,
          push.reviewDescription,
        );
      return {
        workspace,
        review,
        revisionId: made?.id ?? baseRevisionId,
        changeCount: changes.length,
        isNewReview,
        isNewWorkspace: created,
      };
    } catch (error) {
      assertErrorThrown(error);
      if (created && !committed) {
        await sdlcServerClient
          .deleteWorkspace(push.projectId, workspace)
          .catch(() => undefined);
      }
      throw error;
    }
  }
}
