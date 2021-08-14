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

import { action, flowResult, makeAutoObservable } from 'mobx';
import type { EditorStore } from './EditorStore';
import {
  NetworkClientError,
  HttpStatus,
  guaranteeNonNullable,
  assertTrue,
} from '@finos/legend-studio-shared';
import type { PlainObject, GeneratorFn } from '@finos/legend-studio-shared';
import { CHANGE_DETECTION_LOG_EVENT, SDLC_LOG_EVENT } from '../utils/Logger';
import { Project, ProjectType } from '../models/sdlc/models/project/Project';
import {
  Workspace,
  WORKSPACE_TYPE,
} from '../models/sdlc/models/workspace/Workspace';
import { Version } from '../models/sdlc/models/version/Version';
import {
  RevisionAlias,
  Revision,
} from '../models/sdlc/models/revision/Revision';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { Build } from '../models/sdlc/models/build/Build';
import { EDITOR_MODE, ACTIVITY_MODE } from './EditorConfig';
import type { SDLCServerClient } from '../models/sdlc/SDLCServerClient';

export class EditorSdlcState {
  editorStore: EditorStore;
  currentProject?: Project;
  currentWorkspace?: Workspace;
  currentRevision?: Revision;
  isWorkspaceOutdated = false;
  workspaceBuilds: Build[] = [];
  projectVersions: Version[] = [];
  isCheckingIfWorkspaceIsOutdated = false;
  isFetchingProjectVersions = false;
  isFetchingProject = false;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      currentProjectId: false,
      currentWorkspaceId: false,
      currentRevisionId: false,
      sdlcClient: false,
      setCurrentProject: action,
      setCurrentWorkspace: action,
      setCurrentRevision: action,
    });

    this.editorStore = editorStore;
  }

  get isCurrentProjectInProduction(): boolean {
    return this.currentProject?.projectType === ProjectType.PRODUCTION;
  }
  get sdlcClient(): SDLCServerClient {
    return this.editorStore.applicationStore.networkClientManager.sdlcClient;
  }

  get currentProjectId(): string {
    return guaranteeNonNullable(
      this.currentProject,
      `Can't get current project`,
    ).projectId;
  }
  get currentWorkspaceId(): string {
    return guaranteeNonNullable(
      this.currentWorkspace,
      `Can't get current workspace`,
    ).workspaceId;
  }
  get currentRevisionId(): string {
    return guaranteeNonNullable(
      this.currentRevision,
      `Can't get current revision`,
    ).id;
  }

  setCurrentProject = (val: Project): void => {
    this.currentProject = val;
  };
  setCurrentWorkspace = (val: Workspace): void => {
    this.currentWorkspace = val;
  };
  setCurrentRevision = (val: Revision): void => {
    this.currentRevision = val;
  };

  *fetchCurrentProject(
    projectId: string,
    options?: { suppressNotification?: boolean },
  ): GeneratorFn<void> {
    try {
      this.isFetchingProject = true;
      this.currentProject = Project.serialization.fromJson(
        (yield this.sdlcClient.getProject(projectId)) as PlainObject<Project>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      if (!options?.suppressNotification) {
        this.editorStore.applicationStore.notifyError(error);
      }
    } finally {
      this.isFetchingProject = false;
    }
  }

  *fetchCurrentWorkspace(
    projectId: string,
    workspaceId: string,
    options?: { suppressNotification?: boolean },
  ): GeneratorFn<void> {
    try {
      this.currentWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcClient.getWorkspace(
          projectId,
          workspaceId,
        )) as PlainObject<Workspace>,
      );
      const isInConflictResolutionMode = (yield flowResult(
        this.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setMode(EDITOR_MODE.CONFLICT_RESOLUTION);
        this.currentWorkspace.type = WORKSPACE_TYPE.CONFLICT_RESOLUTION;
        this.editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      if (!options?.suppressNotification) {
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  }

  *fetchProjectVersions(): GeneratorFn<void> {
    try {
      this.isFetchingProjectVersions = true;
      this.projectVersions = (
        (yield this.sdlcClient.getVersions(
          this.currentProjectId,
        )) as PlainObject<Version>[]
      ).map((version) => Version.serialization.fromJson(version));
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
    } finally {
      this.isFetchingProjectVersions = false;
    }
  }

  *checkIfCurrentWorkspaceIsInConflictResolutionMode(): GeneratorFn<boolean> {
    return (yield this.sdlcClient.checkIfWorkspaceIsInConflictResolutionMode(
      this.currentProjectId,
      this.currentWorkspaceId,
    )) as boolean;
  }

  *fetchCurrentRevision(
    projectId: string,
    workspaceId: string,
  ): GeneratorFn<void> {
    try {
      this.currentRevision = Revision.serialization.fromJson(
        this.editorStore.isInConflictResolutionMode
          ? ((yield this.sdlcClient.getConflictResolutionRevision(
              projectId,
              workspaceId,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>)
          : ((yield this.sdlcClient.getRevision(
              projectId,
              workspaceId,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *checkIfWorkspaceIsOutdated(): GeneratorFn<void> {
    try {
      this.isCheckingIfWorkspaceIsOutdated = true;
      this.isWorkspaceOutdated = this.editorStore.isInConflictResolutionMode
        ? ((yield this.sdlcClient.isConflictResolutionOutdated(
            this.currentProjectId,
            this.currentWorkspaceId,
          )) as boolean)
        : ((yield this.sdlcClient.isWorkspaceOutdated(
            this.currentProjectId,
            this.currentWorkspaceId,
          )) as boolean);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCheckingIfWorkspaceIsOutdated = false;
    }
  }

  handleChangeDetectionRefreshIssue(error: Error): void {
    if (
      !this.currentProject ||
      !this.currentWorkspace ||
      (error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND)
    ) {
      this.editorStore.setBlockingAlert({
        message: 'Current project or workspace no longer exists',
        prompt: 'Please refresh the application',
      });
    } else {
      this.editorStore.setBlockingAlert({ message: error.message });
    }
  }

  *buildWorkspaceLatestRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      let entities: Entity[] = [];
      if (!this.editorStore.isInConflictResolutionMode) {
        // fetch latest revision
        // NOTE: this check is already covered in conflict resolution mode so we don't need to do it here
        const latestRevision = Revision.serialization.fromJson(
          (yield this.sdlcClient.getRevision(
            this.currentProjectId,
            this.currentWorkspaceId,
            RevisionAlias.CURRENT,
          )) as PlainObject<Revision>,
        );
        // make sure there is no good recovery from this, at this point all users work risk conflict
        assertTrue(
          latestRevision.id === this.currentRevisionId,
          `Can't run local change detection: current workspace revision is not the latest. Please backup your work and refresh the application`,
        );
        entities = (yield this.sdlcClient.getEntitiesByRevision(
          this.currentProjectId,
          this.currentWorkspaceId,
          this.currentRevisionId,
        )) as Entity[];
      } else {
        entities = (yield this.sdlcClient.getEntitiesByRevision(
          this.currentProjectId,
          this.currentWorkspaceId,
          RevisionAlias.CURRENT,
        )) as Entity[];
      }
      this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(
        entities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          entities,
          CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildWorkspaceBaseRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const workspaceBaseEntities =
        (yield this.sdlcClient.getEntitiesByRevision(
          this.currentProjectId,
          this.currentWorkspaceId,
          RevisionAlias.BASE,
        )) as Entity[];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(
        workspaceBaseEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(
          workspaceBaseEntities,
          CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT,
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildProjectLatestRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const projectLatestEntities = (yield this.sdlcClient.getEntities(
        this.currentProjectId,
        undefined,
      )) as Entity[];
      this.editorStore.changeDetectionState.projectLatestRevisionState.setEntities(
        projectLatestEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.projectLatestRevisionState.buildEntityHashesIndex(
          projectLatestEntities,
          CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT,
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *fetchWorkspaceBuilds(): GeneratorFn<void> {
    try {
      this.workspaceBuilds = (
        (yield this.sdlcClient.getBuildsByRevision(
          this.currentProjectId,
          this.currentWorkspaceId,
          RevisionAlias.CURRENT,
        )) as PlainObject<Build>[]
      ).map((build) => Build.serialization.fromJson(build));
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}
