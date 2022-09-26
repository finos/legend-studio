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

import { observable, makeObservable, flowResult, flow, action } from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import {
  type SDLCServerClient,
  Workspace,
  WorkspaceType,
  Project,
} from '@finos/legend-server-sdlc';
import {
  type LegendStudioApplicationStore,
  LEGEND_STUDIO_APP_EVENT,
  ProjectSetupStore,
} from '@finos/legend-application-studio';
import { generateProjectServiceQueryUpdaterSetupRoute } from './DSL_Service_LegendStudioRouter.js';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';

export class UpdateProjectServiceQuerySetupStore extends ProjectSetupStore {
  readonly initState = ActionState.create();

  readonly loadWorkspacesState = ActionState.create();
  readonly createWorkspaceState = ActionState.create();
  groupWorkspaces: Workspace[] = [];
  currentGroupWorkspace?: Workspace | undefined;
  showCreateWorkspaceModal = false;

  services: Entity[] = [];
  currentService?: Entity | undefined;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    super(applicationStore, sdlcServerClient);

    makeObservable(this, {
      groupWorkspaces: observable,
      currentGroupWorkspace: observable,
      showCreateWorkspaceModal: observable,
      services: observable,
      currentService: observable,
      setShowCreateWorkspaceModal: action,
      resetCurrentProject: action,
      resetCurrentGroupWorkspace: action,
      resetCurrentService: action,
      changeService: action,
      initialize: flow,
      changeProject: flow,
      changeWorkspace: flow,
      createWorkspace: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
  }

  resetCurrentProject(): void {
    this.currentProject = undefined;
    this.groupWorkspaces = [];
    this.resetCurrentGroupWorkspace();
    this.applicationStore.navigator.updateCurrentLocation(
      generateProjectServiceQueryUpdaterSetupRoute(undefined),
    );
    this.resetCurrentProjectConfigurationStatus();
  }

  resetCurrentGroupWorkspace(): void {
    this.currentGroupWorkspace = undefined;
    this.services = [];
    this.resetCurrentService();
  }

  resetCurrentService(): void {
    this.currentService = undefined;
  }

  *initialize(projectId: string | undefined): GeneratorFn<void> {
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
          this.applicationStore.navigator.updateCurrentLocation(
            generateProjectServiceQueryUpdaterSetupRoute(undefined),
          );
          this.initState.pass();
          return;
        }
        yield flowResult(this.changeProject(project));
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.initState.fail();
    }
  }

  *changeProject(project: Project): GeneratorFn<void> {
    this.resetCurrentProjectConfigurationStatus();
    this.currentProject = project;
    this.applicationStore.navigator.updateCurrentLocation(
      generateProjectServiceQueryUpdaterSetupRoute(project.projectId),
    );
    yield flowResult(this.fetchCurrentProjectConfigurationStatus());

    this.loadWorkspacesState.inProgress();
    try {
      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          project.projectId,
        )) as Workspace[]
      ).map((workspace) => workspace.workspaceId);

      this.groupWorkspaces = (
        (yield this.sdlcServerClient.getGroupWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .filter(
          (workspace) =>
            // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
            // since that indicates bad state of the SDLC server
            !workspacesInConflictResolutionIds.includes(
              workspace.workspaceId,
            ) && workspace.workspaceType === WorkspaceType.GROUP,
        );

      if (this.groupWorkspaces.length) {
        yield flowResult(
          this.changeWorkspace(guaranteeNonNullable(this.groupWorkspaces[0])),
        );
      }

      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.loadWorkspacesState.fail();
    }
  }

  *changeWorkspace(workspace: Workspace): GeneratorFn<void> {
    this.currentGroupWorkspace = workspace;

    try {
      const entities = (yield flowResult(
        this.sdlcServerClient.getEntities(workspace.projectId, workspace),
      )) as Entity[];
      this.services = entities.filter(
        (entity) => entity.classifierPath === CORE_PURE_PATH.SERVICE,
      );

      if (this.services.length) {
        this.changeService(guaranteeNonNullable(this.services[0]));
      }
    } catch {
      this.services = [];
      this.resetCurrentService();
    }
  }

  changeService(service: Entity): void {
    this.currentService = service;
  }

  *createWorkspace(projectId: string, workspaceId: string): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const newGroupWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          workspaceId,
          WorkspaceType.GROUP,
        )) as PlainObject<Workspace>,
      );

      this.applicationStore.notifySuccess(
        `Workspace '${newGroupWorkspace.workspaceId}' is succesfully created`,
      );

      const matchingGroupWorkspace = this.groupWorkspaces.find(
        (workspace) => workspace.workspaceId === newGroupWorkspace.workspaceId,
      );
      const groupWorkspaceToSelect =
        matchingGroupWorkspace ?? newGroupWorkspace;

      yield flowResult(this.changeWorkspace(groupWorkspaceToSelect));
      this.setShowCreateWorkspaceModal(false);

      // NOTE: do this after closing the modal to not interfere
      // with validation of existing workspaces in create workspace modal
      if (!matchingGroupWorkspace) {
        this.groupWorkspaces.push(newGroupWorkspace);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
    } finally {
      this.createWorkspaceState.reset();
    }
  }
}
