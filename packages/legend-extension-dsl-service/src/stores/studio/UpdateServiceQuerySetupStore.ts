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
  StoreProjectData,
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
  type ProjectConfigurationStatus,
  LEGEND_STUDIO_APP_EVENT,
  fetchProjectConfigurationStatus,
} from '@finos/legend-application-studio';
import {
  generateServiceQueryUpdaterSetupRoute,
  parseServiceCoordinates,
} from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';

export class UpdateServiceQuerySetupStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;

  readonly initState = ActionState.create();
  readonly loadServicesState = ActionState.create();
  services: ServiceInfo[] = [];
  currentProject?: StoreProjectData | undefined;
  currentSnapshotService?: ServiceInfo | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;

  readonly loadWorkspacesState = ActionState.create();
  readonly createWorkspaceState = ActionState.create();
  groupWorkspaces: Workspace[] = [];
  currentGroupWorkspace?: Workspace | undefined;
  currentWorkspaceService?: Entity | undefined;
  readonly checkWorkspaceCompatibilityState = ActionState.create();
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
      showCreateWorkspaceModal: observable,
      currentProjectConfigurationStatus: observable,
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
    this.groupWorkspaces = [];
    this.resetCurrentGroupWorkspace();
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateServiceQueryUpdaterSetupRoute(undefined, undefined, undefined),
    );
    this.currentProjectConfigurationStatus = undefined;
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
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
    }
  }

  *loadServices(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadServicesState.inProgress();
    try {
      this.services = (
        (yield this.depotServerClient.DEPRECATED_getEntitiesByClassifierPath(
          CORE_PURE_PATH.SERVICE,
          {
            search: isValidSearchString ? searchText : undefined,
            // NOTE: since this mode is meant for contribution, we want to load services
            // on the snapshot version (i.e. merged to the default branch on the projects)
            scope: DepotScope.SNAPSHOT,
            limit: DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => extractServiceInfo(storedEntity));
      this.loadServicesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadServicesState.fail();
    }
  }

  *changeService(
    groupId: string,
    artifactId: string,
    servicePath: string,
  ): GeneratorFn<void> {
    this.loadWorkspacesState.inProgress();
    this.currentProjectConfigurationStatus = undefined;

    try {
      let project: StoreProjectData | undefined;
      let serviceEntity: Entity | undefined;

      try {
        project = StoreProjectData.serialization.fromJson(
          (yield this.depotServerClient.getProject(
            groupId,
            artifactId,
          )) as PlainObject<StoreProjectData>,
        );
        serviceEntity = (yield this.depotServerClient.getEntity(
          project,
          MASTER_SNAPSHOT_ALIAS,
          servicePath,
        )) as Entity;
      } catch {
        project = undefined;
        serviceEntity = undefined;
      }

      if (!project || !serviceEntity) {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateServiceQueryUpdaterSetupRoute(
            undefined,
            undefined,
            undefined,
          ),
        );
        throw Error(
          `Can't find service '${servicePath}' from project with coordinates '${generateGAVCoordinates(
            groupId,
            artifactId,
            undefined,
          )}'`,
        );
      }

      this.currentProject = project;
      this.currentProjectConfigurationStatus =
        (yield fetchProjectConfigurationStatus(
          project.projectId,
          undefined,
          this.applicationStore,
          this.sdlcServerClient,
        )) as ProjectConfigurationStatus;

      this.currentSnapshotService = extractServiceInfo({
        groupId: groupId,
        artifactId: artifactId,
        versionId: MASTER_SNAPSHOT_ALIAS,
        entity: serviceEntity,
      });

      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateServiceQueryUpdaterSetupRoute(
          project.groupId,
          project.artifactId,
          servicePath,
        ),
      );

      const workspacesInConflictResolutionIds = (
        (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
          project.projectId,
          undefined,
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
          this.changeWorkspace(
            guaranteeNonNullable(this.groupWorkspaces[0]),
            servicePath,
          ),
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

  *changeWorkspace(
    workspace: Workspace,
    servicePath: string,
  ): GeneratorFn<void> {
    this.currentGroupWorkspace = workspace;

    this.checkWorkspaceCompatibilityState.inProgress();
    try {
      this.currentWorkspaceService = (yield flowResult(
        this.sdlcServerClient.getWorkspaceEntity(workspace, servicePath),
      )) as Entity;
    } catch {
      this.currentWorkspaceService = undefined;
    }
    this.checkWorkspaceCompatibilityState.reset();
  }

  *createWorkspace(
    projectId: string,
    workspaceId: string,
    servicePath: string,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    try {
      const newGroupWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          undefined,
          workspaceId,
          WorkspaceType.GROUP,
        )) as PlainObject<Workspace>,
      );

      this.applicationStore.notificationService.notifySuccess(
        `Workspace '${newGroupWorkspace.workspaceId}' is succesfully created`,
      );

      const matchingGroupWorkspace = this.groupWorkspaces.find(
        (workspace) => workspace.workspaceId === newGroupWorkspace.workspaceId,
      );
      const groupWorkspaceToSelect =
        matchingGroupWorkspace ?? newGroupWorkspace;

      yield flowResult(
        this.changeWorkspace(groupWorkspaceToSelect, servicePath),
      );
      this.setShowCreateWorkspaceModal(false);

      // NOTE: do this after closing the modal to not interfere
      // with validation of existing workspaces in create workspace modal
      if (!matchingGroupWorkspace) {
        this.groupWorkspaces.push(newGroupWorkspace);
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
