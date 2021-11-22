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
import type { EntityDiff, WorkspaceType } from '@finos/legend-server-sdlc';
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
import { LEGEND_STUDIO_LOG_EVENT_TYPE } from './LegendStudioLogEvent';

export const entityDiffSorter = (a: EntityDiff, b: EntityDiff): number =>
  extractEntityNameFromPath(a.newPath ?? a.oldPath ?? '').localeCompare(
    extractEntityNameFromPath(b.newPath ?? b.oldPath ?? ''),
  );

export class EditorSDLCState {
  editorStore: EditorStore;
  currentProject?: Project | undefined;
  currentWorkspace?: Workspace | undefined;
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
      setCurrentProject: action,
      setCurrentWorkspace: action,
      setCurrentRevision: action,
    });

    this.editorStore = editorStore;
  }

  get isCurrentProjectInProduction(): boolean {
    return this.currentProject?.projectType === ProjectType.PRODUCTION;
  }

  get activeProject(): Project {
    return guaranteeNonNullable(
      this.currentProject,
      `Active project has not been properly set`,
    );
  }

  get activeWorkspace(): Workspace {
    return guaranteeNonNullable(
      this.currentWorkspace,
      `Active workspace has not been properly set`,
    );
  }

  get activeRevision(): Revision {
    return guaranteeNonNullable(
      this.currentRevision,
      `Active revision has not been properly set`,
    );
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
        (yield this.editorStore.sdlcServerClient.getProject(
          projectId,
        )) as PlainObject<Project>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
    workspaceType: WorkspaceType,
    options?: { suppressNotification?: boolean },
  ): GeneratorFn<void> {
    try {
      this.currentWorkspace = Workspace.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getWorkspace(
          projectId,
          workspaceId,
          workspaceType,
        )) as PlainObject<Workspace>,
      );
      const isInConflictResolutionMode = (yield flowResult(
        this.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setMode(EDITOR_MODE.CONFLICT_RESOLUTION);
        this.currentWorkspace.accessType =
          WorkspaceAccessType.CONFLICT_RESOLUTION;
        this.editorStore.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
          this.activeProject.projectId,
        )) as PlainObject<Version>[]
      ).map((version) => Version.serialization.fromJson(version));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.isFetchingProjectVersions = false;
    }
  }

  *checkIfCurrentWorkspaceIsInConflictResolutionMode(): GeneratorFn<boolean> {
    return (yield this.editorStore.sdlcServerClient.checkIfWorkspaceIsInConflictResolutionMode(
      this.activeProject.projectId,
      this.activeWorkspace,
    )) as boolean;
  }

  *fetchCurrentRevision(
    projectId: string,
    workspace: Workspace,
  ): GeneratorFn<void> {
    try {
      this.currentRevision = Revision.serialization.fromJson(
        this.editorStore.isInConflictResolutionMode
          ? ((yield this.editorStore.sdlcServerClient.getConflictResolutionRevision(
              projectId,
              workspace,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>)
          : ((yield this.editorStore.sdlcServerClient.getRevision(
              projectId,
              workspace,
              RevisionAlias.CURRENT,
            )) as PlainObject<Revision>),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
            this.activeProject.projectId,
            this.activeWorkspace,
          )) as boolean)
        : ((yield this.editorStore.sdlcServerClient.isWorkspaceOutdated(
            this.activeProject.projectId,
            this.activeWorkspace,
          )) as boolean);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
          (yield this.editorStore.sdlcServerClient.getRevision(
            this.activeProject.projectId,
            this.activeWorkspace,
            RevisionAlias.CURRENT,
          )) as PlainObject<Revision>,
        );
        // make sure there is no good recovery from this, at this point all users work risk conflict
        assertTrue(
          latestRevision.id === this.activeRevision.id,
          `Can't run local change detection: current workspace revision is not the latest. Please backup your work and refresh the application`,
        );
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.activeProject.projectId,
            this.activeWorkspace,
            this.activeRevision.id,
          )) as Entity[];
      } else {
        entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.activeProject.projectId,
            this.activeWorkspace,
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
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildWorkspaceBaseRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const workspaceBaseEntities =
        (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
          this.activeProject.projectId,
          this.activeWorkspace,
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
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *buildProjectLatestRevisionEntityHashesIndex(): GeneratorFn<void> {
    try {
      const projectLatestEntities =
        (yield this.editorStore.sdlcServerClient.getEntities(
          this.activeProject.projectId,
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
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *fetchWorkspaceWorkflows(): GeneratorFn<void> {
    try {
      this.workspaceWorkflows = (
        (yield this.editorStore.sdlcServerClient.getWorkflowsByRevision(
          this.activeProject.projectId,
          this.activeWorkspace,
          RevisionAlias.CURRENT,
        )) as PlainObject<Workflow>[]
      ).map((workflow) => Workflow.serialization.fromJson(workflow));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}
