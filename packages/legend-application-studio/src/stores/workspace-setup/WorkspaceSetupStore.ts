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
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  ActionState,
  IllegalStateError,
  UnsupportedOperationError,
  guaranteeNonNullable,
  guaranteeType,
  exactSearch,
} from '@finos/legend-shared';
import { generateSetupRoute } from '../../__lib__/LegendStudioNavigation.js';
import {
  type SDLCServerClient,
  SANDBOX_SDLC_TAG,
  WorkspaceType,
  ImportReport,
  Project,
  Review,
  Workspace,
  Patch,
  isProjectSandbox,
} from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import {
  DEFAULT_TAB_SIZE,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import {
  fetchProjectConfigurationStatus,
  ProjectConfigurationStatus,
} from './ProjectConfigurationStatus.js';
import { GraphManagerState } from '@finos/legend-graph';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export class WorkspaceSetupStore {
  readonly applicationStore: LegendStudioApplicationStore;

  readonly sdlcServerClient: SDLCServerClient;
  readonly initState = ActionState.create();

  projects: Project[] = [];
  currentProject?: Project | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;
  loadProjectsState = ActionState.create();
  createOrImportProjectState = ActionState.create();
  importProjectSuccessReport?: ImportProjectSuccessReport | undefined;
  showCreateProjectModal = false;

  engineInitializeState = ActionState.create();
  enginePromise: Promise<void> | undefined;
  createSandboxProjectState = ActionState.create();
  sandboxProject: Project | boolean = false;
  hasSandboxAccess: boolean | undefined;
  sandboxModal = false;
  loadSandboxState = ActionState.create();

  patches: Patch[] = [];
  loadPatchesState = ActionState.create();

  workspaces: Workspace[] = [];
  currentWorkspace?: Workspace | undefined;
  loadWorkspacesState = ActionState.create();
  createWorkspaceState = ActionState.create();
  showCreateWorkspaceModal = false;
  showAdvancedWorkspaceFilterOptions = false;

  graphManagerState: GraphManagerState;

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
      showAdvancedWorkspaceFilterOptions: observable,
      loadSandboxState: observable,
      showCreateWorkspaceModal: observable,
      sandboxProject: observable,
      createSandboxProjectState: observable,
      engineInitializeState: observable,
      enginePromise: observable,
      sandboxModal: observable,
      hasSandboxAccess: observable,
      setShowCreateProjectModal: action,
      setShowCreateWorkspaceModal: action,
      setShowAdvancedWorkspaceFilterOptions: action,
      setImportProjectSuccessReport: action,
      setSandboxModal: action,
      changeWorkspace: action,
      resetProject: action,
      resetWorkspace: action,
      initialize: flow,
      loadProjects: flow,
      loadSandboxProject: flow,
      changeProject: flow,
      createProject: flow,
      importProject: flow,
      createSandboxProject: flow,
      createWorkspace: flow,
      initializeEngine: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    if (this.supportsCreatingSandboxProject) {
      flowResult(this.initializeEngine()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }

  get supportsCreatingSandboxProject(): boolean {
    return this.applicationStore.config.options
      .TEMPORARY__enableCreationOfSandboxProjects;
  }

  setShowCreateProjectModal(val: boolean): void {
    this.showCreateProjectModal = val;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
  }

  setShowAdvancedWorkspaceFilterOptions(val: boolean): void {
    this.showAdvancedWorkspaceFilterOptions = val;
  }

  setImportProjectSuccessReport(
    importProjectSuccessReport: ImportProjectSuccessReport | undefined,
  ): void {
    this.importProjectSuccessReport = importProjectSuccessReport;
  }

  resetProject(): void {
    this.currentProject = undefined;
    this.patches = [];
    this.workspaces = [];
    this.currentWorkspace = undefined;
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateSetupRoute(undefined, undefined, undefined, undefined),
    );
    this.currentProjectConfigurationStatus = undefined;
  }

  resetWorkspace(): void {
    this.currentWorkspace = undefined;
    if (this.currentProject) {
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateSetupRoute(
          this.currentProject.projectId,
          undefined,
          undefined,
          undefined,
        ),
      );
    }
  }

  setSandboxModal(val: boolean): void {
    this.sandboxModal = val;
  }

  *createSandboxProject(): GeneratorFn<void> {
    try {
      if (!this.hasSandboxAccess) {
        this.setSandboxModal(true);
        return;
      }
      // create sandbox project and pilot workspace
      this.applicationStore.alertService.setBlockingAlert({
        message: 'Creating sandbox project...',
        showLoading: true,
      });
      const sandboxProject =
        (yield this.graphManagerState.graphManager.createSandboxProject()) as {
          projectId: string;
          webUrl: string | undefined;
          owner: string;
        };
      this.applicationStore.alertService.setBlockingAlert({
        message: `Sandbox project ${sandboxProject.projectId} created. Creating default workspace...`,
        showLoading: true,
      });
      yield flowResult(this.loadSandboxProject());
      const sandbox = guaranteeType(
        this.sandboxProject,
        Project,
        'Error retrieving sandbox project',
      );
      const initialWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          sandbox.projectId,
          undefined,
          'myWorkspace',
          WorkspaceType.GROUP,
        )) as PlainObject<Workspace>,
      );
      yield flowResult(
        this.changeProject(sandbox, {
          workspaceId: initialWorkspace.workspaceId,
          workspaceType: WorkspaceType.GROUP,
        }),
      );
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.applicationStore.notificationService.notifySuccess(
        `Sandbox project with workspace created`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.ENGINE_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
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

    // TODO: when we genericize the way to initialize an application page
    this.applicationStore.assistantService.setIsHidden(false);

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
          this.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateSetupRoute(undefined, undefined),
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
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
    }
  }

  *initializeEngine(): GeneratorFn<void> {
    this.engineInitializeState.inProgress();
    try {
      const initPromise = this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
          disableGraphConfiguration: true,
        },
      );
      this.enginePromise = initPromise;
      yield initPromise;
      this.enginePromise = undefined;
      this.engineInitializeState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.ENGINE_MANAGER_FAILURE),
        error,
      );
      this.engineInitializeState.complete();
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
          // We apply an exact search on the input text because we show exact searches with
          // custom selector. This avoids losing some results with the additional filtering.
          isValidSearchString ? exactSearch(searchText) : undefined,
          undefined,
          DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  *loadSandboxProject(): GeneratorFn<void> {
    if (!this.supportsCreatingSandboxProject) {
      return;
    }
    this.sandboxProject = false;
    try {
      this.loadSandboxState.inProgress();
      if (this.enginePromise) {
        yield this.enginePromise;
      }
      const sandboxProject = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          this.sdlcServerClient.currentUser?.userId,
          [SANDBOX_SDLC_TAG],
          1,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      if (this.hasSandboxAccess === undefined) {
        this.hasSandboxAccess =
          (yield this.graphManagerState.graphManager.userHasPrototypeProjectAccess(
            this.sdlcServerClient.currentUser?.userId ?? '',
          )) as boolean;
      }
      this.sandboxProject = true;
      if (sandboxProject.length > 1) {
        throw new UnsupportedOperationError(
          'Only one sandbox project is supported per user.',
        );
      } else if (sandboxProject.length === 1) {
        this.sandboxProject = guaranteeNonNullable(sandboxProject[0]);
      }
      this.loadSandboxState.pass();
    } catch (error) {
      this.sandboxProject = true;
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.loadSandboxState.fail();
    } finally {
      this.loadSandboxState.complete();
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
    this.loadPatchesState.inProgress();
    try {
      if (isProjectSandbox(project)) {
        this.patches = [];
      } else {
        this.patches = (
          (yield this.sdlcServerClient.getPatches(
            project.projectId,
          )) as PlainObject<Patch>[]
        ).map((v) => Patch.serialization.fromJson(v));
      }
      this.loadPatchesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.loadPatchesState.fail();
    }

    this.loadWorkspacesState.inProgress();
    try {
      if (isProjectSandbox(project)) {
        const result = new ProjectConfigurationStatus();
        result.projectId = project.projectId;
        result.isConfigured = true;
        this.currentProjectConfigurationStatus = result;
      } else {
        this.currentProjectConfigurationStatus =
          (yield fetchProjectConfigurationStatus(
            project.projectId,
            undefined,
            this.applicationStore,
            this.sdlcServerClient,
          )) as ProjectConfigurationStatus;
      }
      const workspacesInConflictResolutionIds = isProjectSandbox(project)
        ? []
        : (
            (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
              project.projectId,
              undefined,
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

      for (const patch of this.patches) {
        this.workspaces = this.workspaces.concat(
          (
            (yield this.sdlcServerClient.getWorkspaces(
              project.projectId,
              patch.patchReleaseVersionId.id,
            )) as PlainObject<Workspace>[]
          )
            .map((v) => {
              const w = Workspace.serialization.fromJson(v);
              w.source = patch.patchReleaseVersionId.id;
              return w;
            })
            .filter(
              // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
              // since that indicates bad state of the SDLC server
              (workspace) =>
                !workspacesInConflictResolutionIds.includes(
                  workspace.workspaceId,
                ),
            ),
        );
      }

      if (workspaceInfo) {
        const matchingWorkspace = this.workspaces.find(
          (workspace) =>
            workspace.workspaceType === workspaceInfo.workspaceType &&
            workspace.workspaceId === workspaceInfo.workspaceId,
        );
        if (matchingWorkspace) {
          this.changeWorkspace(matchingWorkspace);
        } else {
          this.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateSetupRoute(project.projectId, undefined),
          );
        }
      } else {
        this.currentWorkspace = undefined;
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateSetupRoute(project.projectId, undefined),
        );
      }
      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
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
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateSetupRoute(
        this.currentProject.projectId,
        workspace.source,
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
      this.applicationStore.notificationService.notifySuccess(
        `Project '${name}' is succesfully created`,
      );

      yield flowResult(this.changeProject(createdProject));

      this.setShowCreateProjectModal(false);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
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
          undefined,
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
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  *createWorkspace(
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const newWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          patchReleaseVersionId,
          workspaceId,
          workspaceType,
        )) as PlainObject<Workspace>,
      );
      newWorkspace.source = patchReleaseVersionId;

      this.applicationStore.notificationService.notifySuccess(
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
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createWorkspaceState.reset();
    }
  }
}
