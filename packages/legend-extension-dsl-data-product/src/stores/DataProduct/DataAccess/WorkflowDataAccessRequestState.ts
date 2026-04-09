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
  type GraphManagerState,
  type V1_ContractUserMembership,
  type V1_DataSubscription,
  type V1_DataRequestWithWorkflow,
  type V1_OrganizationalScope,
  type V1_UserType,
  V1_WorkflowInstance,
  V1_AccessPointGroupReference,
  V1_RequestState,
  V1_ResourceType,
  V1_DataAccessRequestWorkflowTaskAction,
  V1_DataAccessRequestWorkflowTaskStatus,
  V1_deserializeDataRequestsWithWorkflowResponse,
  type V1_WorkflowTask,
} from '@finos/legend-graph';

import {
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  LakehouseContractServerClient,
  LakehouseWorkflowServerClient,
} from '@finos/legend-server-lakehouse';
import {
  DataAccessRequestStatus,
  type DataAccessRequestState,
  type TimelineStep,
} from './DataAccessRequestState.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../../DataProductDataAccess_LegendApplicationPlugin_Extension.js';

export interface WorkflowTasksState {
  privilegeManagerTasks: V1_WorkflowTask[];
  dataOwnerTasks: V1_WorkflowTask[];
}

export enum V1_WorkflowTaskType {
  PRIVILEGE_MANAGER = 'PRIVILEGE_MAANGER',
  DATA_OWNER = 'DATA_OWNER',
}

export class WorkflowDataAccessRequestState implements DataAccessRequestState {
  readonly dataAccessRequestId: string;
  dataRequestWithWorkflow: V1_DataRequestWithWorkflow | undefined;
  workflowTasks: WorkflowTasksState;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehouseWorkflowServerClient: LakehouseWorkflowServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService: UserSearchService | undefined;
  readonly subscription: V1_DataSubscription | undefined;

  readonly initializationState = ActionState.create();
  readonly escalatingState = ActionState.create();
  readonly invalidatingState = ActionState.create();

  constructor(
    dataAccessRequestId: string,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
    lakehouseWorkflowServerClient: LakehouseWorkflowServerClient,
    graphManagerState: GraphManagerState,
    userSearchService: UserSearchService | undefined,
    subscription?: V1_DataSubscription | undefined,
  ) {
    makeObservable(this, {
      dataRequestWithWorkflow: observable,
      workflowTasks: observable,
      setDataRequestWithWorkflow: action,
      setWorkflowTasks: action,
      targetUsers: computed,
      isInProgress: computed,
      isInTerminalState: computed,
      status: computed,
      init: flow,
      escalateRequest: flow,
    });

    this.dataAccessRequestId = dataAccessRequestId;
    this.dataRequestWithWorkflow = undefined;
    this.workflowTasks = {
      privilegeManagerTasks: [],
      dataOwnerTasks: [],
    };
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.lakehouseWorkflowServerClient = lakehouseWorkflowServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
    this.subscription = subscription;
  }

  // ---- Delegate getters for DataAccessRequestState ----

  get guid(): string {
    return this.dataAccessRequestId;
  }

  get description(): string {
    return guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest
      .businessJustification;
  }

  get createdBy(): string {
    return guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest
      .createdBy;
  }

  get createdAt(): string {
    // V1_DataRequest does not have a dedicated createdAt field;
    // fall back to the workflow's first task createdOn or current date.
    const firstWorkflow = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .workflows[0];
    if (firstWorkflow?.tasks.length) {
      return new Date(
        guaranteeNonNullable(firstWorkflow.tasks[0]).createdOn,
      ).toISOString();
    }
    return new Date().toISOString();
  }

