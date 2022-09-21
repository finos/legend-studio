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

import {
  type LegendStudioApplicationStore,
  EditorStore,
  LEGEND_STUDIO_APP_EVENT,
} from '@finos/legend-application-studio';
import {
  type Service,
  GraphManagerState,
  PureExecution,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  ServiceQueryBuilderState,
} from '@finos/legend-query-builder';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import {
  type SDLCServerClient,
  type Revision,
  WorkspaceType,
  EntityChangeType,
} from '@finos/legend-server-sdlc';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  assertType,
  LogEvent,
  HttpStatus,
  NetworkClientError,
  assertNonNullable,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { parseServiceCoordinates } from './DSL_Service_LegendStudioRouter.js';

type ProjectServiceCoordinates = {
  projectId: string;
  groupWorkspaceId: string;
  servicePath: string;
};

export abstract class ServiceQueryEditorStore extends EditorStore {
  queryBuilderState?: QueryBuilderState | undefined;
  service?: Service | undefined;
  showNewServiceModal = false;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    const graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    super(
      applicationStore,
      sdlcServerClient,
      depotServerClient,
      graphManagerState,
    );

    makeObservable(this, {
      queryBuilderState: observable,
      service: observable,
      showNewServiceModal: observable,
      setShowNewServiceModal: action,
      initializeWithServiceQuery: flow,
      saveWorkspace: flow,
    });
  }

  setShowNewServiceModal(val: boolean): void {
    this.showNewServiceModal = val;
  }

  abstract fetchServiceInformation(): Promise<ProjectServiceCoordinates>;

  *initializeWithServiceQuery(): GeneratorFn<void> {
    try {
      const serviceInfo =
        (yield this.fetchServiceInformation()) as ProjectServiceCoordinates;

      yield flowResult(
        this.initialize(
          serviceInfo.projectId,
          serviceInfo.groupWorkspaceId,
          WorkspaceType.GROUP,
        ),
      );

      // initialize the query builder state
      this.service = this.graphManagerState.graph.getService(
        serviceInfo.servicePath,
      );

      assertType(
        this.service.execution,
        PureExecution,
        `Can't process service execution: only Pure execution is supported`,
      );

      const queryBuilderState = new ServiceQueryBuilderState(
        this.applicationStore,
        this.graphManagerState,
        this.service,
        undefined,
      );

      // leverage initialization of query builder state to ensure we handle unsupported queries
      queryBuilderState.initializeWithQuery(this.service.execution.func);

      this.queryBuilderState = queryBuilderState;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
    }
  }

  *saveWorkspace(
    serviceEntity: Entity,
    createNew: boolean,
    onSuccess?: () => void,
  ): GeneratorFn<void> {
    if (
      !this.queryBuilderState ||
      this.localChangesState.pushChangesState.isInProgress ||
      this.workspaceUpdaterState.isUpdatingWorkspace
    ) {
      return;
    }

    this.localChangesState.pushChangesState.inProgress();
    this.applicationStore.setBlockingAlert({
      message: `Saving workspace...`,
      prompt: 'Please do not close the application',
      showLoading: true,
    });

    try {
      yield flowResult(
        this.sdlcState.fetchRemoteWorkspaceRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
        ),
      );
      if (this.sdlcState.isWorkspaceOutOfSync) {
        return;
      }

      // push the changes
      // NOTE: change detection in query-builder should be enough
      // to make sure that this change is valid
      const entityChange = {
        classifierPath: CORE_PURE_PATH.SERVICE,
        entityPath: serviceEntity.path,
        content: serviceEntity.content,
        type: createNew ? EntityChangeType.CREATE : EntityChangeType.MODIFY,
      };

      const nullableRevisionChange =
        (yield this.sdlcServerClient.performEntityChanges(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          {
            message: `updated service ${serviceEntity.path} query`,
            entityChanges: [entityChange],
            revisionId: this.sdlcState.activeRevision.id,
          },
        )) as PlainObject<Revision> | undefined;
      assertNonNullable(
        nullableRevisionChange,
        `Can't save workspace: empty change set was pushed - this may be due to an error with change detection`,
      );

      this.applicationStore.log.info(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_LOCAL_CHANGES_PUSHED),
      );

      onSuccess?.();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.CONFLICT
      ) {
        // NOTE: a confict here indicates that the reference revision ID sent along with update call
        // does not match the HEAD of the workspace, therefore, we need to prompt user to refresh the application
        this.applicationStore.notifyWarning(
          `Can't save workspace: current workspace revision is not the latest; please backup your work and refresh the application`,
        );
      } else {
        this.applicationStore.notifyError(error);
      }
    } finally {
      this.applicationStore.setBlockingAlert(undefined);
      this.localChangesState.pushChangesState.complete();
    }

    // do something
  }
}

export class ServiceQueryUpdaterStore extends ServiceQueryEditorStore {
  readonly serviceCoordinates: string;
  readonly groupWorkspaceId: string;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    serviceCoordinates: string,
    groupWorkspaceId: string,
  ) {
    super(applicationStore, sdlcServerClient, depotServerClient);

    this.serviceCoordinates = serviceCoordinates;
    this.groupWorkspaceId = groupWorkspaceId;
  }

  async fetchServiceInformation(): Promise<ProjectServiceCoordinates> {
    const { groupId, artifactId, servicePath } = parseServiceCoordinates(
      this.serviceCoordinates,
    );
    const project = ProjectData.serialization.fromJson(
      await this.depotServerClient.getProject(groupId, artifactId),
    );

    return {
      projectId: project.projectId,
      groupWorkspaceId: this.groupWorkspaceId,
      servicePath,
    };
  }
}

export class ProjectServiceQueryUpdaterStore extends ServiceQueryEditorStore {
  readonly projectId: string;
  readonly groupWorkspaceId: string;
  readonly servicePath: string;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    projectId: string,
    groupWorkspaceId: string,
    servicePath: string,
  ) {
    super(applicationStore, sdlcServerClient, depotServerClient);

    this.projectId = projectId;
    this.groupWorkspaceId = groupWorkspaceId;
    this.servicePath = servicePath;
  }

  async fetchServiceInformation(): Promise<ProjectServiceCoordinates> {
    return {
      projectId: this.projectId,
      groupWorkspaceId: this.groupWorkspaceId,
      servicePath: this.servicePath,
    };
  }
}
