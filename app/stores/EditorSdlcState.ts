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

import { observable, action, flow } from 'mobx';
import { EditorStore } from './EditorStore';
import { NetworkClientError, HttpStatus } from 'API/NetworkClient';
import { guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Project, ProjectType } from 'SDLC/project/Project';
import { Workspace, WORKSPACE_TYPE } from 'SDLC/workspace/Workspace';
import { Version } from 'SDLC/version/Version';
import { sdlcClient } from 'API/SdlcClient';
import { RevisionAlias, Revision } from 'SDLC/revision/Revision';
import { Entity } from 'SDLC/entity/Entity';
import { deserialize } from 'serializr';
import { Build } from 'SDLC/build/Build';
import { EDITOR_MODE, ACTIVITY_MODE } from 'Stores/EditorConfig';

export class EditorSdlcState {
  editorStore: EditorStore;
  @observable currentProject?: Project;
  @observable currentWorkspace?: Workspace;
  @observable currentRevision?: Revision;
  @observable isWorkspaceOutdated = false;
  @observable workspaceBuilds: Build[] = [];
  @observable projectVersions: Version[] = [];
  @observable isCheckingIfWorkspaceIsOutdated = false;
  @observable isFetchingProjectVersions = false;
  @observable isFetchingProject = false;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  get currentProjectId(): string { return guaranteeNonNullable(this.currentProject, `Can't get current project`).projectId }
  get currentWorkspaceId(): string { return guaranteeNonNullable(this.currentWorkspace, `Can't get current workspace`).workspaceId }
  get currentRevisionId(): string { return guaranteeNonNullable(this.currentRevision, `Can't get current revision`).id }
  get isCurrentProjectInProduction(): boolean { return this.currentProject?.projectType === ProjectType.PRODUCTION }

  @action setCurrentRevision = (revision: Revision): void => { this.currentRevision = revision };
  @action setCurrentWorkspace = (workspace: Workspace): void => { this.currentWorkspace = workspace };

  fetchCurrentProject = flow(function* (this: EditorSdlcState, projectId: string) {
    try {
      this.isFetchingProject = true;
      this.currentProject = deserialize(Project, (yield sdlcClient.getProject(projectId)) as unknown as Project);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingProject = false;
    }
  });

  fetchCurrentWorkspace = flow(function* (this: EditorSdlcState, projectId: string, workspaceId: string) {
    try {
      this.currentWorkspace = deserialize(Workspace, (yield sdlcClient.getWorkspace(projectId, workspaceId)) as unknown as Workspace);
      const isInConflictResolutionMode = (yield this.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as unknown as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setMode(EDITOR_MODE.CONFLICT_RESOLUTION);
        this.currentWorkspace.type = WORKSPACE_TYPE.CONFLICT_RESOLUTION;
        this.editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
      }
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  fetchProjectVersions = flow(function* (this: EditorSdlcState) {
    try {
      this.isFetchingProjectVersions = true;
      const reviews = (yield sdlcClient.getVersions(this.currentProjectId)) as unknown as Version[];
      this.projectVersions = reviews.map(review => deserialize(Version, review));
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
    } finally {
      this.isFetchingProjectVersions = false;
    }
  });

  checkIfCurrentWorkspaceIsInConflictResolutionMode = flow(function* (this: EditorSdlcState): Generator<Promise<unknown>, boolean, unknown> {
    return (yield sdlcClient.checkIfWorkspaceIsInConflictResolutionMode(this.currentProjectId, this.currentWorkspaceId)) as boolean;
  });

  fetchCurrentRevision = flow(function* (this: EditorSdlcState, projectId: string, workspaceId: string) {
    try {
      const revision = this.editorStore.isInConflictResolutionMode
        ? (yield sdlcClient.getConflictResolutionRevision(projectId, workspaceId, RevisionAlias.CURRENT)) as Revision
        : (yield sdlcClient.getRevision(projectId, workspaceId, RevisionAlias.CURRENT)) as Revision;
      this.currentRevision = deserialize(Revision, revision);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  checkIfWorkspaceIsOutdated = flow(function* (this: EditorSdlcState) {
    try {
      this.isCheckingIfWorkspaceIsOutdated = true;
      this.isWorkspaceOutdated = this.editorStore.isInConflictResolutionMode
        ? (yield sdlcClient.isConflictResolutionOutdated(this.currentProjectId, this.currentWorkspaceId)) as unknown as boolean
        : (yield sdlcClient.isWorkspaceOutdated(this.currentProjectId, this.currentWorkspaceId)) as unknown as boolean;
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCheckingIfWorkspaceIsOutdated = false;
    }
  });

  handleChangeDetectionRefreshIssue(error: Error): void {
    if (!this.currentProject || !this.currentWorkspace || (error instanceof NetworkClientError && error.response.status === HttpStatus.NOT_FOUND)) {
      this.editorStore.setBlockingAlert({ message: 'Current project or workspace no longer exists', prompt: 'Please refresh the application' });
    } else {
      this.editorStore.setBlockingAlert({ message: error.message });
    }
  }

  buildWorkspaceLatestRevisionEntityHashesIndex = flow(function* (this: EditorSdlcState) {
    try {
      let entities: Entity[] = [];
      if (!this.editorStore.isInConflictResolutionMode) {
        // fetch latest revision
        // NOTE: this check is already covered in conflict resolution mode so we don't need to do it here
        const latestRevision = deserialize(Revision, (yield sdlcClient.getRevision(this.currentProjectId, this.currentWorkspaceId, RevisionAlias.CURRENT)) as unknown as Revision);
        if (latestRevision.id !== this.currentRevisionId) {
          // make sure there is no good recovery from this, at this point all users work risk conflict
          throw new Error(`Can't run local change detection. Current workspace revision is not the latest. Please backup your work and refresh the application`);
        }
        entities = (yield sdlcClient.getEntitiesByRevision(this.currentProjectId, this.currentWorkspaceId, this.currentRevisionId)) as unknown as Entity[];
      } else {
        entities = (yield sdlcClient.getEntitiesByRevision(this.currentProjectId, this.currentWorkspaceId, RevisionAlias.CURRENT)) as unknown as Entity[];
      }
      this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(entities);
      yield this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(entities, LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT);
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  buildWorkspaceBaseRevisionEntityHashesIndex = flow(function* (this: EditorSdlcState) {
    try {
      const workspaceBaseEntities = (yield sdlcClient.getEntitiesByRevision(this.currentProjectId, this.currentWorkspaceId, RevisionAlias.BASE)) as unknown as Entity[];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(workspaceBaseEntities);
      yield this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(workspaceBaseEntities, LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT);
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  buildProjectLatestRevisionEntityHashesIndex = flow(function* (this: EditorSdlcState) {
    try {
      const projectLatestEntities = (yield sdlcClient.getEntities(this.currentProjectId, undefined)) as unknown as Entity[];
      this.editorStore.changeDetectionState.projectLatestRevisionState.setEntities(projectLatestEntities);
      yield this.editorStore.changeDetectionState.projectLatestRevisionState.buildEntityHashesIndex(projectLatestEntities, LOG_EVENT.CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT);
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  fetchWorkspaceBuilds = flow(function* (this: EditorSdlcState) {
    try {
      this.workspaceBuilds = ((yield sdlcClient.getBuildsByRevision(this.currentProjectId, this.currentWorkspaceId, RevisionAlias.CURRENT)) as unknown as Build[]).map(build => deserialize(Build, build));
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });
}