  get resourceId(): string {
    const resource = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.dataProduct.name;
    }
    return '';
  }

  get resourceType(): string {
    const resource = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return V1_ResourceType.ACCESS_POINT_GROUP;
    }
    return '';
  }

  get accessPointGroup(): string | undefined {
    const resource = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.accessPointGroup;
    }
    return undefined;
  }

  get deploymentId(): number {
    const resource = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.dataProduct.owner.appDirId;
    }
    return 0;
  }

  get consumer(): V1_OrganizationalScope {
    return guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest
      .consumer;
  }

  get status(): DataAccessRequestStatus {
    switch (
      guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest.state
    ) {
      case V1_RequestState.DRAFT:
        return DataAccessRequestStatus.DRAFT;
      case V1_RequestState.SUBMITTED_FOR_APPROVALS:
        return DataAccessRequestStatus.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL;
      case V1_RequestState.COMPLETED:
        return DataAccessRequestStatus.COMPLETED;
      case V1_RequestState.REJECTED:
        return DataAccessRequestStatus.REJECTED;
      case V1_RequestState.INVALIDATED:
      case V1_RequestState.OBSOLETE:
        return DataAccessRequestStatus.CLOSED;
      default:
        throw new Error(
          `Unsupported request state: ${guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest.state}`,
        );
    }
  }

  get isInTerminalState(): boolean {
    const state = guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest
      .state;
    return (
      state === V1_RequestState.COMPLETED ||
      state === V1_RequestState.REJECTED ||
      state === V1_RequestState.INVALIDATED ||
      state === V1_RequestState.OBSOLETE
    );
  }

  get isInProgress(): boolean {
    // Use workflow server tasks as source of truth if available
    const { privilegeManagerTasks, dataOwnerTasks } = this.workflowTasks;
    if (privilegeManagerTasks.length || dataOwnerTasks.length) {
      return [...privilegeManagerTasks, ...dataOwnerTasks].some(
        (task) => !task.completedDate,
      );
    }
    return true;
  }

  get contractMembers(): V1_ContractUserMembership[] {
    return guaranteeNonNullable(this.dataRequestWithWorkflow).dataRequest
      .members;
  }

  get targetUsers(): string[] | undefined {
    const members = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .dataRequest.members;
    if (members.length > 0) {
      return Array.from(new Set(members.map((m) => m.user.name))).sort();
    }
    return undefined;
  }

  // ---- Timeline ----

  getTimelineSteps(_selectedTargetUser: string | undefined): TimelineStep[] {
    if (this.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP) {
      return [];
    }

    // Use workflow task with latest creation date.
    const pmWorkflowTask = this.workflowTasks.privilegeManagerTasks.toSorted(
      (a, b) => b.createdDate - a.createdDate,
    )[0];
    const doWorkflowTask = this.workflowTasks.dataOwnerTasks.toSorted(
      (a, b) => b.createdDate - a.createdDate,
    )[0];

    const getTaskStepStatus = (
      task: V1_WorkflowTask | undefined,
      fallback: 'skipped' | 'upcoming',
    ): 'active' | 'complete' | 'denied' | 'skipped' | 'upcoming' => {
      if (!task) {
        return fallback;
      }
      if (task.status === V1_DataAccessRequestWorkflowTaskStatus.OPEN) {
        return 'active';
      }
      if (task.status === V1_DataAccessRequestWorkflowTaskStatus.COMPLETED) {
        if (task.completionReason === 'REJECTED') {
          return 'denied';
        }
        return 'complete';
      }
      if (
        task.status === V1_DataAccessRequestWorkflowTaskStatus.CLOSED ||
        task.status === V1_DataAccessRequestWorkflowTaskStatus.OBSOLETE
      ) {
        return 'complete';
      }
      return fallback;
    };

    const pmStepStatus = getTaskStepStatus(pmWorkflowTask, 'skipped');
    const doStepStatus = getTaskStepStatus(doWorkflowTask, 'upcoming');

    const isEscalated = this.workflowTasks.privilegeManagerTasks.some(
      (task) => task.status === 'ESCALATED',
    );
    const showEscalateButton =
      pmStepStatus === 'active' &&
      (_selectedTargetUser ===
        this.applicationStore.identityService.currentUser ||
        this.dataRequestWithWorkflow?.dataRequest.createdBy ===
          this.applicationStore.identityService.currentUser ||
        pmWorkflowTask?.assignees.includes(
          this.applicationStore.identityService.currentUser,
        ));
    const isEscalatable = showEscalateButton && !isEscalated;

    return [
      {
        key: 'submitted',
        status: 'complete' as const,
        label: { title: 'Submitted' },
      },
      {
        key: 'privilege-manager-approval',
        label: {
          title: 'Privilege Manager Approval',
          // TODO: build URL from task ID
          link: undefined,
          showEscalateButton,
          isEscalatable,
          isEscalated,
        },
        status: pmStepStatus,
        assignees:
          pmStepStatus === 'active' ? pmWorkflowTask?.assignees : undefined,
        approvalPayload:
          pmWorkflowTask &&
          pmStepStatus !== 'active' &&
          pmStepStatus !== 'skipped'
            ? {
                status:
                  pmWorkflowTask.status ===
                  V1_DataAccessRequestWorkflowTaskAction.APPROVED
                    ? 'APPROVED'
                    : 'DENIED',
                approvalTimestamp: pmWorkflowTask.completedDate
                  ? new Date(pmWorkflowTask.completedDate).toISOString()
                  : undefined,
                approverId: pmWorkflowTask.completedBy,
              }
            : undefined,
      },
      {
        key: 'data-producer-approval',
        label: {
          title: 'Data Producer Approval',
          // TODO: build URL from task ID
          link: undefined,
        },
        status: doStepStatus,
        assignees:
          doStepStatus === 'active' ? doWorkflowTask?.assignees : undefined,
        approvalPayload:
          doWorkflowTask &&
          doStepStatus !== 'active' &&
          doStepStatus !== 'upcoming'
            ? {
                status:
                  doWorkflowTask.status ===
                  V1_DataAccessRequestWorkflowTaskAction.APPROVED
                    ? 'APPROVED'
                    : 'DENIED',
                approvalTimestamp: doWorkflowTask.completedDate
                  ? new Date(doWorkflowTask.completedDate).toISOString()
                  : undefined,
                approverId: doWorkflowTask.completedBy,
              }
            : undefined,
      },
      {
        key: 'complete',
        status:
          doWorkflowTask?.status ===
          V1_DataAccessRequestWorkflowTaskAction.APPROVED
            ? ('complete' as const)
            : ('upcoming' as const),
        label: { title: 'Complete' },
      },
    ];
  }

  // ---- Mutations ----

  setDataRequestWithWorkflow(val: V1_DataRequestWithWorkflow): void {
    this.dataRequestWithWorkflow = val;
  }

  setWorkflowTasks(val: WorkflowTasksState): void {
    this.workflowTasks = val;
  }

  // ---- Actions ----

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();

      // Fetch the data request with workflow. It can take some time
      // for the workflow to be created after the data request is created,
      // so we poll until we get a workflow.
      let refreshed: V1_DataRequestWithWorkflow | undefined;

      while (true) {
        const response =
          (yield this.lakehouseContractServerClient.getDataAccessRequestWithWorkflow(
            this.dataAccessRequestId,
            token,
          )) as PlainObject;
        const dataRequests = V1_deserializeDataRequestsWithWorkflowResponse(
          response,
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        );
        refreshed = dataRequests[0];
        if (refreshed && refreshed.workflows.length > 0) {
          break;
        }
        yield new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.setDataRequestWithWorkflow(refreshed);

      // Fetch tasks associated with the workflow instance
      // We use the first non-null workflow instance
      const workflowInstanceId = guaranteeNonNullable(
        refreshed.workflows.find((wf) => wf.workflowId),
        `No workflow instance found for data access requestId ${this.dataAccessRequestId}`,
      ).workflowId;
      const rawWorkflowInstance =
        (yield this.lakehouseWorkflowServerClient.getWorkflowInstance(
          workflowInstanceId,
        )) as PlainObject<V1_WorkflowInstance>;
      const workflowInstance =
        V1_WorkflowInstance.serialization.fromJson(rawWorkflowInstance);
      const tasks =
        workflowInstance.childProcesses
          ?.flatMap((process) => process.tasks)
          ?.filter(isNonNullable) ?? [];

      // Categorize tasks using plugin extension
      const plugins =
        this.applicationStore.pluginManager.getApplicationPlugins() as DataProductDataAccess_LegendApplicationPlugin_Extension[];

      const result: WorkflowTasksState = {
        privilegeManagerTasks: [],
        dataOwnerTasks: [],
      };

      for (const task of tasks) {
        let taskType: V1_WorkflowTaskType | undefined;
        for (const plugin of plugins) {
          taskType = plugin.getWorkflowTaskType?.(task);
          if (taskType !== undefined) {
            break;
          }
        }

        if (taskType === undefined) {
          continue;
        }

        // Determine target key and append task
        const key: 'privilegeManagerTasks' | 'dataOwnerTasks' =
          taskType === V1_WorkflowTaskType.PRIVILEGE_MANAGER
            ? 'privilegeManagerTasks'
            : 'dataOwnerTasks';
        const existing = result[key];
        existing.push(task);
      }

      this.setWorkflowTasks(result);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to load data access request with workflow`,
        error.message,
      );
    } finally {
      this.initializationState.complete();
    }
  }

  getContractUserType(_userId: string): V1_UserType | undefined {
    return this.contractMembers.find((m) => m.user.name === _userId)?.user
      .userType;
  }

  *escalateRequest(): GeneratorFn<void> {
    try {
      this.escalatingState.inProgress();
      const taskToEscalate = guaranteeNonNullable(
        this.workflowTasks.privilegeManagerTasks.find(
          (t) => t.status === 'OPEN',
        ),
        'Unable to find active privilege manager task to escalate',
      );
      yield this.lakehouseWorkflowServerClient.actionTask(
        taskToEscalate.processInstanceId,
        taskToEscalate.taskId,
        'ESCALATE',
        '', // Justification not required for escalate requests
      );

      this.applicationStore.notificationService.notifySuccess(
        'Contract escalated successfully',
      );
    } finally {
      this.escalatingState.complete();
    }
  }
}
