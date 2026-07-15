/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type V1_ContractUserMembership,
  type V1_DataRequestWithWorkflow,
  type V1_DataSubscription,
  type V1_OrganizationalScope,
  type V1_UserType,
  type V1_WorkflowTask,
  V1_AccessPointGroupReference,
  V1_DataOwnerApprovalTask,
  V1_PrivilegeManagerApprovalTask,
  V1_RequestState,
  V1_ResourceType,
  V1_WorkflowTaskAction,
  V1_WorkflowTaskStatus,
  type V1_PermitProcessInstanceDetail,
  type V1_PermitProcessInstanceTask,
  V1_PermitTaskAction,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type LakehouseContractServerClient,
  type PermitWorkflowServerClient,
} from '@finos/legend-server-lakehouse';
import {
  DataAccessRequestStatus,
  TimelineStepStatus,
  type DataAccessRequestState,
  type TimelineStep,
} from './DataAccessRequestState.js';

// -------------------------------- Options --------------------------------

export type PermitDataAccessRequestStateOptions = {
  initialData?: V1_DataRequestWithWorkflow;
  fetchFresh?: (
    token: string | undefined,
  ) => Promise<V1_DataRequestWithWorkflow | undefined>;
  authServerClient?: LakehouseContractServerClient;
  getTaskPageUrl?: (dataAccessRequestId: string) => string;
};

// -------------------------------- Permit overlay helpers --------------------------------

const VALID_WORKFLOW_TASK_STATUSES = new Set<string>(
  Object.values(V1_WorkflowTaskStatus),
);

const parseWorkflowTaskStatus = (
  raw: string,
): V1_WorkflowTaskStatus | undefined => {
  if (VALID_WORKFLOW_TASK_STATUSES.has(raw)) {
    return raw as V1_WorkflowTaskStatus;
  }
  return undefined;
};

const collectPermitTasks = (
  detail: V1_PermitProcessInstanceDetail,
): V1_PermitProcessInstanceTask[] => {
  const raw = detail as Partial<{
    tasks: V1_PermitProcessInstanceTask[];
    childProcesses: { tasks?: V1_PermitProcessInstanceTask[] }[];
  }>;
  return [
    ...(raw.tasks ?? []),
    ...(raw.childProcesses ?? []).flatMap((cp) => cp.tasks ?? []),
  ];
};

const mapCompletionReasonToAction = (
  reason: string | undefined,
): V1_WorkflowTaskAction | undefined => {
  switch (reason) {
    case 'Escalated':
      return V1_WorkflowTaskAction.ESCALATED;
    case 'Rejected':
      return V1_WorkflowTaskAction.REJECTED;
    case 'Approved':
      return V1_WorkflowTaskAction.APPROVED;
    default:
      return undefined;
  }
};

const getStepStatus = (
  task: { status: string; action?: string } | undefined,
  fallback: TimelineStepStatus.SKIPPED | TimelineStepStatus.UPCOMING,
): TimelineStepStatus => {
  if (!task) {
    return fallback;
  }
  if (task.status === V1_WorkflowTaskStatus.OPEN) {
    return TimelineStepStatus.ACTIVE;
  }
  if (
    task.action === V1_WorkflowTaskAction.REJECTED ||
    task.action === V1_WorkflowTaskAction.OBSOLETE
  ) {
    return TimelineStepStatus.DENIED;
  }
  // Not open and not rejected/obsolete — any terminal status/action means complete
  if (
    task.status === V1_WorkflowTaskStatus.COMPLETED ||
    task.status === V1_WorkflowTaskStatus.CLOSED ||
    task.status === V1_WorkflowTaskStatus.OBSOLETE ||
    task.action === V1_WorkflowTaskAction.APPROVED ||
    task.action === V1_WorkflowTaskAction.ESCALATED
  ) {
    return TimelineStepStatus.COMPLETE;
  }
  return fallback;
};

