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
import type { PlainObject, GeneratorFn } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  NetworkClientError,
  HttpStatus,
  guaranteeNonNullable,
  assertTrue,
} from '@finos/legend-shared';
import { CHANGE_DETECTION_LOG_EVENT } from './ChangeDetectionLogEvent';
import { EDITOR_MODE, ACTIVITY_MODE } from './EditorConfig';
import type { Entity } from '@finos/legend-model-storage';
import { extractEntityNameFromPath } from '@finos/legend-model-storage';
import type {
  EntityDiff,
  WorkspaceIdentifier,
} from '@finos/legend-server-sdlc';
import {
  Workflow,
  Project,
  ProjectType,
  Revision,
  RevisionAlias,
  Version,
  Workspace,
  WorkspaceAccessType,
} from '@finos/legend-server-sdlc';
import { STUDIO_LOG_EVENT } from './StudioLogEvent';

export const entityDiffSorter = (a: EntityDiff, b: EntityDiff): number =>
  extractEntityNameFromPath(a.newPath ?? a.oldPath ?? '').localeCompare(
    extractEntityNameFromPath(b.newPath ?? b.oldPath ?? ''),
  );

export class EditorSdlcState {
  editorStore: EditorStore;
  currentProject?: Project | undefined;
  currentNullableWorkspace?: Workspace | undefined;
  currentRevision?: Revision | undefined;
  isWorkspaceOutdated = false;
  workspaceWorkflows: Workflow[] = [];
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
      setCurrentProject: action,
      setCurrentWorkspace: action,
      setCurrentRevision: action,
    });

    this.editorStore = editorStore;
  }

  get isCurrentProjectInProduction(): boolean {
    return this.currentProject?.projectType === ProjectType.PRODUCTION;
  }

  get currentProjectId(): string {
    return guaranteeNonNullable(
      this.currentProject,
      `Can't get current project`,
    ).projectId;
  }

  get currentWorkspaceId(): string {
    return this.currentWorkspace.workspaceId;
  }

  get currentWorkspace(): Workspace {
    return guaranteeNonNullable(
      this.currentNullableWorkspace,
      `Can't get current workspace`,
    );
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
    this.currentNullableWorkspace = val;
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
        (yield this.editorStore.sdlcServerClient.getProject(
          projectId,
        )) as PlainObject<Project>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
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
    workspaceIdenifier: WorkspaceIdentifier,
    options?: { suppressNotification?: boolean },
  ): GeneratorFn<void> {
    try {
      this.currentNullableWorkspace = Workspace.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getWorkspace(
          projectId,
          workspaceIdenifier,
        )) as PlainObject<Workspace>,
      );
      const isInConflictResolutionMode = (yield flowResult(
        this.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setMode(EDITOR_MODE.CONFLICT_RESOLUTION);
        this.currentNullableWorkspace.type =
          WorkspaceAccessType.CONFLICT_RESOLUTION;
        this.editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
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
        (yield this.editorStore.sdlcServerClient.getVersions(
          this.currentProjectId,
        )) as PlainObject<Version>[]
      ).map((version) => Version.serialization.fromJson(version));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isFetchingProjectVersions = false;
    }
  }

  *checkIfCurrentWorkspaceIsInConflictResolutionMode(): GeneratorFn<boolean> {
    return (yield this.editorStore.sdlcServerClient.checkIfWorkspaceIsInConflictResolutionMode(
      this.currentProjectId,
      this.currentWorkspace,
    )) as boolean;
  }

  *fetchCurrentRevision(
    projectId: string,
    workspaceId: WorkspaceIdentifier,
  ): GeneratorFn<void> {
    try {
      this.currentRevision = Revision.serialization.fromJson(
        this.editorStore.isInConflictResolutionMode
          ? ((yield this.editorStore.sdlcServerClient.getConflictResolutionRevision(
              projectId,
              workspaceId,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>)
          : ((yield this.editorStore.sdlcServerClient.getRevision(
              projectId,
              workspaceId,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *checkIfWorkspaceIsOutdated(): GeneratorFn<void> {
    try {
      this.isCheckingIfWorkspaceIsOutdated = true;
      this.isWorkspaceOutdated = this.editorStore.isInConflictResolutionMode
        ? ((yield this.editorStore.sdlcServerClient.isConflictResolutionOutdated(
            this.currentProjectId,
            this.currentWorkspace,
          )) as boolean)
        : ((yield this.editorStore.sdlcServerClient.isWorkspaceOutdated(
            this.currentProjectId,
            this.currentWorkspace,
          )) as boolean);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
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
      !this.currentNullableWorkspace ||
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
          (yield this.editorStore.sdlcServerClient.getRevision(
            this.currentProjectId,
            this.currentWorkspace,
            RevisionAlias.CURRENT,
          )) as PlainObject<Revision>,
        );
        // make sure there is no good recovery from this, at this point all users work risk conflict
        assertTrue(
          latestRevision.id === this.currentRevisionId,
          `Can't run local change detection: current workspace revision is not the latest. Please backup your work and refresh the application`,
        );
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.currentProjectId,
            this.currentWorkspace,
            this.currentRevisionId,
          )) as Entity[];
      } else {
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.currentProjectId,
            this.currentWorkspace,
            RevisionAlias.CURRENT,
          )) as Entity[];
      }
      this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(
        entities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          entities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
          ),
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildWorkspaceBaseRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const workspaceBaseEntities =
        (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
          this.currentProjectId,
          this.currentWorkspace,
          RevisionAlias.BASE,
        )) as Entity[];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(
        workspaceBaseEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(
          workspaceBaseEntities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT,
          ),
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildProjectLatestRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const projectLatestEntities =
        (yield this.editorStore.sdlcServerClient.getEntities(
          this.currentProjectId,
          undefined,
        )) as Entity[];
      this.editorStore.changeDetectionState.projectLatestRevisionState.setEntities(
        projectLatestEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.projectLatestRevisionState.buildEntityHashesIndex(
          projectLatestEntities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT,
          ),
        ),
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *fetchWorkspaceWorkflows(): GeneratorFn<void> {
    try {
      this.workspaceWorkflows = (
        (yield this.editorStore.sdlcServerClient.getWorkflowsByRevision(
          this.currentProjectId,
          this.currentWorkspace,
          RevisionAlias.CURRENT,
        )) as PlainObject<Workflow>[]
      ).map((workflow) => Workflow.serialization.fromJson(workflow));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}
