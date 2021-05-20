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

import type { EditorStore } from '../EditorStore';
import type { EditorSdlcState } from '../EditorSdlcState';
import { action, flow, makeAutoObservable } from 'mobx';
import type { VERSION_TYPE } from '../../models/sdlc/models/version/CreateVersionCommand';
import { CreateVersionCommand } from '../../models/sdlc/models/version/CreateVersionCommand';
import {
  Revision,
  RevisionAlias,
} from '../../models/sdlc/models/revision/Revision';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import { Version } from '../../models/sdlc/models/version/Version';
import { Review, ReviewState } from '../../models/sdlc/models/review/Review';
import { Workspace } from '../../models/sdlc/models/workspace/Workspace';
import type { PlainObject } from '@finos/legend-studio-shared';
import { getNullableFirstElement } from '@finos/legend-studio-shared';
import { generateSetupRoute } from '../Router';

export enum PROJECT_OVERVIEW_ACTIVITY_MODE {
  RELEASE = 'RELEASE',
  OVERVIEW = 'OVERVIEW',
  VERSIONS = 'VERSIONS',
  WORKSPACES = 'WORKSPACES',
}

export class ProjectOverviewState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  activityMode = PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW;
  releaseVersion: CreateVersionCommand;
  committedReviewsBetweenMostRecentVersionAndProjectLatest: Review[] = [];
  latestProjectVersion?: Version | null; // `undefined` if API is not yet called, `null` if fetched but no version exists
  currentProjectRevision?: Revision;
  projectWorkspaces: Workspace[] = [];
  isCreatingVersion = false;
  isFetchingProjectWorkspaces = false;
  isDeletingWorkspace = false;
  isUpdatingProject = false;
  isFetchingLatestVersion = false;
  isFetchingCurrentProjectRevision = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      setActivityMode: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.releaseVersion = new CreateVersionCommand();
  }

  setActivityMode(activityMode: PROJECT_OVERVIEW_ACTIVITY_MODE): void {
    this.activityMode = activityMode;
  }

  fetchProjectWorkspaces = flow(function* (this: ProjectOverviewState) {
    try {
      this.isFetchingProjectWorkspaces = true;
      this.projectWorkspaces = (
        (yield this.sdlcState.sdlcClient.getWorkspaces(
          this.sdlcState.currentProjectId,
        )) as PlainObject<Workspace>[]
      ).map((workspace) => Workspace.serialization.fromJson(workspace));
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
    } finally {
      this.isFetchingProjectWorkspaces = false;
    }
  });

  deleteWorkspace = flow(function* (
    this: ProjectOverviewState,
    workspaceId: string,
  ) {
    try {
      this.isDeletingWorkspace = true;
      yield this.sdlcState.sdlcClient.deleteWorkspace(
        this.sdlcState.currentProjectId,
        workspaceId,
      );
      this.projectWorkspaces = this.projectWorkspaces.filter(
        (workspace) => workspace.workspaceId !== workspaceId,
      );
      // redirect to home page if current workspace is deleted
      if (this.editorStore.sdlcState.currentWorkspaceId === workspaceId) {
        this.editorStore.applicationStore.notifyWarning(
          'Current workspace is deleted. Redirecting to home page',
        );
        this.editorStore.setIgnoreNavigationBlocking(true);
        this.editorStore.applicationStore.historyApiClient.push(
          generateSetupRoute(
            this.editorStore.applicationStore.config.sdlcServerKey,
            this.editorStore.sdlcState.currentProjectId,
          ),
        );
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
    } finally {
      this.isDeletingWorkspace = false;
    }
  });

  updateProject = flow(function* (
    this: ProjectOverviewState,
    name: string,
    description: string,
    tags: string[],
  ) {
    try {
      this.isUpdatingProject = true;
      yield this.sdlcState.sdlcClient.updateProject(
        this.sdlcState.currentProjectId,
        {
          name,
          description,
          tags,
        },
      );
      this.editorStore.applicationStore.notifySuccess(
        `Project '${name}' is succesfully updated`,
      );
      yield this.sdlcState.fetchCurrentProject(this.sdlcState.currentProjectId);
    } catch (error: unknown) {
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingProject = false;
    }
  });

  fetchLatestProjectVersion = flow(function* (this: ProjectOverviewState) {
    try {
      this.isFetchingLatestVersion = true;
      // fetch latest version
      const version = (yield this.sdlcState.sdlcClient.getLatestVersion(
        this.sdlcState.currentProjectId,
      )) as PlainObject<Version> | undefined;
      this.latestProjectVersion = version
        ? Version.serialization.fromJson(version)
        : null;
      // fetch current project revision and set release revision ID
      this.currentProjectRevision = Revision.serialization.fromJson(
        yield this.sdlcState.sdlcClient.getRevision(
          this.sdlcState.currentProjectId,
          undefined,
          RevisionAlias.CURRENT,
        ),
      );
      this.releaseVersion.setRevisionId(this.currentProjectRevision.id);

      // fetch committed reviews between most recent version and project latest
      if (this.latestProjectVersion) {
        const latestProjectVersionRevision = Revision.serialization.fromJson(
          yield this.sdlcState.sdlcClient.getRevision(
            this.sdlcState.currentProjectId,
            undefined,
            this.latestProjectVersion.revisionId,
          ),
        );
        // we find the review associated with the latest version revision, this usually exist, except in 2 cases:
        // 1. the revision is somehow directly added to the branch by the user (in the case of git, user unprotected master and directly pushed to master)
        // 2. the revision is the merged/comitted review revision (this usually happens for prototype projects where fast forwarding merging is not default)
        // in those case, we will get the time from the revision
        const latestProjectVersionRevisionReviewObj = getNullableFirstElement(
          (yield this.sdlcState.sdlcClient.getReviews(
            this.sdlcState.currentProjectId,
            ReviewState.COMMITTED,
            [latestProjectVersionRevision.id],
            undefined,
            undefined,
            1,
          )) as PlainObject<Review>[],
        );
        const latestProjectVersionRevisionReview =
          latestProjectVersionRevisionReviewObj
            ? Review.serialization.fromJson(
                latestProjectVersionRevisionReviewObj,
              )
            : undefined;
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = (
          (yield this.sdlcState.sdlcClient.getReviews(
            this.sdlcState.currentProjectId,
            ReviewState.COMMITTED,
            undefined,
            latestProjectVersionRevisionReview?.committedAt ??
              latestProjectVersionRevision.committedAt,
            undefined,
            undefined,
          )) as PlainObject<Review>[]
        )
          .map((review) => Review.serialization.fromJson(review))
          .filter(
            (review) =>
              !latestProjectVersionRevisionReview ||
              review.id !== latestProjectVersionRevisionReview.id,
          ); // make sure to exclude the base review
      } else {
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = [];
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
    } finally {
      this.isFetchingLatestVersion = false;
    }
  });

  createVersion = flow(function* (
    this: ProjectOverviewState,
    versionType: VERSION_TYPE,
  ) {
    this.isCreatingVersion = true;
    try {
      this.releaseVersion.versionType = versionType;
      this.releaseVersion.validate();
      this.latestProjectVersion = Version.serialization.fromJson(
        yield this.sdlcState.sdlcClient.createVersion(
          this.sdlcState.currentProjectId,
          CreateVersionCommand.serialization.toJson(this.releaseVersion),
        ),
      );
      yield this.fetchLatestProjectVersion();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCreatingVersion = false;
    }
  });
}