const buildApprovalPayload = (
  task: V1_WorkflowTask | undefined,
  stepStatus: TimelineStepStatus,
  excludedStatuses: TimelineStepStatus[],
):
  | { status: string; approvalTimestamp?: string; approverId?: string }
  | undefined => {
  if (!task || excludedStatuses.includes(stepStatus)) {
    return undefined;
  }
  const isObsolete = task.action === V1_WorkflowTaskAction.OBSOLETE;
  const payload: {
    status: string;
    approvalTimestamp?: string;
    approverId?: string;
  } = {
    status: isObsolete
      ? 'OBSOLETE'
      : task.action === V1_WorkflowTaskAction.APPROVED
        ? 'APPROVED'
        : 'DENIED',
  };
  let ts: string | undefined;
  if (task.actionedOn) {
    ts =
      task.actionedOn instanceof Date
        ? task.actionedOn.toISOString()
        : task.actionedOn;
  }
  if (ts !== undefined) {
    payload.approvalTimestamp = ts;
  }
  // Don't show service-account approver for obsolete tasks
  if (task.actionedBy !== undefined && !isObsolete) {
    payload.approverId = task.actionedBy;
  }
  return payload;
};

// -------------------------------- State --------------------------------

export class PermitDataAccessRequestState implements DataAccessRequestState {
  readonly dataAccessRequestId: string;
  dataRequestWithWorkflow: V1_DataRequestWithWorkflow | undefined;

  readonly applicationStore: GenericLegendApplicationStore;
  readonly permitClient: PermitWorkflowServerClient | undefined;
  readonly authServerClient: LakehouseContractServerClient | undefined;
  readonly userSearchService: UserSearchService | undefined;
  readonly subscription: V1_DataSubscription | undefined = undefined;
  readonly fetchFresh:
    | ((
        token: string | undefined,
      ) => Promise<V1_DataRequestWithWorkflow | undefined>)
    | undefined;
  readonly getTaskPageUrl:
    | ((dataAccessRequestId: string) => string)
    | undefined;

  readonly initializationState = ActionState.create();
  readonly escalatingState = ActionState.create();
  readonly invalidatingState = ActionState.create();
  readonly taskActionState = ActionState.create();

  constructor(
    dataAccessRequestId: string,
    applicationStore: GenericLegendApplicationStore,
    permitClient: PermitWorkflowServerClient | undefined,
    userSearchService: UserSearchService | undefined,
    options?: PermitDataAccessRequestStateOptions,
  ) {
    makeObservable(this, {
      dataRequestWithWorkflow: observable,
      setDataRequestWithWorkflow: action,
      targetUsers: computed,
      isInProgress: computed,
      isInTerminalState: computed,
      status: computed,
      init: flow,
      escalateRequest: flow,
      invalidateRequest: flow,
      performTaskAction: flow,
    });

    this.dataAccessRequestId = dataAccessRequestId;
    this.applicationStore = applicationStore;
    this.permitClient = permitClient;
    this.userSearchService = userSearchService;
    this.authServerClient = options?.authServerClient;
    this.fetchFresh = options?.fetchFresh;
    this.getTaskPageUrl = options?.getTaskPageUrl;

    if (options?.initialData) {
      this.dataRequestWithWorkflow = options.initialData;
    }
    if (
      this.dataRequestWithWorkflow &&
      !this.fetchFresh &&
      !this.permitClient
    ) {
      this.initializationState.complete();
    }
  }

  setDataRequestWithWorkflow(val: V1_DataRequestWithWorkflow): void {
    this.dataRequestWithWorkflow = val;
  }

  get guid(): string {
    return this.dataAccessRequestId;
  }

  get description(): string {
    return (
      this.dataRequestWithWorkflow?.dataRequest.businessJustification ?? ''
    );
  }

  get createdBy(): string {
    return this.dataRequestWithWorkflow?.dataRequest.createdBy ?? '';
  }

  get createdAt(): string {
    const firstTask = this.dataRequestWithWorkflow?.workflows[0]?.tasks[0];
    if (firstTask) {
      return new Date(firstTask.createdOn).toISOString();
    }
    return new Date().toISOString();
  }

  get resourceId(): string {
    const resource = this.dataRequestWithWorkflow?.dataRequest.resource;
    return resource instanceof V1_AccessPointGroupReference
      ? resource.dataProduct.name
      : '';
  }

