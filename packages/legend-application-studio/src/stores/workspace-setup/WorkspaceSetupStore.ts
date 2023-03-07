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

import { observable, action, flowResult, makeObservable, flow } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  ActionState,
  IllegalStateError,
} from '@finos/legend-shared';
import { generateSetupRoute } from '../LegendStudioRouter.js';
import {
  type SDLCServerClient,
  WorkspaceType,
  ImportReport,
  Project,
  Review,
  Workspace,
} from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import {
  fetchProjectConfigurationStatus,
  type ProjectConfigurationStatus,
} from './ProjectConfigurationStatus.js';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export class WorkspaceSetupStore {
  applicationStore: LegendStudioApplicationStore;
  sdlcServerClient: SDLCServerClient;
  initState = ActionState.create();

  projects: Project[] = [];
  currentProject?: Project | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;
  loadProjectsState = ActionState.create();
  createOrImportProjectState = ActionState.create();
  importProjectSuccessReport?: ImportProjectSuccessReport | undefined;
  showCreateProjectModal = false;

  workspaces: Workspace[] = [];
  currentWorkspace?: Workspace | undefined;
  loadWorkspacesState = ActionState.create();
  createWorkspaceState = ActionState.create();
  showCreateWorkspaceModal = false;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentProjectConfigurationStatus: observable,
      importProjectSuccessReport: observable,
      showCreateProjectModal: observable,
      workspaces: observable,
      currentWorkspace: observable,
      showCreateWorkspaceModal: observable,
      setShowCreateProjectModal: action,
      setShowCreateWorkspaceModal: action,
      setImportProjectSuccessReport: action,
      changeWorkspace: action,
      resetProject: action,
      resetWorkspace: action,
      initialize: flow,
      loadProjects: flow,
      changeProject: flow,
      createProject: flow,
      importProject: flow,
      createWorkspace: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  setShowCreateProjectModal(val: boolean): void {
    this.showCreateProjectModal = val;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
  }

  setImportProjectSuccessReport(
    importProjectSuccessReport: ImportProjectSuccessReport | undefined,
  ): void {
    this.importProjectSuccessReport = importProjectSuccessReport;
  }

  resetProject(): void {
    this.currentProject = undefined;
    this.workspaces = [];
    this.currentWorkspace = undefined;
    this.applicationStore.navigationService.updateCurrentLocation(
      generateSetupRoute(undefined, undefined, undefined),
    );
    this.currentProjectConfigurationStatus = undefined;
  }

  resetWorkspace(): void {
    this.currentWorkspace = undefined;
    if (this.currentProject) {
      this.applicationStore.navigationService.updateCurrentLocation(
        generateSetupRoute(this.currentProject.projectId, undefined, undefined),
      );
    }
  }

  *initialize(
    projectId: string | undefined,
    workspaceId: string | undefined,
    groupWorkspaceId: string | undefined,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();

    try {
      if (projectId) {
        let project: Project;
        try {
          project = Project.serialization.fromJson(
            (yield this.sdlcServerClient.getProject(
              projectId,
            )) as PlainObject<Project>,
          );
        } catch {
          this.applicationStore.navigationService.updateCurrentLocation(
            generateSetupRoute(undefined),
          );
          this.initState.pass();
          return;
        }
        yield flowResult(
          this.changeProject(
            project,
            workspaceId
              ? { workspaceId: workspaceId, workspaceType: WorkspaceType.USER }
              : groupWorkspaceId
              ? {
                  workspaceId: groupWorkspaceId,
                  workspaceType: WorkspaceType.GROUP,
                }
              : undefined,
          ),
        );
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.initState.fail();
    }
  }

  *loadProjects(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          isValidSearchString ? searchText : undefined,
          undefined,
          DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  *changeProject(
    project: Project,
    workspaceInfo?:
      | {
          workspaceId: string;
          workspaceType: WorkspaceType;
        }
      | undefined,
  ): GeneratorFn<void> {
    this.currentProject = project;
    this.currentProjectConfigurationStatus = undefined;
    this.loadWorkspacesState.inProgress();

    try {
      this.currentProjectConfigurationStatus =
        (yield fetchProjectConfigurationStatus(
          project.projectId,
          this.applicationStore,
          this.sdlcServerClient,
        )) as ProjectConfigurationStatus;

      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          project.projectId,
        )) as Workspace[]
      ).map((workspace) => workspace.workspaceId);

      this.workspaces = (
        (yield this.sdlcServerClient.getWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .filter(
          // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
          // since that indicates bad state of the SDLC server
          (workspace) =>
            !workspacesInConflictResolutionIds.includes(workspace.workspaceId),
        );

      if (workspaceInfo) {
        const matchingWorkspace = this.workspaces.find(
          (workspace) =>
            workspace.workspaceType === workspaceInfo.workspaceType &&
            workspace.workspaceId === workspaceInfo.workspaceId,
        );
        if (matchingWorkspace) {
          this.changeWorkspace(matchingWorkspace);
        } else {
          this.applicationStore.navigationService.updateCurrentLocation(
            generateSetupRoute(project.projectId),
          );
        }
      } else {
        this.currentWorkspace = undefined;
        this.applicationStore.navigationService.updateCurrentLocation(
          generateSetupRoute(project.projectId),
        );
      }

      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.loadWorkspacesState.fail();
    }
  }

  changeWorkspace(workspace: Workspace): void {
    if (!this.currentProject) {
      throw new IllegalStateError(
        `Can't change workspace: project is not specified`,
      );
    }
    this.currentWorkspace = workspace;
    this.applicationStore.navigationService.updateCurrentLocation(
      generateSetupRoute(
        this.currentProject.projectId,
        workspace.workspaceId,
        workspace.workspaceType,
      ),
    );
  }

  *createProject(
    name: string,
    description: string,
    groupId: string,
    artifactId: string,
    tags: string[] = [],
  ): GeneratorFn<void> {
    this.createOrImportProjectState.inProgress();
    try {
      const createdProject = Project.serialization.fromJson(
        (yield this.sdlcServerClient.createProject({
          name,
          description,
          groupId,
          artifactId,
          tags,
        })) as PlainObject<Project>,
      );
      this.applicationStore.notifySuccess(
        `Project '${name}' is succesfully created`,
      );

      yield flowResult(this.changeProject(createdProject));

      this.setShowCreateProjectModal(false);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  *importProject(
    id: string,
    groupId: string,
    artifactId: string,
  ): GeneratorFn<void> {
    this.createOrImportProjectState.inProgress();
    try {
      const report = ImportReport.serialization.fromJson(
        (yield this.sdlcServerClient.importProject({
          id,
          groupId,
          artifactId,
        })) as PlainObject<ImportReport>,
      );
      const importReview = Review.serialization.fromJson(
        (yield this.sdlcServerClient.getReview(
          report.project.projectId,
          report.reviewId,
        )) as PlainObject<Review>,
      );
      this.setImportProjectSuccessReport({
        projectName: report.project.name,
        projectId: report.project.projectId,
        reviewUrl: importReview.webURL,
      });

      yield flowResult(this.changeProject(report.project));
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  *createWorkspace(
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const newWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          workspaceId,
          workspaceType,
        )) as PlainObject<Workspace>,
      );

      this.applicationStore.notifySuccess(
        `Workspace '${newWorkspace.workspaceId}' is succesfully created`,
      );

      const matchingWorkspace = this.workspaces.find(
        (workspace) =>
          workspace.workspaceId === newWorkspace.workspaceId &&
          workspace.workspaceType === newWorkspace.workspaceType,
      );
      const newWorkspaceToSelect = matchingWorkspace ?? newWorkspace;
      this.changeWorkspace(newWorkspaceToSelect);
      this.setShowCreateWorkspaceModal(false);

      // NOTE: do this after closing the modal to not interfere
      // with validation of existing workspaces in create workspace modal
      if (!matchingWorkspace) {
        this.workspaces.push(newWorkspace);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
    } finally {
      this.createWorkspaceState.reset();
    }
  }
}
