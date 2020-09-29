/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EditorStore } from 'Stores/EditorStore';
import { EditorSdlcState } from 'Stores/EditorSdlcState';
import { action, observable, flow } from 'mobx';
import { CreateVersionCommand, VERSION_TYPE } from 'SDLC/version/CreateVersionCommand';
import { sdlcClient } from 'API/SdlcClient';
import { Revision, RevisionAlias } from 'SDLC/revision/Revision';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Version } from 'SDLC/version/Version';
import { deserialize } from 'serializr';
import { Review, ReviewState } from 'SDLC/review/Review';
import { Workspace } from 'SDLC/workspace/Workspace';
import { HttpStatus } from 'API/NetworkClient';
import { getSetupRoute } from 'Stores/RouterConfig';
import { getNullableFirstElement } from 'Utilities/GeneralUtil';

export enum PROJECT_OVERVIEW_ACTIVITY_MODE {
  RELEASE = 'RELEASE',
  OVERVIEW = 'OVERVIEW',
  VERSIONS = 'VERSIONS',
  WORKSPACES = 'WORKSPACES'
}

export class ProjectOverviewState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  @observable activityMode = PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW;
  @observable releaseVersion: CreateVersionCommand;
  @observable committedReviewsBetweenMostRecentVersionAndProjectLatest: Review[] = [];
  @observable latestProjectVersion?: Version | null; // `undefined` if API is not yet called, `null` if fetched but no version exists
  @observable currentProjectRevision?: Revision;
  @observable projectWorkspaces: Workspace[] = [];
  @observable isCreatingVersion = false;
  @observable isFetchingProjectWorkspaces = false;
  @observable isDeletingWorkspace = false;
  @observable isUpdatingProject = false;
  @observable isFetchingLatestVersion = false;
  @observable isFetchingCurrentProjectRevision = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.releaseVersion = new CreateVersionCommand();
  }

  @action setActivityMode(activityMode: PROJECT_OVERVIEW_ACTIVITY_MODE): void { this.activityMode = activityMode }

  fetchProjectWorkspaces = flow(function* (this: ProjectOverviewState) {
    try {
      this.isFetchingProjectWorkspaces = true;
      const workspaces = (yield sdlcClient.getWorkspaces(this.sdlcState.currentProjectId)) as unknown as Workspace[];
      this.projectWorkspaces = workspaces.map(workspace => deserialize(Workspace, workspace));
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
    } finally {
      this.isFetchingProjectWorkspaces = false;
    }
  });

  deleteWorkspace = flow(function* (this: ProjectOverviewState, workspaceId: string) {
    try {
      this.isDeletingWorkspace = true;
      yield sdlcClient.deleteWorkspace(this.sdlcState.currentProjectId, workspaceId);
      this.projectWorkspaces = this.projectWorkspaces.filter(workspace => workspace.workspaceId !== workspaceId);
      // redirect to home page if current workspace is deleted
      if (this.editorStore.sdlcState.currentWorkspaceId === workspaceId) {
        this.editorStore.applicationStore.notifyWarning('Current workspace is deleted. Redirecting to home page');
        this.editorStore.setIgnoreNavigationBlocking(true);
        this.editorStore.applicationStore.historyApiClient.push(getSetupRoute(this.editorStore.sdlcState.currentProjectId));
      }
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
    } finally {
      this.isDeletingWorkspace = false;
    }
  });

  updateProject = flow(function* (this: ProjectOverviewState, name: string, description: string, tags: string[] = []) {
    try {
      this.isUpdatingProject = true;
      yield sdlcClient.updateProject(this.sdlcState.currentProjectId, {
        name,
        description,
        tags,
      });
      this.editorStore.applicationStore.notifySuccess(`Project '${name}' is succesfully updated`);
      yield this.sdlcState.fetchCurrentProject(this.sdlcState.currentProjectId);
    } catch (error) {
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingProject = false;
    }
  });

  fetchLatestProjectVersion = flow(function* (this: ProjectOverviewState) {
    try {
      this.isFetchingLatestVersion = true;
      // fetch latest version
      const version = (yield sdlcClient.getLatestVersion(this.sdlcState.currentProjectId)) as unknown as Version | Response;
      this.latestProjectVersion = ((version as Response).status === HttpStatus.NO_CONTENT) ? null : deserialize(Version, version);
      // fetch current project revision and set release revision ID
      this.currentProjectRevision = (yield sdlcClient.getRevision(this.sdlcState.currentProjectId, undefined, RevisionAlias.CURRENT)) as unknown as Revision;
      this.releaseVersion.setRevisionId(this.currentProjectRevision.id);

      // fetch committed reviews between most recent version and project latest
      if (this.latestProjectVersion) {
        const latestProjectVersionRevision = deserialize(Revision, (yield sdlcClient.getRevision(this.sdlcState.currentProjectId, undefined, this.latestProjectVersion.revisionId)) as unknown as Revision);
        // we find the review associated with the latest version revision, this usually exist, except in 2 cases:
        // 1. the revision is somehow directly added to the branch by the user (in the case of git, user unprotected master and directly pushed to master)
        // 2. the revision is the merged/comitted review revision (this usually happens for prototype projects where fast forwarding merging is not default)
        // in those case, we will get the time from the revision
        let latestProjectVersionRevisionReview = getNullableFirstElement((yield sdlcClient.getReviews(this.sdlcState.currentProjectId, ReviewState.COMMITTED, [latestProjectVersionRevision.id], undefined, undefined, 1)) as unknown as Review[]);
        latestProjectVersionRevisionReview = latestProjectVersionRevisionReview ? deserialize(Review, latestProjectVersionRevisionReview) : undefined;
        const reviews = (yield sdlcClient.getReviews(this.sdlcState.currentProjectId, ReviewState.COMMITTED, undefined, latestProjectVersionRevisionReview?.committedAt ?? latestProjectVersionRevision.committedAt, undefined, undefined)) as unknown as Review[];
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = reviews.map(review => deserialize(Review, review))
          .filter(review => !latestProjectVersionRevisionReview || review.id !== latestProjectVersionRevisionReview.id); // make sure to exclude the base review
      } else {
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = [];
      }
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
    } finally {
      this.isFetchingLatestVersion = false;
    }
  });

  createVersion = flow(function* (this: ProjectOverviewState, versionType: VERSION_TYPE) {
    this.isCreatingVersion = true;
    try {
      this.releaseVersion.versionType = versionType;
      this.releaseVersion.validate();
      const version = (yield sdlcClient.createVersion(this.sdlcState.currentProjectId, this.releaseVersion)) as unknown as Version;
      this.latestProjectVersion = version;
      yield this.fetchLatestProjectVersion();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCreatingVersion = false;
    }
  })
}