  get resourceType(): string {
    const resource = this.dataRequestWithWorkflow?.dataRequest.resource;
    return resource instanceof V1_AccessPointGroupReference
      ? V1_ResourceType.ACCESS_POINT_GROUP
      : '';
  }

  get accessPointGroup(): string | undefined {
    const resource = this.dataRequestWithWorkflow?.dataRequest.resource;
    return resource instanceof V1_AccessPointGroupReference
      ? resource.accessPointGroup
      : undefined;
  }

  get deploymentId(): number {
    const resource = this.dataRequestWithWorkflow?.dataRequest.resource;
    return resource instanceof V1_AccessPointGroupReference
      ? resource.dataProduct.owner.appDirId
      : 0;
  }

  get consumer(): V1_OrganizationalScope {
    return guaranteeNonNullable(
      this.dataRequestWithWorkflow?.dataRequest.consumer,
    );
  }

  get status(): DataAccessRequestStatus {
    switch (this.dataRequestWithWorkflow?.dataRequest.state) {
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
        return DataAccessRequestStatus.DRAFT;
    }
  }

  get isInTerminalState(): boolean {
    const state = this.dataRequestWithWorkflow?.dataRequest.state;
    return (
      state === V1_RequestState.COMPLETED ||
      state === V1_RequestState.REJECTED ||
      state === V1_RequestState.INVALIDATED ||
      state === V1_RequestState.OBSOLETE
    );
  }

  get isInProgress(): boolean {
    return (
      this.dataRequestWithWorkflow?.workflows.some((workflow) =>
        workflow.tasks.some(
          (task) => task.status === V1_WorkflowTaskStatus.OPEN,
        ),
      ) ?? false
    );
  }

  get contractMembers(): V1_ContractUserMembership[] {
    return this.dataRequestWithWorkflow?.dataRequest.members ?? [];
  }

  get targetUsers(): string[] | undefined {
    const members = this.contractMembers;
    if (members.length > 0) {
      return Array.from(
        new Set(members.map((member) => member.user.name)),
      ).sort();
    }
    return undefined;
  }

  getContractUserType(_userId: string): V1_UserType | undefined {
    return undefined;
  }

  // ---- Timeline ----

  private resolveDoStepStatus(
    pmStepStatus: TimelineStepStatus,
    pmTask: V1_WorkflowTask | undefined,
    doTask: V1_DataOwnerApprovalTask | undefined,
  ): TimelineStepStatus {
    if (pmStepStatus === TimelineStepStatus.DENIED) {
      return TimelineStepStatus.UPCOMING;
    }
    if (!doTask && pmStepStatus === TimelineStepStatus.COMPLETE) {
      return TimelineStepStatus.COMPLETE;
    }
    if (!doTask) {
      return TimelineStepStatus.UPCOMING;
    }
    if (
      this.hasSameApprovers(pmTask, doTask) &&
      pmStepStatus === TimelineStepStatus.COMPLETE
    ) {
      return TimelineStepStatus.COMPLETE;
    }
    return getStepStatus(doTask, TimelineStepStatus.UPCOMING);
  }

  private hasSameApprovers(
    pmTask: V1_WorkflowTask | undefined,
    doTask: V1_DataOwnerApprovalTask,
  ): boolean {
    const pmAssignees = pmTask?.assignees ?? [];
    const doAssignees = doTask.assignees;
    if (pmAssignees.length === 0 || doAssignees.length === 0) {
      return false;
    }
    if (pmAssignees.length !== doAssignees.length) {
      return false;
    }
    const doSet = new Set(doAssignees);
    return pmAssignees.every((a) => doSet.has(a));
  }

  private buildStepLinks(
    stepStatus: TimelineStepStatus,
    taskUrl: string | undefined,
    externalUrl: string | undefined,
  ): Record<string, string> {
    if (stepStatus !== TimelineStepStatus.ACTIVE) {
      return {};
    }
    return {
      ...(taskUrl && { link: taskUrl }),
      ...(externalUrl && { externalLink: externalUrl }),
    };
  }

