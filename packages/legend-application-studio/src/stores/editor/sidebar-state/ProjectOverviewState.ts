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

import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  ActionState,
} from '@finos/legend-shared';
import {
  generateEditorRoute,
  generateSetupRoute,
} from '../../../__lib__/LegendStudioNavigation.js';
import {
  type NewVersionType,
  CreateVersionCommand,
  ReviewState,
  Revision,
  RevisionAlias,
  Version,
  Workspace,
  Review,
  areWorkspacesEquivalent,
  Patch,
  type WorkspaceType,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

export enum PROJECT_OVERVIEW_ACTIVITY_MODE {
  RELEASE = 'RELEASE',
  OVERVIEW = 'OVERVIEW',
  VERSIONS = 'VERSIONS',
  WORKSPACES = 'WORKSPACES',
  PATCH = 'PATCH',
}

export class ProjectOverviewState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  activityMode = PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW;
  releaseVersion: CreateVersionCommand;
  committedReviewsBetweenMostRecentVersionAndProjectLatest: Review[] = [];
  latestProjectVersion?: Version | null; // `undefined` if API is not yet called, `null` if fetched but no version exists
  currentProjectRevision?: Revision | undefined;
  projectWorkspaces: Workspace[] = [];

  patches: Patch[] = [];

  isCreatingVersion = false;
  isFetchingProjectWorkspaces = false;
  isDeletingWorkspace = false;
  updatingProjectState = ActionState.create();
  isFetchingLatestVersion = false;
  isFetchingCurrentProjectRevision = false;

  createPatchState = ActionState.create();

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      patches: observable,
      activityMode: observable,
      releaseVersion: observable,
      committedReviewsBetweenMostRecentVersionAndProjectLatest: observable,
      latestProjectVersion: observable,
      currentProjectRevision: observable,
      projectWorkspaces: observable,
      isCreatingVersion: observable,
      isFetchingProjectWorkspaces: observable,
      isDeletingWorkspace: observable,
      updatingProjectState: observable,
      isFetchingLatestVersion: observable,
      isFetchingCurrentProjectRevision: observable,
      setActivityMode: action,
      fetchProjectWorkspaces: flow,
      deleteWorkspace: flow,
      updateProject: flow,
      fetchLatestProjectVersion: flow,
      createVersion: flow,
      createPatchVersion: flow,
      createPatch: flow,
      fetchPatches: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.releaseVersion = new CreateVersionCommand();
  }

  setActivityMode(activityMode: PROJECT_OVERVIEW_ACTIVITY_MODE): void {
    this.activityMode = activityMode;
  }

  *fetchProjectWorkspaces(): GeneratorFn<void> {
    try {
      this.isFetchingProjectWorkspaces = true;
      this.patches = (
        (yield this.editorStore.sdlcServerClient.getPatches(
          this.sdlcState.activeProject.projectId,
        )) as PlainObject<Patch>[]
      ).map((v) => Patch.serialization.fromJson(v));
      this.projectWorkspaces = (
        (yield this.editorStore.sdlcServerClient.getWorkspaces(
          this.sdlcState.activeProject.projectId,
        )) as PlainObject<Workspace>[]
      ).map((v) => Workspace.serialization.fromJson(v));
      for (const patch of this.patches) {
        this.projectWorkspaces = this.projectWorkspaces.concat(
          (
            (yield this.editorStore.sdlcServerClient.getWorkspaces(
              this.sdlcState.activeProject.projectId,
              patch.patchReleaseVersionId.id,
            )) as PlainObject<Workspace>[]
          ).map((v) => {
            const w = Workspace.serialization.fromJson(v);
            w.source = patch.patchReleaseVersionId.id;
            return w;
          }),
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isFetchingProjectWorkspaces = false;
    }
  }

  *deleteWorkspace(workspace: Workspace): GeneratorFn<void> {
    try {
      this.isDeletingWorkspace = true;
      yield this.editorStore.sdlcServerClient.deleteWorkspace(
        this.sdlcState.activeProject.projectId,
        workspace,
      );
      this.projectWorkspaces = this.projectWorkspaces.filter(
        (w) => !areWorkspacesEquivalent(workspace, w),
      );
      // redirect to home page if current workspace is deleted
      if (
        areWorkspacesEquivalent(
          this.editorStore.sdlcState.activeWorkspace,
          workspace,
        )
      ) {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'Current workspace is deleted. Redirecting to workspace setup',
        );
        this.editorStore.applicationStore.navigationService.navigator.goToLocation(
          generateSetupRoute(
            this.editorStore.sdlcState.activeProject.projectId,
            undefined,
          ),
          {
            ignoreBlocking: true,
          },
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isDeletingWorkspace = false;
    }
  }

  *updateProject(
    name: string,
    description: string,
    tags: string[],
  ): GeneratorFn<void> {
    try {
      this.updatingProjectState.inProgress();
      yield this.editorStore.sdlcServerClient.updateProject(
        this.sdlcState.activeProject.projectId,
        {
          name,
          description,
          tags,
        },
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Project '${name}' is succesfully updated`,
      );
      yield flowResult(
        this.sdlcState.fetchCurrentProject(
          this.sdlcState.activeProject.projectId,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.updatingProjectState.complete();
    }
  }

  *fetchPatches(): GeneratorFn<void> {
    try {
      this.patches = (
        (yield this.editorStore.sdlcServerClient.getPatches(
          this.sdlcState.activeProject.projectId,
        )) as PlainObject<Patch>[]
      ).map((v: PlainObject<Patch>) => Patch.serialization.fromJson(v));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *fetchLatestProjectVersion(): GeneratorFn<void> {
    try {
      this.isFetchingLatestVersion = true;
      // fetch latest version
      const version = (yield this.editorStore.sdlcServerClient.getLatestVersion(
        this.sdlcState.activeProject.projectId,
      )) as PlainObject<Version> | undefined;
      this.latestProjectVersion = version
        ? Version.serialization.fromJson(version)
        : null;
      // fetch current project revision and set release revision ID
      this.currentProjectRevision = Revision.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getRevision(
          this.sdlcState.activeProject.projectId,
          undefined,
          RevisionAlias.CURRENT,
        )) as PlainObject<Revision>,
      );
      this.releaseVersion.setRevisionId(this.currentProjectRevision.id);

      // fetch committed reviews between most recent version and project latest
      if (this.latestProjectVersion) {
        const latestProjectVersionRevision = Revision.serialization.fromJson(
          (yield this.editorStore.sdlcServerClient.getRevision(
            this.sdlcState.activeProject.projectId,
            undefined,
            this.latestProjectVersion.revisionId,
          )) as PlainObject<Revision>,
        );
        // we find the review associated with the latest version revision, this usually exist, except in 2 cases:
        // 1. the revision is somehow directly added to the branch by the user (in the case of `git`, user directly pushed to unprotected default branch)
        // 2. the revision is the merged/comitted review revision (this usually happens for projects where fast forwarding merging is not default)
        // in those case, we will get the time from the revision
        const latestProjectVersionRevisionReviewObj = (
          (yield this.editorStore.sdlcServerClient.getReviews(
            this.sdlcState.activeProject.projectId,
            undefined,
            {
              state: ReviewState.COMMITTED,
              revisionIds: [latestProjectVersionRevision.id],
              limit: 1,
            },
          )) as PlainObject<Review>[]
        )[0];
        const latestProjectVersionRevisionReview =
          latestProjectVersionRevisionReviewObj
            ? Review.serialization.fromJson(
                latestProjectVersionRevisionReviewObj,
              )
            : undefined;
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = (
          (yield this.editorStore.sdlcServerClient.getReviews(
            this.sdlcState.activeProject.projectId,
            undefined,
            {
              state: ReviewState.COMMITTED,
              since:
                latestProjectVersionRevisionReview?.committedAt ??
                latestProjectVersionRevision.committedAt,
            },
          )) as PlainObject<Review>[]
        )
          .map((v) => Review.serialization.fromJson(v))
          .filter(
            (review) =>
              !latestProjectVersionRevisionReview ||
              review.id !== latestProjectVersionRevisionReview.id,
          ); // make sure to exclude the base review
      } else {
        this.committedReviewsBetweenMostRecentVersionAndProjectLatest = (
          (yield this.editorStore.sdlcServerClient.getReviews(
            this.sdlcState.activeProject.projectId,
            undefined,
            {
              state: ReviewState.COMMITTED,
            },
          )) as PlainObject<Review>[]
        ).map((v) => Review.serialization.fromJson(v));
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isFetchingLatestVersion = false;
    }
  }

  *createVersion(versionType: NewVersionType): GeneratorFn<void> {
    if (!this.editorStore.sdlcServerClient.features.canCreateVersion) {
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't create version: not supported by SDLC server`,
      );
      return;
    }
    this.isCreatingVersion = true;
    try {
      this.releaseVersion.versionType = versionType;
      this.releaseVersion.validate();
      this.latestProjectVersion = Version.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.createVersion(
          this.sdlcState.activeProject.projectId,
          CreateVersionCommand.serialization.toJson(this.releaseVersion),
        )) as PlainObject<Version>,
      );
      yield flowResult(this.fetchLatestProjectVersion());
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isCreatingVersion = false;
    }
  }

  *createPatchVersion(id: string): GeneratorFn<void> {
    this.isCreatingVersion = true;
    try {
      const version = Version.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.releasePatch(
          this.sdlcState.activeProject.projectId,
          id,
        )) as PlainObject<Version>,
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `${version.id.id} is released successfully`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isCreatingVersion = false;
    }
  }

  *createPatch(
    sourceVersion: string,
    workspaceName: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    if (!workspaceName) {
      this.editorStore.applicationStore.notificationService.notify(
        `Please provide workspace name`,
      );
    }
    this.createPatchState.inProgress();
    this.createPatchState.setMessage(`Creating patch...`);
    try {
      const newPatch = Patch.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.createPatch(
          this.sdlcState.activeProject.projectId,
          sourceVersion,
        )) as PlainObject<Patch>,
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Patch '${newPatch.patchReleaseVersionId.id}' is succesfully created`,
      );
      this.createPatchState.setMessage(`Creating workspace...`);
      const newWorkspace = Workspace.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.createWorkspace(
          this.sdlcState.activeProject.projectId,
          newPatch.patchReleaseVersionId.id,
          workspaceName,
          workspaceType,
        )) as PlainObject<Workspace>,
      );
      newWorkspace.source = newPatch.patchReleaseVersionId.id;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Workspace '${newWorkspace.workspaceId}' is succesfully created`,
      );
      this.editorStore.applicationStore.navigationService.navigator.goToLocation(
        generateEditorRoute(
          this.sdlcState.activeProject.projectId,
          newPatch.patchReleaseVersionId.id,
          workspaceName,
          workspaceType,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createPatchState.reset();
    }
  }
}
