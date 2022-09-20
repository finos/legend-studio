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
  type DepotServerClient,
  type StoredEntity,
  DepotScope,
  ProjectData,
  MASTER_SNAPSHOT_ALIAS,
} from '@finos/legend-server-depot';
import {
  extractServiceInfo,
  type ServiceInfo,
} from '@finos/legend-query-builder';
import {
  type SDLCServerClient,
  Workspace,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import {
  type LegendStudioApplicationStore,
  LEGEND_STUDIO_APP_EVENT,
} from '@finos/legend-application-studio';
import {
  generateServiceQueryUpdaterSetupRoute,
  parseServiceCoordinates,
} from './DSL_Service_LegendStudioRouter.js';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';

const MINIMUM_SERVICE_LOADER_SEARCH_LENGTH = 3;
const DEFAULT_SERVICE_LOADER_LIMIT = 10;

export class UpdateServiceQuerySetupStore {
  applicationStore: LegendStudioApplicationStore;
  sdlcServerClient: SDLCServerClient;
  depotServerClient: DepotServerClient;

  initState = ActionState.create();
  loadServicesState = ActionState.create();
  services: ServiceInfo[] = [];
  currentProject?: ProjectData | undefined;
  currentSnapshotService?: ServiceInfo | undefined;

  loadWorkspacesState = ActionState.create();
  createWorkspaceState = ActionState.create();
  groupWorkspaces: Workspace[] = [];
  currentGroupWorkspace?: Workspace | undefined;
  currentWorkspaceService?: Entity | undefined;
  showCreateWorkspaceModal = false;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      services: observable,
      currentProject: observable,
      currentSnapshotService: observable,
      groupWorkspaces: observable,
      currentGroupWorkspace: observable,
      currentWorkspaceService: observable,
      setShowCreateWorkspaceModal: action,
      resetCurrentService: action,
      resetCurrentGroupWorkspace: action,
      initialize: flow,
      loadServices: flow,
      changeService: flow,
      changeWorkspace: flow,
      createWorkspace: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
  }

  resetCurrentService(): void {
    this.currentProject = undefined;
    this.currentSnapshotService = undefined;
    this.resetCurrentGroupWorkspace();
    this.applicationStore.navigator.goTo(
      generateServiceQueryUpdaterSetupRoute(undefined, undefined, undefined),
    );
  }

  resetCurrentGroupWorkspace(): void {
    this.currentGroupWorkspace = undefined;
    this.currentWorkspaceService = undefined;
  }

  *initialize(serviceCoordinates: string | undefined): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();

    try {
      if (serviceCoordinates) {
        const { groupId, artifactId, servicePath } =
          parseServiceCoordinates(serviceCoordinates);
        yield flowResult(this.changeService(groupId, artifactId, servicePath));
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.initState.fail();
    }
  }

  *loadServices(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= MINIMUM_SERVICE_LOADER_SEARCH_LENGTH;
    this.loadServicesState.inProgress();
    try {
      this.services = (
        (yield this.depotServerClient.getEntitiesByClassifierPath(
          CORE_PURE_PATH.SERVICE,
          {
            search: isValidSearchString ? searchText : undefined,
            // NOTE: since this mode is meant for contribution, we want to load services
            // on the snapshot version (i.e. merged to the default branch on the projects)
            scope: DepotScope.SNAPSHOT,
            limit: DEFAULT_SERVICE_LOADER_LIMIT,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => extractServiceInfo(storedEntity));
      this.loadServicesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      this.loadServicesState.fail();
    }
  }

  *changeService(
    groupId: string,
    artifactId: string,
    servicePath: string,
  ): GeneratorFn<void> {
    this.loadWorkspacesState.inProgress();

    try {
      const project = ProjectData.serialization.fromJson(
        (yield this.depotServerClient.getProject(
          groupId,
          artifactId,
        )) as PlainObject<ProjectData>,
      );

      this.currentProject = project;

      const serviceEntity = (yield this.depotServerClient.getEntity(
        project,
        MASTER_SNAPSHOT_ALIAS,
        servicePath,
      )) as Entity;
      this.currentSnapshotService = extractServiceInfo({
        groupId: groupId,
        artifactId: artifactId,
        versionId: MASTER_SNAPSHOT_ALIAS,
        entity: serviceEntity,
      });

      this.applicationStore.navigator.goTo(
        generateServiceQueryUpdaterSetupRoute(
          project.groupId,
          project.artifactId,
          servicePath,
        ),
      );

      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          project.projectId,
        )) as Workspace[]
      ).map((workspace) => workspace.workspaceId);

      this.groupWorkspaces = (
        (yield this.sdlcServerClient.getWorkspaces(
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
          this.changeWorkspace(
            guaranteeNonNullable(this.groupWorkspaces[0]),
            servicePath,
          ),
        );
      }

      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
      this.loadWorkspacesState.fail();
    }
  }

  *changeWorkspace(
    workspace: Workspace,
    servicePath: string,
  ): GeneratorFn<void> {
    this.currentGroupWorkspace = workspace;

    try {
      this.currentWorkspaceService = (yield flowResult(
        this.sdlcServerClient.getWorkspaceEntity(workspace, servicePath),
      )) as Entity;
    } catch {
      this.currentWorkspaceService = undefined;
    }
  }

  *createWorkspace(
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
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
      if (!matchingGroupWorkspace) {
        this.groupWorkspaces.push(newGroupWorkspace);
        this.changeWorkspace(newGroupWorkspace);
      } else {
        this.changeWorkspace(matchingGroupWorkspace);
      }

      this.setShowCreateWorkspaceModal(false);
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
