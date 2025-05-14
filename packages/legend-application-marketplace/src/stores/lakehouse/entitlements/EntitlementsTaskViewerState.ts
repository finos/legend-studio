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
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_ContractUserEventRecord,
  type V1_TaskStatusChangeResponse,
  V1_TaskStatusChangeResponseModelSchema,
  type V1_TaskStatus,
  type V1_DataContract,
  V1_DataContractsRecordModelSchema,
  type V1_DataContractsRecord,
  type V1_PendingTasksRespond,
  V1_pendingTasksRespondModelSchema,
  type V1_UserPendingContractsRecord,
  type V1_TaskMetadata,
} from '@finos/legend-graph';
import { makeObservable, flow, observable, flowResult, action } from 'mobx';
import {
  type LakehouseEntitlementsStore,
  TEST_USER,
} from './LakehouseEntitlementsStore.js';
import { LakehouseViewerState } from './LakehouseViewerState.js';
import {
  buildTaskGridItemDetail,
  type GridItemDetail,
} from '../LakehouseUtils.js';
import { generateLakehouseContractPath } from '../../../__lib__/LegendMarketplaceNavigation.js';

export class EntitlementsTaskViewerState extends LakehouseViewerState {
  readonly value: V1_ContractUserEventRecord;
  readonly approvalStatus = ActionState.create();
  canApprove: boolean | undefined;
  dataContract: V1_DataContract | undefined;
  pendingAssociatedContractEvent: V1_UserPendingContractsRecord[] | undefined;
  changingTaskState = ActionState.create();
  taskAssignees: string[] | undefined;
  constructor(value: V1_TaskMetadata, state: LakehouseEntitlementsStore) {
    super(state);
    this.value = value.rec;
    this.taskAssignees = value.assignees;
    makeObservable(this, {
      canApprove: observable,
      pendingAssociatedContractEvent: observable,
      setPendingAssociatedContractEvent: action,
      setCanApprove: action,
      approve: flow,
      deny: flow,
      init: flow,
      calculateApprovalRights: flow,
      fetchContract: flow,
      dataContract: observable,
      taskAssignees: observable,
    });
    this.observeContract();
  }

  get id(): string {
    return this.value.taskId;
  }

  setPendingAssociatedContractEvent(
    pendingAssociatedContractEvent: V1_UserPendingContractsRecord[] | undefined,
  ): void {
    this.pendingAssociatedContractEvent = pendingAssociatedContractEvent;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initializationState.inProgress();
    Promise.all([
      flowResult(this.calculateApprovalRights(token)).catch(
        this.state.applicationStore.alertUnhandledError,
      ),
      flowResult(this.fetchContract(token)).catch(
        this.state.applicationStore.alertUnhandledError,
      ),
    ])
      .catch(this.state.applicationStore.alertUnhandledError)
      .finally(() => this.initializationState.complete());
  }

  setCanApprove(val: boolean | undefined): void {
    this.canApprove = val;
  }

  observeContract(): void {
    makeObservable(this.value, {
      status: observable,
    });
  }

  *approve(token: string | undefined): GeneratorFn<void> {
    try {
      this.approvalStatus.inProgress();
      const response = (yield this.state.lakehouseServerClient.approveTask(
        this.value.taskId,
        token,
      )) as PlainObject<V1_TaskStatusChangeResponse>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        this.approvalStatus.fail();
        throw new Error(
          `Unable to approve task: ${this.value.taskId}: ${change.errorMessage}`,
        );
      }
      this.value.status = change.status;
      this.setCanApprove(false);
      this.approvalStatus.pass();
      this.state.applicationStore.notificationService.notifySuccess(
        'Approval succeeded',
      );
    } catch (error) {
      this.approvalStatus.fail();
      assertErrorThrown(error);
      this.state.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    }
  }

  *deny(token: string | undefined): GeneratorFn<void> {
    try {
      this.changingTaskState.inProgress();
      this.state.applicationStore.alertService.setBlockingAlert({
        message: 'Denying Task',
        prompt: 'Denying task...',
        showLoading: true,
      });
      const response = (yield this.state.lakehouseServerClient.denyTask(
        this.value.taskId,
        token,
      )) as PlainObject<V1_TaskStatus>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to deny task: ${this.value.taskId}: ${change.errorMessage}`,
        );
      }
      this.value.status = change.status;
      this.setCanApprove(false);
      this.state.applicationStore.notificationService.notifySuccess(
        `Task has been denied`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.state.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.changingTaskState.complete();
      this.changingTaskState.setMessage(undefined);
      this.state.applicationStore.alertService.setBlockingAlert(undefined);
    }
  }

  *calculateApprovalRights(token: string | undefined): GeneratorFn<void> {
    this.canApprove = undefined;
    try {
      const rawTasks = (yield this.state.lakehouseServerClient.getPendingTasks(
        TEST_USER,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = deserialize(V1_pendingTasksRespondModelSchema, rawTasks);
      const allTasks = [...tasks.dataOwner, ...tasks.privilegeManager];
      const canApprove = Boolean(
        allTasks.find((e) => e.taskId === this.value.taskId),
      );
      this.setCanApprove(canApprove);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  *fetchContract(token: string | undefined): GeneratorFn<void> {
    try {
      const contractId = this.value.dataContractId;
      const dataContracts =
        (yield this.state.lakehouseServerClient.getDataContract(
          contractId,
          token,
        )) as PlainObject<V1_DataContractsRecord>;

      const dataContract = deserialize(
        V1_DataContractsRecordModelSchema,
        dataContracts,
      ).dataContracts[0]?.dataContract;
      this.dataContract = dataContract;
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  get taskDetails(): GridItemDetail[] {
    return buildTaskGridItemDetail(
      this.value,
      this.taskAssignees,
      this.dataContract,
      (id: string): void => {
        this.state.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateLakehouseContractPath(id),
        );
      },
      this.state.directoryCallBack,
      this.state.applicationCallBack,
    );
  }
}
