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
  type V1_LiteDataContract,
  type V1_TaskMetadata,
  type V1_UserType,
  V1_deserializeDataContractResponse,
  V1_deserializeTaskResponse,
  V1_observe_LiteDataContract,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

export class EntitlementsDataContractViewerState {
  liteContract: V1_LiteDataContract;
  readonly subscription: V1_DataSubscription | undefined;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService?: UserSearchService | undefined;
  associatedTasks: V1_TaskMetadata[] | undefined;
  initializationState = ActionState.create();
  contractMembers: V1_ContractUserMembership[] = [];

  readonly fetchingMembersState = ActionState.create();
  readonly invalidatingContractState = ActionState.create();

  constructor(
    dataContract: V1_LiteDataContract,
    subscription: V1_DataSubscription | undefined,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
    graphManagerState: GraphManagerState,
    userSearchService: UserSearchService | undefined,
  ) {
    makeObservable(this, {
      liteContract: observable,
      associatedTasks: observable,
      contractMembers: observable,
      setAssociatedTasks: action,
      setLiteContract: action,
      setContractMembers: action,
      init: flow,
      invalidateContract: flow,
    });

    this.liteContract = V1_observe_LiteDataContract(dataContract);
    this.subscription = subscription;
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
  }

  setAssociatedTasks(associatedTasks: V1_TaskMetadata[] | undefined): void {
    this.associatedTasks = associatedTasks;
  }

  setLiteContract(liteContract: V1_LiteDataContract): void {
    this.liteContract = liteContract;
  }

  setContractMembers(
    contractMembers: V1_ContractUserMembership[] | undefined,
  ): void {
    this.contractMembers = contractMembers ?? [];
  }

  async fetchTasks(token: string | undefined): Promise<void> {
    this.setAssociatedTasks(undefined);
    const pendingTasks =
      await this.lakehouseContractServerClient.getContractTasks(
        this.liteContract.guid,
        token,
      );
    const tasks = V1_deserializeTaskResponse(pendingTasks);
    this.setAssociatedTasks(tasks);
  }

  async fetchContractWithMembers(token: string | undefined): Promise<void> {
    this.fetchingMembersState.inProgress();
    try {
      const rawContractsAndSubscriptions =
        await this.lakehouseContractServerClient.getDataContract(
          this.liteContract.guid,
          true,
          token,
        );
      const contractsAndSubscriptions = V1_deserializeDataContractResponse(
        rawContractsAndSubscriptions,
        this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
      );

      this.setContractMembers(
        contractsAndSubscriptions[0]?.dataContract?.members ?? [],
      );
      if (contractsAndSubscriptions[0]?.dataContract) {
        this.setLiteContract(
          V1_observe_LiteDataContract(
            V1_transformDataContractToLiteDatacontract(
              contractsAndSubscriptions[0].dataContract,
            ),
          ),
        );
      }
    } finally {
      this.fetchingMembersState.complete();
    }
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      yield Promise.all([
        this.fetchTasks(token),
        this.fetchContractWithMembers(token),
      ]);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }

  *invalidateContract(token: string | undefined): GeneratorFn<void> {
    try {
      this.invalidatingContractState.inProgress();
      yield this.lakehouseContractServerClient.invalidateContract(
        this.liteContract.guid,
        token,
      );

      this.applicationStore.notificationService.notifySuccess(
        'Contract closed successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Error closing contract: ${error.message}`,
      );
    } finally {
      this.invalidatingContractState.complete();
    }
  }

  getContractUserType(userId: string): V1_UserType | undefined {
    return this.contractMembers.find((member) => member.user.name === userId)
      ?.user.userType;
  }
}