  getTimelineSteps(_selectedTargetUser: string | undefined): TimelineStep[] {
    if (this.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP) {
      return [];
    }

    const workflow = this.dataRequestWithWorkflow?.workflows[0];
    if (!workflow) {
      return [
        {
          key: 'submitted',
          status: TimelineStepStatus.COMPLETE,
          label: { title: 'Submitted' },
        },
        {
          key: 'complete',
          status: TimelineStepStatus.UPCOMING,
          label: { title: 'Complete' },
        },
      ];
    }

    const doTask = workflow.tasks.find(
      (task): task is V1_DataOwnerApprovalTask =>
        task instanceof V1_DataOwnerApprovalTask,
    );
    const pmLikeTasks = workflow.tasks.filter(
      (task) => !(task instanceof V1_DataOwnerApprovalTask),
    );

    const pmTask =
      pmLikeTasks.find((task) => task.status === V1_WorkflowTaskStatus.OPEN) ??
      pmLikeTasks.find(
        (task) => task.action === V1_WorkflowTaskAction.REJECTED,
      ) ??
      pmLikeTasks.find(
        (task) => task.action === V1_WorkflowTaskAction.APPROVED,
      ) ??
      pmLikeTasks[pmLikeTasks.length - 1];

    const pmStepStatus = getStepStatus(pmTask, TimelineStepStatus.SKIPPED);
    const doStepStatus = this.resolveDoStepStatus(pmStepStatus, pmTask, doTask);

    const isEscalated = pmLikeTasks.some(
      (task) => task.action === V1_WorkflowTaskAction.ESCALATED,
    );
    const currentUser = this.applicationStore.identityService.currentUser;
    const isCreatorOrAssignee =
      currentUser === this.createdBy ||
      (pmTask?.assignees.includes(currentUser) ?? false);
    const showEscalateButton =
      pmStepStatus === TimelineStepStatus.ACTIVE && isCreatorOrAssignee;
    const isEscalatable = showEscalateButton && !isEscalated;

    const taskPageUrl = this.getTaskPageUrl
      ? this.getTaskPageUrl(this.dataAccessRequestId)
      : undefined;

    const pmLinks = this.buildStepLinks(pmStepStatus, taskPageUrl, pmTask?.url);
    const doLinks = this.buildStepLinks(doStepStatus, taskPageUrl, doTask?.url);

    const pmApprovalPayload = buildApprovalPayload(pmTask, pmStepStatus, [
      TimelineStepStatus.ACTIVE,
      TimelineStepStatus.SKIPPED,
    ]);
    const doApprovalPayload = buildApprovalPayload(doTask, doStepStatus, [
      TimelineStepStatus.ACTIVE,
      TimelineStepStatus.UPCOMING,
    ]);

    return [
      {
        key: 'submitted',
        status: TimelineStepStatus.COMPLETE,
        label: { title: 'Submitted' },
      },
      {
        key: 'privilege-manager-approval',
        label: {
          title: 'Privilege Manager Approval',
          ...pmLinks,
          showEscalateButton,
          isEscalatable,
          isEscalated,
        },
        status: pmStepStatus,
        ...(pmStepStatus === TimelineStepStatus.ACTIVE &&
          pmTask?.assignees && { assignees: pmTask.assignees }),
        ...(pmApprovalPayload && { approvalPayload: pmApprovalPayload }),
      },
      {
        key: 'data-producer-approval',
        label: {
          title: 'Data Producer Approval',
          ...doLinks,
        },
        status: doStepStatus,
        ...(doStepStatus === TimelineStepStatus.ACTIVE &&
          doTask?.assignees && { assignees: doTask.assignees }),
        ...(doApprovalPayload && { approvalPayload: doApprovalPayload }),
      },
      {
        key: 'complete',
        status:
          doStepStatus === TimelineStepStatus.COMPLETE
            ? TimelineStepStatus.COMPLETE
            : TimelineStepStatus.UPCOMING,
        label: { title: 'Complete' },
      },
    ];
  }

  // ---- Actions ----

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      if (!this.fetchFresh && !this.permitClient) {
        return;
      }

