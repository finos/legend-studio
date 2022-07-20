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

import { observable, action, makeAutoObservable, flowResult } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent.js';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  ActionState,
} from '@finos/legend-shared';
import { generateSetupRoute } from './LegendStudioRouter.js';
import {
  type SDLCServerClient,
  WorkspaceType,
  ImportReport,
  Project,
  Review,
  Workspace,
  WorkspaceAccessType,
} from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from './LegendStudioBaseStore.js';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export interface ProjectOption {
  label: string;
  value: string;
}

const buildProjectOption = (project: Project): ProjectOption => ({
  label: project.name,
  value: project.projectId,
});

export interface WorkspaceOption {
  label: string;
  value: Workspace;
  __isNew__?: boolean | undefined;
}

const buildWorkspaceOption = (workspace: Workspace): WorkspaceOption => ({
  label: workspace.workspaceId,
  value: workspace,
});

export interface WorkspaceIdentifier {
  workspaceId: string;
  workspaceType: WorkspaceType;
}

export class WorkspaceSetupStore {
  applicationStore: LegendStudioApplicationStore;
  sdlcServerClient: SDLCServerClient;

  currentProjectId?: string | undefined;
  currentWorkspaceIdentifier?: WorkspaceIdentifier | undefined;
  projects?: Map<string, Project> | undefined;
  workspacesByProject = new Map<string, Map<string, Workspace>>();
  loadWorkspacesState = ActionState.create();
  createWorkspaceState = ActionState.create();
  createOrImportProjectState = ActionState.create();
  loadProjectsState = ActionState.create();
  showCreateProjectModal = false;
  showCreateWorkspaceModal = false;
  importProjectSuccessReport?: ImportProjectSuccessReport | undefined;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeAutoObservable(this, {
      applicationStore: false,
      sdlcServerClient: false,
      setShowCreateProjectModal: action,
      setShowCreateWorkspaceModal: action,
      setCurrentProjectId: action,
      setCurrentWorkspaceIdentifier: action,
      setImportProjectSuccessReport: action,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  get currentProject(): Project | undefined {
    return this.projects && this.currentProjectId
      ? this.projects.get(this.currentProjectId)
      : undefined;
  }

  get currentProjectWorkspaces(): Map<string, Workspace> | undefined {
    return this.currentProjectId
      ? this.workspacesByProject.get(this.currentProjectId)
      : undefined;
  }

  get currentWorkspace(): Workspace | undefined {
    return this.currentProjectWorkspaces && this.currentWorkspaceCompositeId
      ? this.currentProjectWorkspaces.get(this.currentWorkspaceCompositeId)
      : undefined;
  }

  get currentWorkspaceCompositeId(): string | undefined {
    return this.currentWorkspaceIdentifier
      ? this.buildWorkspaceCompositeId(this.currentWorkspaceIdentifier)
      : undefined;
  }

  init(
    workspaceId: string | undefined,
    groupWorkspaceId: string | undefined,
  ): void {
    if (workspaceId) {
      this.setCurrentWorkspaceIdentifier({
        workspaceId,
        workspaceType: WorkspaceType.USER,
      });
    } else if (groupWorkspaceId) {
      this.setCurrentWorkspaceIdentifier({
        workspaceId: groupWorkspaceId,
        workspaceType: WorkspaceType.GROUP,
      });
    } else {
      this.setCurrentWorkspaceIdentifier(undefined);
    }
  }

  setShowCreateProjectModal(val: boolean): void {
    this.showCreateProjectModal = val;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
  }

  setCurrentProjectId(id: string | undefined): void {
    this.currentProjectId = id;
  }

  setCurrentWorkspaceIdentifier(val: WorkspaceIdentifier | undefined): void {
    this.currentWorkspaceIdentifier = val;
  }

  setImportProjectSuccessReport(
    importProjectSuccessReport: ImportProjectSuccessReport | undefined,
  ): void {
    this.importProjectSuccessReport = importProjectSuccessReport;
  }

  *fetchProjects(): GeneratorFn<void> {
    this.loadProjectsState.inProgress();
    try {
      const projects = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      const projectIndex = observable<string, Project>(new Map());
      projects.forEach((project) =>
        projectIndex.set(project.projectId, project),
      );
      this.projects = projectIndex;
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
    }
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
      yield flowResult(this.fetchProjects());
      this.projects?.set(createdProject.projectId, createdProject);
      this.applicationStore.navigator.goTo(
        generateSetupRoute(createdProject.projectId),
      );
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
      yield flowResult(this.fetchProjects());
      this.projects?.set(report.project.projectId, report.project);
      this.setCurrentProjectId(report.project.projectId);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  get projectOptions(): ProjectOption[] {
    return this.projects
      ? Array.from(this.projects.values()).map(buildProjectOption)
      : [];
  }

  get currentProjectWorkspaceOptions(): WorkspaceOption[] {
    return this.currentProjectWorkspaces
      ? Array.from(this.currentProjectWorkspaces.values()).map(
          buildWorkspaceOption,
        )
      : [];
  }

  *fetchWorkspaces(projectId: string): GeneratorFn<void> {
    this.loadWorkspacesState.inProgress();
    try {
      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          projectId,
        )) as Workspace[]
      ).map((workspace) => workspace.workspaceId);
      const workspaceIndex = observable<string, Workspace>(new Map());

      (
        (yield this.sdlcServerClient.getWorkspaces(
          projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .forEach((workspace) => {
          // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
          // since that indicates bad state of the SDLC server
          if (
            workspacesInConflictResolutionIds.includes(workspace.workspaceId)
          ) {
            workspace.accessType = WorkspaceAccessType.CONFLICT_RESOLUTION;
          }
          workspaceIndex.set(
            this.buildWorkspaceCompositeId(workspace),
            workspace,
          );
        });
      this.workspacesByProject.set(projectId, workspaceIndex);
    } catch (error) {
      assertErrorThrown(error);
      // TODO handle error when fetching workspaces for an individual project
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
    } finally {
      this.loadWorkspacesState.reset();
    }
  }

  buildWorkspaceCompositeId(workspace: WorkspaceIdentifier): string {
    return `${workspace.workspaceType}/${workspace.workspaceId}`;
  }

  *createWorkspace(
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const workspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          workspaceId,
          workspaceType,
        )) as PlainObject<Workspace>,
      );
      const existingWorkspaceForProject: Map<string, Workspace> | undefined =
        this.workspacesByProject.get(projectId);
      if (existingWorkspaceForProject) {
        existingWorkspaceForProject.set(
          this.buildWorkspaceCompositeId(workspace),
          workspace,
        );
      } else {
        const workspaceIndex = observable<string, Workspace>(new Map());
        workspaceIndex.set(
          this.buildWorkspaceCompositeId(workspace),
          workspace,
        );
        this.workspacesByProject.set(projectId, workspaceIndex);
      }
      this.applicationStore.notifySuccess(
        `Workspace '${workspace.workspaceId}' is succesfully created`,
      );
      this.setCurrentProjectId(projectId);
      this.setCurrentWorkspaceIdentifier(workspace);
      this.setShowCreateWorkspaceModal(false);
      this.createWorkspaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.createWorkspaceState.fail();
    }
  }
}
