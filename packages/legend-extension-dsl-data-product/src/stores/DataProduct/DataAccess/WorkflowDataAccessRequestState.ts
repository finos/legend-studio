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
  type V1_RawWorkflowTask,
  type V1_WorkflowTaskSummary,
  V1_AccessPointGroupReference,
  V1_DataOwnerApprovalTask,
  V1_PrivilegeManagerApprovalTask,
  V1_RequestState,
  V1_ResourceType,
  V1_WorkflowTaskAction,
  V1_WorkflowTaskStatus,
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_workflowProcessInstanceModelSchema,
  V1_workflowTaskModelSchema,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  LakehouseContractServerClient,
  LakehouseWorkflowServerClient,
} from '@finos/legend-server-lakehouse';
import { deserialize } from 'serializr';
import {
  DataAccessRequestStatus,
  type DataAccessRequestState,
  type TimelineStep,
} from './DataAccessRequestState.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../../DataProductDataAccess_LegendApplicationPlugin_Extension.js';

export interface WorkflowTasksState {
  privilegeManagerTask: V1_RawWorkflowTask | undefined;
  dataOwnerTask: V1_RawWorkflowTask | undefined;
}

export enum V1_RawWorkflowTaskType {
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
    });

    this.dataAccessRequestId = dataAccessRequestId;
    this.dataRequestWithWorkflow = undefined;
    this.workflowTasks = {
      privilegeManagerTask: undefined,
      dataOwnerTask: undefined,
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
    const { privilegeManagerTask, dataOwnerTask } = this.workflowTasks;
    if (privilegeManagerTask || dataOwnerTask) {
      return [privilegeManagerTask, dataOwnerTask].some(
        (task) => task !== undefined && !task.completed,
      );
    }
    const workflows = guaranteeNonNullable(
      this.dataRequestWithWorkflow,
    ).workflows;
    return workflows.some((wf) =>
      wf.tasks.some((task) => task.status === V1_WorkflowTaskStatus.OPEN),
    );
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

    const workflow = guaranteeNonNullable(this.dataRequestWithWorkflow)
      .workflows[0];
    if (!workflow) {
      return [
        {
          key: 'submitted',
          status: 'complete' as const,
          label: { title: 'Submitted' },
        },
        {
          key: 'complete',
          status: 'upcoming' as const,
          label: { title: 'Complete' },
        },
      ];
    }

    const pmTask = workflow.tasks.find(
      (t) => t instanceof V1_PrivilegeManagerApprovalTask,
    );
    const doTask = workflow.tasks.find(
      (t) => t instanceof V1_DataOwnerApprovalTask,
    );

    // Look up workflow server tasks for source-of-truth status/assignees
    const pmWorkflowTask = this.workflowTasks.privilegeManagerTask;
    const doWorkflowTask = this.workflowTasks.dataOwnerTask;

    // Helper to get effective assignees: prefer workflow server, fall back to dataRequestWithWorkflow
    const getEffectiveAssignees = (
      task:
        | V1_PrivilegeManagerApprovalTask
        | V1_DataOwnerApprovalTask
        | undefined,
      workflowTask: V1_RawWorkflowTask | undefined,
    ): string[] | undefined => {
      if (workflowTask && workflowTask.potentialAssignees.length > 0) {
        return workflowTask.potentialAssignees;
      }
      return task?.assignees;
    };

    const getTaskStepStatus = (
      task:
        | V1_PrivilegeManagerApprovalTask
        | V1_DataOwnerApprovalTask
        | undefined,
      fallback: 'skipped' | 'upcoming',
    ): 'active' | 'complete' | 'denied' | 'skipped' | 'upcoming' => {
      if (!task) {
        return fallback;
      }
      if (task.status === V1_WorkflowTaskStatus.OPEN) {
        return 'active';
      }
      if (task.action === V1_WorkflowTaskAction.APPROVED) {
        return 'complete';
      }
      if (task.action === V1_WorkflowTaskAction.REJECTED) {
        return 'denied';
      }
      if (
        task.status === V1_WorkflowTaskStatus.CLOSED ||
        task.status === V1_WorkflowTaskStatus.OBSOLETE
      ) {
        return 'complete';
      }
      return fallback;
    };

    const pmStepStatus = getTaskStepStatus(pmTask, 'skipped');
    const doStepStatus = getTaskStepStatus(doTask, 'upcoming');

    const isEscalated = pmTask?.action === V1_WorkflowTaskAction.ESCALATED;
    const showEscalateButton =
      pmStepStatus === 'active' &&
      _selectedTargetUser === this.applicationStore.identityService.currentUser;
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
          link: pmStepStatus === 'active' ? pmTask?.url : undefined,
          showEscalateButton,
          isEscalatable,
          isEscalated,
        },
        status: pmStepStatus,
        assignees:
          pmStepStatus === 'active'
            ? getEffectiveAssignees(pmTask, pmWorkflowTask)
            : undefined,
        approvalPayload:
          pmTask && pmStepStatus !== 'active' && pmStepStatus !== 'skipped'
            ? {
                status:
                  pmTask.action === V1_WorkflowTaskAction.APPROVED
                    ? 'APPROVED'
                    : 'DENIED',
                approvalTimestamp: pmTask.actionedOn?.toISOString(),
                approverId: pmTask.actionedBy,
              }
            : undefined,
      },
      {
        key: 'data-producer-approval',
        label: {
          title: 'Data Producer Approval',
          link: doStepStatus === 'active' ? doTask?.url : undefined,
        },
        status: doStepStatus,
        assignees:
          doStepStatus === 'active'
            ? getEffectiveAssignees(doTask, doWorkflowTask)
            : undefined,
        approvalPayload:
          doTask && doStepStatus !== 'active' && doStepStatus !== 'upcoming'
            ? {
                status:
                  doTask.action === V1_WorkflowTaskAction.APPROVED
                    ? 'APPROVED'
                    : 'DENIED',
                approvalTimestamp: doTask.actionedOn?.toISOString(),
                approverId: doTask.actionedBy,
              }
            : undefined,
      },
      {
        key: 'complete',
        status:
          doTask?.action === V1_WorkflowTaskAction.APPROVED
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

  private async collectTaskSummaries(
    processInstanceId: string,
    token: string | undefined,
  ): Promise<V1_WorkflowTaskSummary[]> {
    const rawProcessInstance =
      await this.lakehouseWorkflowServerClient.getProcessInstance(
        processInstanceId,
        token,
      );
    const processInstance = deserialize(
      V1_workflowProcessInstanceModelSchema,
      rawProcessInstance,
    );

    const childResults = await Promise.all(
      processInstance.childProcessInstances.map((child) =>
        this.collectTaskSummaries(child.processInstanceId, token),
      ),
    );

    return [...processInstance.taskSummaries, ...childResults.flat()];
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();

      // Step 1: Fetch the data request with workflow, retrying if workflows are empty
      let refreshed: V1_DataRequestWithWorkflow | undefined;
      // eslint-disable-next-line no-constant-condition
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

      // Step 2: Recursively collect task summaries via process instances
      const allTaskSummaries = (yield Promise.all(
        refreshed.workflows.map((wf) =>
          this.collectTaskSummaries(wf.workflowId, token),
        ),
      )) as V1_WorkflowTaskSummary[][];
      const taskSummaries = allTaskSummaries.flat();

      // Step 3: Fetch full task details in parallel
      const rawTasks = (yield Promise.all(
        taskSummaries.map((ts) =>
          this.lakehouseWorkflowServerClient.getTask(ts.taskId, token),
        ),
      )) as PlainObject<V1_RawWorkflowTask>[];

      const deserializedTasks = rawTasks.map((rawTask) =>
        deserialize(V1_workflowTaskModelSchema, rawTask),
      );

      // Step 4: Categorize tasks using plugin extension
      const plugins =
        this.applicationStore.pluginManager.getApplicationPlugins() as DataProductDataAccess_LegendApplicationPlugin_Extension[];

      const result: WorkflowTasksState = {
        privilegeManagerTask: undefined,
        dataOwnerTask: undefined,
      };

      for (const task of deserializedTasks) {
        let taskType: V1_RawWorkflowTaskType | undefined;
        for (const plugin of plugins) {
          taskType = plugin.getRawWorkflowTaskType?.(task);
          if (taskType !== undefined) {
            break;
          }
        }

        if (taskType === undefined) {
          continue;
        }

        // Step 5 & 6: Determine target key and pick latest by createdDate
        const key: 'privilegeManagerTask' | 'dataOwnerTask' =
          taskType === V1_RawWorkflowTaskType.PRIVILEGE_MANAGER
            ? 'privilegeManagerTask'
            : 'dataOwnerTask';
        const existing = result[key];
        if (
          !existing ||
          new Date(task.createdDate).getTime() >
            new Date(existing.createdDate).getTime()
        ) {
          result[key] = task;
        }
      }

      this.setWorkflowTasks(result);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }

  getContractUserType(_userId: string): V1_UserType | undefined {
    return this.contractMembers.find((m) => m.user.name === _userId)?.user
      .userType;
  }
}