      // Step 1: fetch fresh auth-server data first so we have the workflowId
      if (this.fetchFresh) {
        const fresh = (yield this.fetchFresh(token)) as
          | V1_DataRequestWithWorkflow
          | undefined;
        if (fresh) {
          this.setDataRequestWithWorkflow(fresh);
        }
      }

      if (!this.dataRequestWithWorkflow) {
        throw new Error('No data available for data access request');
      }

      const base: V1_DataRequestWithWorkflow = this.dataRequestWithWorkflow;

      // Step 2: now we have workflowId — fetch permit overlay sequentially
      const workflowId = base.workflows[0]?.workflowId;
      const permitDetail = (
        workflowId && this.permitClient
          ? yield this.permitClient
              .getProcessInstanceDetail(workflowId, token)
              .catch(() => undefined)
          : undefined
      ) as V1_PermitProcessInstanceDetail | undefined;

      // Overlay real-time task data from the permit server
      if (permitDetail) {
        this.applyPermitOverlay(base, permitDetail);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error.message);
    } finally {
      this.initializationState.complete();
    }
  }

  private applyPermitOverlay(
    base: V1_DataRequestWithWorkflow,
    permitDetail: V1_PermitProcessInstanceDetail,
  ): void {
    const allPermitTasks = collectPermitTasks(permitDetail);
    const permitTaskMap = new Map(
      allPermitTasks.map((permitTask) => [permitTask.taskId, permitTask]),
    );

    if (permitTaskMap.size === 0) {
      return;
    }

    for (const workflow of base.workflows) {
      const authTaskIds = new Set(workflow.tasks.map((task) => task.taskId));

      // 1. Patch existing tasks with live status / assignees
      for (const task of workflow.tasks) {
        const permitTask = permitTaskMap.get(task.taskId);
        if (permitTask) {
          this.patchTaskFromPermit(task, permitTask);
        }
      }

      // 2. Synthesize tasks the auth server hasn't caught up with yet
      const syntheticTasks = this.buildSyntheticTasks(
        allPermitTasks.filter(
          (permitTask) => !authTaskIds.has(permitTask.taskId),
        ),
        workflow,
      );
      workflow.tasks = [...workflow.tasks, ...syntheticTasks];
    }

    this.setDataRequestWithWorkflow(base);
  }

  private patchTaskFromPermit(
    task: V1_WorkflowTask,
    permitTask: V1_PermitProcessInstanceTask,
  ): void {
    const parsedStatus = parseWorkflowTaskStatus(permitTask.status);
    if (parsedStatus) {
      task.status = parsedStatus;
    }
    task.assignees = permitTask.assignees;
    if (permitTask.completedBy) {
      task.actionedBy = permitTask.completedBy;
    }
    if (permitTask.completedDate) {
      task.actionedOn = new Date(permitTask.completedDate);
    }
    const taskAction = mapCompletionReasonToAction(permitTask.completionReason);
    if (taskAction !== undefined) {
      task.action = taskAction;
    }
  }

  private buildSyntheticTasks(
    missingPermitTasks: V1_PermitProcessInstanceTask[],
    workflow: V1_DataRequestWithWorkflow['workflows'][number],
  ): V1_WorkflowTask[] {
    const lastPmLikeTask = workflow.tasks.findLast(
      (task) => !(task instanceof V1_DataOwnerApprovalTask),
    );

    return missingPermitTasks.map((permitTask) => {
      const task = new V1_PrivilegeManagerApprovalTask();
      task.taskId = permitTask.taskId;
      task.status =
        parseWorkflowTaskStatus(permitTask.status) ??
        V1_WorkflowTaskStatus.OPEN;
      task.assignees = permitTask.assignees;
      task.url = `${workflow.url}/${permitTask.taskId}`;
      const taskAction = mapCompletionReasonToAction(
        permitTask.completionReason,
      );
      if (taskAction !== undefined) {
        task.action = taskAction;
      }
      if (permitTask.completedDate) {
        task.actionedOn = new Date(permitTask.completedDate);
      }
      if (permitTask.completedBy) {
        task.actionedBy = permitTask.completedBy;
      }
      if (lastPmLikeTask instanceof V1_PrivilegeManagerApprovalTask) {
        task.resourceId = lastPmLikeTask.resourceId;
        task.accessPointGroup = lastPmLikeTask.accessPointGroup;
        task.consumer = lastPmLikeTask.consumer;
        task.createdOn = lastPmLikeTask.createdOn;
      }
      return task;
    });
  }

  *escalateRequest(
    _user: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.escalatingState.inProgress();
      const currentUser = this.applicationStore.identityService.currentUser;
      const isCreator = currentUser === this.createdBy;
      const task = this.dataRequestWithWorkflow?.workflows
        .flatMap((workflow) => workflow.tasks)
        .find(
          (workflowTask) => workflowTask.status === V1_WorkflowTaskStatus.OPEN,
        );
      if (!task) {
        throw new Error('No open task available to escalate');
      }

      if (isCreator) {
        if (!this.authServerClient) {
          throw new Error('No auth server client available to escalate');
        }
        yield this.authServerClient.escalateDataRequest(
          this.dataAccessRequestId,
          task.taskId,
          'Escalation requested by submitter',
          token,
        );
      } else {
        const workflow = this.dataRequestWithWorkflow?.workflows[0];
        if (!workflow) {
          throw new Error('No workflow found');
        }
        if (!this.permitClient) {
          throw new Error('No workflow client available to escalate');
        }
        yield this.permitClient.performTaskAction(
          workflow.workflowId,
          task.taskId,
          V1_PermitTaskAction.ESCALATE,
          'Escalation requested',
          token,
        );
      }

      const workflowId = this.dataRequestWithWorkflow?.workflows[0]?.workflowId;
      if (workflowId && this.permitClient) {
        try {
          yield new Promise<void>((resolve) => setTimeout(resolve, 2000));
          const detail = (yield this.permitClient.getProcessInstanceDetail(
            workflowId,
            token,
          )) as V1_PermitProcessInstanceDetail;
          this.applyPermitTaskRefresh(detail);
        } catch (error_) {
          assertErrorThrown(error_);
          this.applicationStore.notificationService.notifyWarning(
            `Failed to refresh task status: ${error_.message}`,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    } finally {
      this.escalatingState.complete();
    }
  }

  private applyPermitTaskRefresh(detail: V1_PermitProcessInstanceDetail): void {
    const openChildTask = collectPermitTasks(detail).find(
      (task) => task.status === 'OPEN',
    );
    if (!openChildTask || !this.dataRequestWithWorkflow) {
      return;
    }
    const workflow = this.dataRequestWithWorkflow.workflows[0];
    if (!workflow) {
      return;
    }
    const newTaskUrl = `${workflow.url}/${openChildTask.taskId}`;
    const openTask = workflow.tasks.find(
      (task) => task.status === V1_WorkflowTaskStatus.OPEN,
    );
    if (openTask) {
      openTask.taskId = openChildTask.taskId;
      openTask.assignees = openChildTask.assignees;
      openTask.url = newTaskUrl;
    }
    this.setDataRequestWithWorkflow(this.dataRequestWithWorkflow);
  }

  *invalidateRequest(
    justification: string | undefined,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.invalidatingState.inProgress();
      if (this.permitClient) {
        yield this.permitClient.cancelWorkflow(
          this.dataAccessRequestId,
          token,
          justification,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    } finally {
      this.invalidatingState.complete();
    }
  }

  *performTaskAction(
    taskId: string,
    taskAction: V1_PermitTaskAction,
    justification: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.taskActionState.inProgress();
      const workflow = this.dataRequestWithWorkflow?.workflows[0];
      if (!workflow) {
        throw new Error('No workflow found');
      }
      if (this.permitClient) {
        yield this.permitClient.performTaskAction(
          workflow.workflowId,
          taskId,
          taskAction,
          justification,
          token,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    } finally {
      this.taskActionState.complete();
    }
  }

  getFirstOpenTask() {
    return this.dataRequestWithWorkflow?.workflows
      .flatMap((workflow) => workflow.tasks)
      .find((task) => task.status === V1_WorkflowTaskStatus.OPEN);
  }
}
