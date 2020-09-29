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

import React, { createContext, useContext } from 'react';
import { observable, computed, action, flow } from 'mobx';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { useLocalStore } from 'mobx-react-lite';
import { deserialize } from 'serializr';
import { ApplicationStore, useApplicationStore } from './ApplicationStore';
import { Project, ProjectType, ProjectSelectOption, ImportProjectReport } from 'SDLC/project/Project';
import { Workspace, WorkspaceSelectOption, WORKSPACE_TYPE, PROJECT_LATEST_VIEWER_WORKSPACE } from 'SDLC/workspace/Workspace';
import { sdlcClient } from 'API/SdlcClient';
import { isNonNullable, assertNonNullable, guaranteeNonNullable, compareLabelFn } from 'Utilities/GeneralUtil';
import { Review } from 'SDLC/review/Review';
import { config } from 'ApplicationConfig';
import { ACTION_STATE } from 'Const';
import { getSetupRoute } from 'Stores/RouterConfig';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export class SetupStore {
  applicationStore: ApplicationStore;
  @observable currentProjectId?: string;
  @observable currentWorkspaceId?: string;
  @observable projects?: Map<string, Project>;
  @observable workspacesByProject = new Map<string, Map<string, Workspace>>();
  @observable loadWorkspacesState = ACTION_STATE.INITIAL;
  @observable createWorkspaceState = ACTION_STATE.INITIAL;
  @observable createOrImportProjectState = ACTION_STATE.INITIAL;
  @observable loadProjectsState = ACTION_STATE.INITIAL;
  @observable showCreateProjectModal = false;
  @observable showCreateWorkspaceModal = false;
  @observable importProjectSuccessReport?: ImportProjectSuccessReport;

  constructor(applicationStore: ApplicationStore) {
    this.applicationStore = applicationStore;
  }

  @computed get currentProject(): Project | undefined { return this.projects && this.currentProjectId ? this.projects.get(this.currentProjectId) : undefined }
  @computed get currentProjectWorkspaces(): Map<string, Workspace> | undefined { return this.currentProjectId ? this.workspacesByProject.get(this.currentProjectId) : undefined }
  @computed get currentWorkspace(): Workspace | undefined { return this.currentProjectWorkspaces && this.currentWorkspaceId ? this.currentProjectWorkspaces.get(this.currentWorkspaceId) : undefined }

  @action setCreateProjectModal(modal: boolean): void { this.showCreateProjectModal = modal }
  @action setCreateWorkspaceModal(modal: boolean): void { this.showCreateWorkspaceModal = modal }
  @action setCurrentProjectId(id: string | undefined): void { this.currentProjectId = id }
  @action setCurrentWorkspaceId(id: string | undefined): void { this.currentWorkspaceId = id }
  @action setImportProjectSuccessReport(importProjectSuccessReport: ImportProjectSuccessReport | undefined): void { this.importProjectSuccessReport = importProjectSuccessReport }

  fetchProjects = flow(function* (this: SetupStore) {
    this.loadProjectsState = ACTION_STATE.IN_PROGRESS;
    try {
      let fetchingErrorCount = 0;
      const projectFetchPromises = [sdlcClient.getProjects(ProjectType.PRODUCTION, undefined, undefined, undefined), sdlcClient.getProjects(ProjectType.PROTOTYPE, undefined, undefined, undefined)];
      const response = (yield Promise.all(
        projectFetchPromises.map((p, idx) => p.catch(error => {
          const wrappedError = new Error(`Error fetching ${idx === 0 ? ProjectType.PRODUCTION : ProjectType.PROTOTYPE} projects: ${error.message}`);
          Log.error(LOG_EVENT.SETUP_PROBLEM, wrappedError);
          this.applicationStore.notifyError(wrappedError);
          fetchingErrorCount += 1;
          return [];
        }))
      )) as unknown as Project[][];
      if (fetchingErrorCount === projectFetchPromises.length) {
        throw new Error('Error fetching both Production and Prototype projects');
      }
      const projects = response.flat();
      const projectMap = observable<string, Project>(new Map());
      projects.filter(isNonNullable).forEach(project => projectMap.set(project.projectId, deserialize(Project, project)));
      this.projects = projectMap;
      this.loadProjectsState = ACTION_STATE.SUCCEEDED;
    } catch (error) {
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
      this.applicationStore.notifyError(error);
      this.loadProjectsState = ACTION_STATE.FAILED;
    }
  });

  /**
   * As of now we only create PROTOTYPE project since the creating PRODUCTION projects is not straight forward
   * we need to go to Gitlab, create a project there then associate that with SDLC server, etc.
   */
  createProject = flow(function* (this: SetupStore, name: string, description: string, groupId: string, artifactId: string, tags: string[] = []) {
    this.createOrImportProjectState = ACTION_STATE.IN_PROGRESS;
    try {
      const createdProject = deserialize(Project, yield sdlcClient.createProject({
        name,
        description,
        type: ProjectType.PROTOTYPE,
        groupId,
        artifactId,
        tags,
      }));
      this.applicationStore.notifySuccess(`Project '${name}' is succesfully created`);
      yield this.fetchProjects();
      this.projects?.set(createdProject.projectId, createdProject);
      this.applicationStore.historyApiClient.push(getSetupRoute(createdProject.projectId));
      this.setCreateProjectModal(false);
    } catch (error) {
      this.applicationStore.notifyError(error);
    } finally {
      this.createOrImportProjectState = ACTION_STATE.INITIAL;
    }
  });

  importProject = flow(function* (this: SetupStore, id: string, groupId: string, artifactId: string) {
    this.createOrImportProjectState = ACTION_STATE.IN_PROGRESS;
    try {
      const report = deserialize(ImportProjectReport, yield sdlcClient.importProject({
        id,
        type: ProjectType.PRODUCTION,
        groupId,
        artifactId,
      }));
      const importReview = deserialize(Review, yield sdlcClient.getReview(report.project.projectId, report.reviewId));
      this.setImportProjectSuccessReport({ projectName: report.project.name, projectId: report.project.projectId, reviewUrl: importReview.webURL });
      yield this.fetchProjects();
      this.projects?.set(report.project.projectId, report.project);
      this.setCurrentProjectId(report.project.projectId);
    } catch (error) {
      this.applicationStore.notifyError(error);
    } finally {
      this.createOrImportProjectState = ACTION_STATE.INITIAL;
    }
  });

  @computed get projectOptions(): ProjectSelectOption[] {
    return this.projects
      ? Array.from(this.projects.values()).map(project => {
        const option = project.selectOption;
        return { ...option, disabled: project.projectType === ProjectType.PROTOTYPE && config.features.BETA__productionProjectsOnly };
      }).sort(compareLabelFn)
      : [];
  }

  @computed get currentProjectWorkspaceOptions(): WorkspaceSelectOption[] {
    return this.currentProjectWorkspaces
      ? Array.from(this.currentProjectWorkspaces.values())
        .filter(workspace => workspace.workspaceId !== PROJECT_LATEST_VIEWER_WORKSPACE)
        .map(workspace => workspace.selectOption)
        .sort(compareLabelFn)
      : [];
  }

  fetchWorkspaces = flow(function* (this: SetupStore, projectId: string) {
    this.loadWorkspacesState = ACTION_STATE.IN_PROGRESS;
    try {
      const workspaces = (yield sdlcClient.getWorkspaces(projectId)) as unknown as Workspace[];
      const workspacesInConflictResolution = (yield sdlcClient.getWorkspacesInConflictResolutionMode(projectId)) as unknown as Workspace[];
      const workspacesInConflictResolutionIds = workspacesInConflictResolution.map(workspace => workspace.workspaceId);
      const workspaceMap = observable<string, Workspace>(new Map());
      workspaces.forEach(workspace => {
        // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
        // since that indicates bad state of the SDLC server
        if (workspacesInConflictResolutionIds.includes(workspace.workspaceId)) { workspace.type = WORKSPACE_TYPE.CONFLICT_RESOLUTION }
        workspaceMap.set(workspace.workspaceId, deserialize(Workspace, workspace));
      });
      this.workspacesByProject.set(projectId, workspaceMap);
    } catch (error) {
      // TODO handle error when fetching workspaces for an individual project
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
    } finally {
      this.loadWorkspacesState = ACTION_STATE.INITIAL;
    }
  });

  createWorkspace = flow(function* (this: SetupStore, projectId: string, workspaceId?: string) {
    this.createWorkspaceState = ACTION_STATE.IN_PROGRESS;
    try {
      assertNonNullable(workspaceId, 'workspace ID is required');
      const workspace = deserialize(Workspace, yield sdlcClient.createWorkspace(projectId, workspaceId));
      const existingWorkspaceForProject: Map<string, Workspace> | undefined = this.workspacesByProject.get(projectId);
      if (existingWorkspaceForProject) {
        existingWorkspaceForProject.set(workspaceId, workspace);
      } else {
        const newWorkspaceMap = observable<string, Workspace>(new Map());
        newWorkspaceMap.set(workspaceId, workspace);
        this.workspacesByProject.set(projectId, newWorkspaceMap);
      }
      this.applicationStore.notifySuccess(`Workspace '${workspace.workspaceId}' is succesfully created`);
      this.setCurrentProjectId(projectId);
      this.setCurrentWorkspaceId(workspaceId);
      this.setCreateWorkspaceModal(false);
      this.createWorkspaceState = ACTION_STATE.SUCCEEDED;
    } catch (error) {
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
      this.applicationStore.notifyError(error);
      this.createWorkspaceState = ACTION_STATE.FAILED;
    }
  });
}

const SetupStoreContext = createContext<SetupStore | undefined>(undefined);

export const SetupStoreProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalStore(() => new SetupStore(applicationStore));
  return <SetupStoreContext.Provider value={store}>{children}</SetupStoreContext.Provider>;
};

export const useSetupStore = (): SetupStore =>
  guaranteeNonNullable(useContext(SetupStoreContext), 'useSetupStore() hook must be used inside SetupStore context provider');
