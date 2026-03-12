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
  V1_AccessPointGroupReference,
  V1_DataOwnerApprovalTask,
  V1_PrivilegeManagerApprovalTask,
  V1_RequestState,
  V1_ResourceType,
  V1_WorkflowTaskAction,
  V1_WorkflowTaskStatus,
  V1_deserializeDataRequestsWithWorkflowResponse,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  DataAccessRequestStatus,
  type DataAccessRequestState,
  type TimelineStep,
} from './DataAccessRequestState.js';

export class WorkflowDataAccessRequestState implements DataAccessRequestState {
  dataRequestWithWorkflow: V1_DataRequestWithWorkflow;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService: UserSearchService | undefined;
  readonly subscription: V1_DataSubscription | undefined;

  readonly initializationState = ActionState.create();
  readonly escalatingState = ActionState.create();
  readonly invalidatingState = ActionState.create();

  constructor(
    dataRequestWithWorkflow: V1_DataRequestWithWorkflow,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
    graphManagerState: GraphManagerState,
    userSearchService: UserSearchService | undefined,
    subscription?: V1_DataSubscription | undefined,
  ) {
    makeObservable(this, {
      dataRequestWithWorkflow: observable,
      setDataRequestWithWorkflow: action,
      targetUsers: computed,
      isInProgress: computed,
      isInTerminalState: computed,
      status: computed,
      init: flow,
    });

    this.dataRequestWithWorkflow = dataRequestWithWorkflow;
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
    this.subscription = subscription;
  }

  // ---- Delegate getters for DataAccessRequestState ----

  get guid(): string {
    return this.dataRequestWithWorkflow.dataRequest.guid;
  }

  get description(): string {
    return this.dataRequestWithWorkflow.dataRequest.businessJustification;
  }

  get createdBy(): string {
    return this.dataRequestWithWorkflow.dataRequest.createdBy;
  }

  get createdAt(): string {
    // V1_DataRequest does not have a dedicated createdAt field;
    // fall back to the workflow's first task createdOn or current date.
    const firstWorkflow = this.dataRequestWithWorkflow.workflows[0];
    if (firstWorkflow?.tasks.length) {
      return new Date(firstWorkflow.tasks[0]!.createdOn).toISOString();
    }
    return new Date().toISOString();
  }

  get resourceId(): string {
    const resource = this.dataRequestWithWorkflow.dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.dataProduct.name;
    }
    return '';
  }

  get resourceType(): string {
    const resource = this.dataRequestWithWorkflow.dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return V1_ResourceType.ACCESS_POINT_GROUP;
    }
    return '';
  }

  get accessPointGroup(): string | undefined {
    const resource = this.dataRequestWithWorkflow.dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.accessPointGroup;
    }
    return undefined;
  }

  get deploymentId(): number {
    const resource = this.dataRequestWithWorkflow.dataRequest.resource;
    if (resource instanceof V1_AccessPointGroupReference) {
      return resource.dataProduct.owner.appDirId;
    }
    return 0;
  }

  get consumer(): V1_OrganizationalScope {
    return this.dataRequestWithWorkflow.dataRequest.consumer;
  }

  get status(): DataAccessRequestStatus {
    switch (this.dataRequestWithWorkflow.dataRequest.state) {
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
          `Unsupported request state: ${this.dataRequestWithWorkflow.dataRequest.state}`,
        );
    }
  }

  get isInTerminalState(): boolean {
    const state = this.dataRequestWithWorkflow.dataRequest.state;
    return (
      state === V1_RequestState.COMPLETED ||
      state === V1_RequestState.REJECTED ||
      state === V1_RequestState.INVALIDATED ||
      state === V1_RequestState.OBSOLETE
    );
  }

  get isInProgress(): boolean {
    const workflows = this.dataRequestWithWorkflow.workflows;
    return workflows.some((wf) =>
      wf.tasks.some((task) => task.status === V1_WorkflowTaskStatus.OPEN),
    );
  }

  get contractMembers(): V1_ContractUserMembership[] {
    return this.dataRequestWithWorkflow.dataRequest.members;
  }

  get targetUsers(): string[] | undefined {
    const members = this.dataRequestWithWorkflow.dataRequest.members;
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

    const workflow = this.dataRequestWithWorkflow.workflows[0];
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
        assignees: pmStepStatus === 'active' ? pmTask?.assignees : undefined,
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
        assignees: doStepStatus === 'active' ? doTask?.assignees : undefined,
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

  // ---- Actions ----

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      const response =
        (yield this.lakehouseContractServerClient.getDataAccessRequestWithWorkflow(
          this.guid,
          token,
        )) as PlainObject;
      const dataRequests = V1_deserializeDataRequestsWithWorkflowResponse(
        response as PlainObject,
        this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
      );
      const refreshed = dataRequests[0];
      if (refreshed) {
        this.setDataRequestWithWorkflow(refreshed);
      }
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
