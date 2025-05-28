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
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  type LegendStudioApplicationStore,
  type ServiceRegistrationEnvironmentConfig,
  EditorStore,
  LEGEND_STUDIO_APP_EVENT,
  MINIMUM_SERVICE_OWNERS,
  generateServiceManagementUrl,
  pureExecution_setFunction,
} from '@finos/legend-application-studio';
import {
  type Service,
  PureExecution,
  ServiceExecutionMode,
  type ServiceRegistrationSuccess,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  type QueryBuilderWorkflowState,
  type QueryBuilderActionConfig,
  ServiceQueryBuilderState,
} from '@finos/legend-query-builder';
import {
  type DepotServerClient,
  StoreProjectData,
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
  ActionState,
  assertTrue,
  assertNonEmptyString,
  guaranteeType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { parseServiceCoordinates } from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';

type ProjectServiceCoordinates = {
  projectId: string;
  groupWorkspaceId: string;
  servicePath: string;
};

export abstract class ServiceQueryEditorStore extends EditorStore {
  queryBuilderState?: QueryBuilderState | undefined;
  _service?: Service | undefined;
  showNewServiceModal = false;

  showServiceRegistrationModal = false;
  registerServiceState = ActionState.create();
  readonly serviceRegistrationEnvConfigs: ServiceRegistrationEnvironmentConfig[] =
    [];
  currentServiceRegistrationEnvConfig?:
    | ServiceRegistrationEnvironmentConfig
    | undefined;

  showSubmitReviewModal = false;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, sdlcServerClient, depotServerClient);

    makeObservable(this, {
      queryBuilderState: observable,
      _service: observable,
      service: computed,
      showNewServiceModal: observable,
      showServiceRegistrationModal: observable,
      currentServiceRegistrationEnvConfig: observable,
      showSubmitReviewModal: observable,
      setCurrentServiceRegistrationEnvConfig: action,
      setShowNewServiceModal: action,
      setShowServiceRegistrationModal: action,
      setShowSubmitReviewModal: observable,
      initializeWithServiceQuery: flow,
      saveWorkspace: flow,
      recreateWorkspace: flow,
      registerService: flow,
    });

    this.serviceRegistrationEnvConfigs =
      this.applicationStore.config.options.TEMPORARY__serviceRegistrationConfig.filter(
        (config) =>
          config.modes.includes(ServiceExecutionMode.SEMI_INTERACTIVE),
      );
    if (this.serviceRegistrationEnvConfigs.length) {
      this.currentServiceRegistrationEnvConfig =
        this.serviceRegistrationEnvConfigs[0];
    }
  }

  get service(): Service {
    return guaranteeNonNullable(
      this._service,
      `Service query editor store has not been initialized properly`,
    );
  }

  setShowNewServiceModal(val: boolean): void {
    this.showNewServiceModal = val;
  }

  setShowServiceRegistrationModal(val: boolean): void {
    this.showServiceRegistrationModal = val;
  }

  setCurrentServiceRegistrationEnvConfig(
    val: ServiceRegistrationEnvironmentConfig | undefined,
  ): void {
    this.currentServiceRegistrationEnvConfig = val;
  }

  setShowSubmitReviewModal(val: boolean): void {
    this.showSubmitReviewModal = val;
  }

  abstract fetchServiceInformation(): Promise<ProjectServiceCoordinates>;

  *initializeWithServiceQuery(
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
  ): GeneratorFn<void> {
    try {
      const serviceInfo =
        (yield this.fetchServiceInformation()) as ProjectServiceCoordinates;

      yield flowResult(
        this.initialize(
          serviceInfo.projectId,
          undefined,
          serviceInfo.groupWorkspaceId,
          WorkspaceType.GROUP,
          undefined,
        ),
      );

      // initialize the query builder state
      this._service = this.graphManagerState.graph.getService(
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
        workflow,
        actionConfig,
        this.service,
        undefined,
        undefined,
        undefined,
        undefined,
        this.applicationStore.config.options.queryBuilderConfig,
      );

      // leverage initialization of query builder state to ensure we handle unsupported queries
      queryBuilderState.initializeWithQuery(this.service.execution.func);
      this.queryBuilderState = queryBuilderState;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
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
    this.applicationStore.alertService.setBlockingAlert({
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
        classifierPath: serviceEntity.classifierPath,
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

      this.applicationStore.logService.info(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__SUCCESS),
      );

      onSuccess?.();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.CONFLICT
      ) {
        // NOTE: a confict here indicates that the reference revision ID sent along with update call
        // does not match the HEAD of the workspace, therefore, we need to prompt user to refresh the application
        this.applicationStore.notificationService.notifyWarning(
          `Can't save workspace: current workspace revision is not the latest; please backup your work and refresh the application`,
        );
      } else {
        this.applicationStore.notificationService.notifyError(error);
      }
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.localChangesState.pushChangesState.complete();
    }
  }

  *recreateWorkspace(): GeneratorFn<void> {
    try {
      this.applicationStore.alertService.setBlockingAlert({
        message: 'Recreating workspace...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.sdlcServerClient.deleteWorkspace(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
      );
      yield this.sdlcServerClient.createWorkspace(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activePatch?.patchReleaseVersionId.id,
        this.sdlcState.activeWorkspace.workspaceId,
        this.sdlcState.activeWorkspace.workspaceType,
      );
      this.applicationStore.navigationService.navigator.reload();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
    }
  }

  updateServiceQuery(): void {
    assertNonNullable(
      this.queryBuilderState,
      `Service query editor store has not been initialized properly`,
    );
    pureExecution_setFunction(
      guaranteeType(this.service.execution, PureExecution),
      this.queryBuilderState.buildQuery(),
    );
  }

  *registerService(overridePattern?: string | undefined): GeneratorFn<void> {
    const registrationConfig = this.currentServiceRegistrationEnvConfig;
    if (registrationConfig) {
      try {
        this.registerServiceState.inProgress();

        // make sure the service query is updated
        this.updateServiceQuery();

        // validate owners
        this.service.owners.forEach((owner) =>
          assertNonEmptyString(owner, `Service can't have an empty owner name`),
        );
        assertTrue(
          this.service.owners.length >= MINIMUM_SERVICE_OWNERS,
          `Service needs to have at least 2 owners in order to be registered`,
        );

        this.registerServiceState.setMessage(`Registering service...`);
        const serviceRegistrationResult =
          (yield this.graphManagerState.graphManager.registerService(
            this.service,
            this.graphManagerState.graph,
            this.projectConfigurationEditorState.currentProjectConfiguration
              .groupId,
            this.projectConfigurationEditorState.currentProjectConfiguration
              .artifactId,
            undefined, // if not specified, we will use the latest revision version (i.e. SNAPSHOT/HEAD)
            registrationConfig.executionUrl,
            ServiceExecutionMode.SEMI_INTERACTIVE,
            {
              TEMPORARY__semiInteractiveOverridePattern: overridePattern,
            },
          )) as ServiceRegistrationSuccess;

        this.registerServiceState.setMessage(`Activating service...`);
        yield this.graphManagerState.graphManager.activateService(
          registrationConfig.executionUrl,
          serviceRegistrationResult.serviceInstanceId,
        );
        this.setShowServiceRegistrationModal(false);

        assertNonEmptyString(
          serviceRegistrationResult.pattern,
          'Service registration pattern is missing or empty',
        );

        this.applicationStore.alertService.setActionAlertInfo({
          message: `Service with pattern ${serviceRegistrationResult.pattern} registered and activated`,
          prompt:
            'You can now launch and monitor the operation of your service',
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: 'Launch Service',
              type: ActionAlertActionType.PROCEED,
              handler: (): void => {
                this.applicationStore.navigationService.navigator.visitAddress(
                  generateServiceManagementUrl(
                    registrationConfig.managementUrl,
                    serviceRegistrationResult.pattern,
                  ),
                );
              },
              default: true,
            },
            {
              label: 'Close',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            },
          ],
        });
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyError(error);
      } finally {
        this.registerServiceState.reset();
        this.registerServiceState.setMessage(undefined);
      }
    }
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
    const project = StoreProjectData.serialization.fromJson(
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
