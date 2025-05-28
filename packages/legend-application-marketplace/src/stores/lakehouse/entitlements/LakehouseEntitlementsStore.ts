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

import type { LegendMarketplaceApplicationStore } from '../../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_TaskResponse,
  type V1_DataContractsRecord,
  V1_deserializeTaskResponse,
  V1_DataContractsRecordModelSchema,
} from '@finos/legend-graph';
import { makeObservable, flow, observable, flowResult, action } from 'mobx';
import { EntitlementsDataContractViewerState } from './EntitlementsDataContractViewerState.js';
import { EntitlementsDashboardState } from './EntitlementsDashboardState.js';
import { EntitlementsTaskViewerState } from './EntitlementsTaskViewerState.js';
import type { LakehouseViewerState } from './LakehouseViewerState.js';
import type { LakehouseContractServerClient } from '@finos/legend-server-marketplace';

export const TEST_USER = undefined;
export const TEST_USER2 = undefined;

export class LakehouseEntitlementsStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseServerClient: LakehouseContractServerClient;
  readonly directoryUrl: string | undefined;
  readonly applicationIdUrl: string | undefined;
  readonly directoryCallBack: ((user: string) => void) | undefined;
  readonly applicationCallBack: ((applicationId: string) => void) | undefined;
  currentViewerFetchStatus = ActionState.create();
  dashboardViewer: LakehouseViewerState | undefined;
  currentViewer:
    | LakehouseViewerState
    | EntitlementsDataContractViewerState
    | undefined;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    this.directoryUrl =
      this.applicationStore.config.lakehouseEntitlementsConfig?.applicationDirectoryUrl;
    this.applicationIdUrl =
      this.applicationStore.config.lakehouseEntitlementsConfig?.applicationIDUrl;
    this.directoryCallBack = this.directoryUrl
      ? (user: string) => {
          this.applicationStore.navigationService.navigator.visitAddress(
            `${this.directoryUrl}/${user}`,
          );
        }
      : undefined;
    this.applicationCallBack = this.applicationIdUrl
      ? (id: string) => {
          this.applicationStore.navigationService.navigator.visitAddress(
            `${this.applicationIdUrl}/${id}`,
          );
        }
      : undefined;

    makeObservable(this, {
      initDashboard: flow,
      initWithTaskId: flow,
      initWithContract: flow,
      dashboardViewer: observable,
      currentViewer: observable,
      setDashboardViewer: action,
      setCurrentViewer: action,
    });
  }

  setDashboardViewer(val: LakehouseViewerState | undefined): void {
    this.dashboardViewer = val;
  }

  setCurrentViewer(
    val: LakehouseViewerState | EntitlementsDataContractViewerState | undefined,
  ): void {
    this.currentViewer = val;
  }

  *initDashboard(token: string | undefined): GeneratorFn<void> {
    this.setDashboardViewer(undefined);
    const dashboardViewer = new EntitlementsDashboardState(this);
    this.setDashboardViewer(dashboardViewer);
    dashboardViewer.init(token);
  }

  *initWithTaskId(
    taskId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.currentViewerFetchStatus.inProgress();
      this.setCurrentViewer(undefined);
      const rawTasks = (yield this.lakehouseServerClient.getTask(
        taskId,
        token,
      )) as PlainObject<V1_TaskResponse>;
      const tasks = V1_deserializeTaskResponse(rawTasks);
      const task = guaranteeNonNullable(
        tasks[0],
        `Task with id '${taskId}' not found`,
      );
      this.currentViewerFetchStatus.complete();
      const currentTask = new EntitlementsTaskViewerState(task, this);
      this.setCurrentViewer(currentTask);
      flowResult(currentTask.init(token)).catch(
        this.applicationStore.alertUnhandledError,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to render task page: ${error.message}`,
      );
    } finally {
      this.currentViewerFetchStatus.complete();
    }
  }

  *initWithContract(id: string, token: string | undefined): GeneratorFn<void> {
    try {
      this.currentViewerFetchStatus.inProgress();
      this.setCurrentViewer(undefined);
      const dataContracts = (yield this.lakehouseServerClient.getDataContract(
        id,
        token,
      )) as PlainObject<V1_DataContractsRecord>;

      const dataContract = deserialize(
        V1_DataContractsRecordModelSchema,
        dataContracts,
      ).dataContracts[0]?.dataContract;
      const contract = guaranteeNonNullable(
        dataContract,
        'Data Contract not found',
      );
      this.currentViewerFetchStatus.complete();
      const currentViewer = new EntitlementsDataContractViewerState(
        contract,
        this.lakehouseServerClient,
      );
      this.setCurrentViewer(currentViewer);
      flowResult(currentViewer.init(token)).catch(
        this.applicationStore.alertUnhandledError,
      );
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.currentViewerFetchStatus.complete();
    }
  }
}
