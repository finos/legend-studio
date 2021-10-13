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
import { STUDIO_LOG_EVENT } from '../stores/StudioLogEvent';
import type { ApplicationStore } from '@finos/legend-application';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { assertErrorThrown, LogEvent, ActionState } from '@finos/legend-shared';
import { generateSetupRoute } from './LegendStudioRouter';
import type {
  SDLCServerClient,
  WorkspaceIdentifier,
} from '@finos/legend-server-sdlc';
import {
  WorkspaceType,
  ImportReport,
  Project,
  ProjectType,
  Review,
  Workspace,
  WorkspaceAccessType,
} from '@finos/legend-server-sdlc';
import type { StudioConfig } from '../application/StudioConfig';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export interface ProjectOption {
  label: string;
  value: string;
  disabled?: boolean | undefined;
  tag: string;
}

const buildProjectOption = (project: Project): ProjectOption => ({
  label: project.name,
  value: project.projectId,
  disabled: false,
  tag: project.projectType,
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

export class SetupStore {
  applicationStore: ApplicationStore<StudioConfig>;
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
    applicationStore: ApplicationStore<StudioConfig>,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeAutoObservable(this, {
      applicationStore: false,
      sdlcServerClient: false,
      setCreateProjectModal: action,
      setCreateWorkspaceModal: action,
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
    return this.currentProjectWorkspaces && this.currentWorkspaceId
      ? this.currentProjectWorkspaces.get(this.currentWorkspaceId)
      : undefined;
  }
  get currentWorkspaceId(): string | undefined {
    return this.currentWorkspaceIdentifier
      ? this.getWorkspaceId(this.currentWorkspaceIdentifier)
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

  setCreateProjectModal(modal: boolean): void {
    this.showCreateProjectModal = modal;
  }
  setCreateWorkspaceModal(modal: boolean): void {
    this.showCreateWorkspaceModal = modal;
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
        (yield Promise.all(
          [
            this.sdlcServerClient.getProjects(
              ProjectType.PRODUCTION,
              undefined,
              undefined,
              undefined,
            ),
            this.sdlcServerClient.getProjects(
              ProjectType.PROTOTYPE,
              undefined,
              undefined,
              undefined,
            ),
          ].map((promise, idx) =>
            promise.catch((error) => {
              const wrappedError = new Error(
                `Error fetching ${
                  idx === 0 ? ProjectType.PRODUCTION : ProjectType.PROTOTYPE
                } projects: ${error.message}`,
              );
              this.applicationStore.log.error(
                LogEvent.create(STUDIO_LOG_EVENT.WORKSPACE_SETUP_FAILURE),
                wrappedError,
              );
              this.applicationStore.notifyError(wrappedError);
              return [];
            }),
          ),
        )) as PlainObject<Project>[][]
      )
        .flat()
        .map((project) => Project.serialization.fromJson(project));
      const projectMap = observable<string, Project>(new Map());
      projects.forEach((project) => projectMap.set(project.projectId, project));
      this.projects = projectMap;
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  /**
   * As of now we only create PROTOTYPE project since the creating PRODUCTION projects is not straight forward
   * we need to go to Gitlab, create a project there then associate that with SDLC server, etc.
   */
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
          type: ProjectType.PROTOTYPE,
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
        generateSetupRoute(
          this.applicationStore.config.sdlcServerKey,
          createdProject.projectId,
        ),
      );
      this.setCreateProjectModal(false);
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
          type: ProjectType.PRODUCTION,
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
      ? Array.from(this.projects.values()).map((project) => ({
          ...buildProjectOption(project),
          disabled:
            project.projectType === ProjectType.PROTOTYPE &&
            this.applicationStore.config.options
              .TEMPORARY__useSDLCProductionProjectsOnly,
        }))
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
      const workspaceMap = observable<string, Workspace>(new Map());

      (
        (yield this.sdlcServerClient.getWorkspaces(
          projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((workspace) => Workspace.serialization.fromJson(workspace))
        .forEach((workspace) => {
          // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
          // since that indicates bad state of the SDLC server
          if (
            workspacesInConflictResolutionIds.includes(workspace.workspaceId)
          ) {
            workspace.type = WorkspaceAccessType.CONFLICT_RESOLUTION;
          }
          workspaceMap.set(this.getWorkspaceId(workspace), workspace);
        });
      this.workspacesByProject.set(projectId, workspaceMap);
    } catch (error) {
      assertErrorThrown(error);
      // TODO handle error when fetching workspaces for an individual project
      this.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
    } finally {
      this.loadWorkspacesState.reset();
    }
  }

  getWorkspaceId(workspace: WorkspaceIdentifier): string {
    return `${workspace.workspaceType}/${workspace.workspaceId}`;
  }

  *createWorkspace(
    projectId: string,
    workspaceIdentifier: WorkspaceIdentifier,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const workspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          workspaceIdentifier,
        )) as PlainObject<Workspace>,
      );
      const existingWorkspaceForProject: Map<string, Workspace> | undefined =
        this.workspacesByProject.get(projectId);
      if (existingWorkspaceForProject) {
        existingWorkspaceForProject.set(
          this.getWorkspaceId(workspace),
          workspace,
        );
      } else {
        const newWorkspaceMap = observable<string, Workspace>(new Map());
        newWorkspaceMap.set(this.getWorkspaceId(workspace), workspace);
        this.workspacesByProject.set(projectId, newWorkspaceMap);
      }
      this.applicationStore.notifySuccess(
        `Workspace '${workspace.workspaceId}' is succesfully created`,
      );
      this.setCurrentProjectId(projectId);
      this.setCurrentWorkspaceIdentifier(workspace);
      this.setCreateWorkspaceModal(false);
      this.createWorkspaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.createWorkspaceState.fail();
    }
  }
}
