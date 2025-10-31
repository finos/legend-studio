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
  type V1_DataContract,
  type V1_LiteDataContract,
  type V1_TaskMetadata,
  type V1_UserType,
  V1_dataContractsResponseModelSchemaToContracts,
  V1_deserializeTaskResponse,
  V1_observe_DataContract,
  V1_observe_LiteDataContract,
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
  readonly liteContract: V1_LiteDataContract;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService?: UserSearchService | undefined;
  associatedTasks: V1_TaskMetadata[] | undefined;
  initializationState = ActionState.create();
  contractWithMembers: V1_DataContract | undefined;

  readonly fetchingMembersState = ActionState.create();

  constructor(
    dataContract: V1_LiteDataContract,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
    graphManagerState: GraphManagerState,
    userSearchService: UserSearchService | undefined,
  ) {
    makeObservable(this, {
      liteContract: observable,
      associatedTasks: observable,
      contractWithMembers: observable,
      setAssociatedTasks: action,
      fetchTasks: flow,
      fetchContractWithMembers: flow,
      init: flow,
    });

    this.liteContract = V1_observe_LiteDataContract(dataContract);
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
  }

  setAssociatedTasks(associatedTasks: V1_TaskMetadata[] | undefined): void {
    this.associatedTasks = associatedTasks;
  }

  *fetchTasks(token: string | undefined): GeneratorFn<void> {
    this.setAssociatedTasks(undefined);
    const pendingTasks =
      yield this.lakehouseContractServerClient.getContractTasks(
        this.liteContract.guid,
        token,
      );
    const tasks = V1_deserializeTaskResponse(pendingTasks);
    this.setAssociatedTasks(tasks);
  }

  *fetchContractWithMembers(token: string | undefined): GeneratorFn<void> {
    this.fetchingMembersState.inProgress();
    try {
      const rawContracts =
        yield this.lakehouseContractServerClient.getDataContract(
          this.liteContract.guid,
          true,
          token,
        );
      const contracts = V1_dataContractsResponseModelSchemaToContracts(
        rawContracts,
        this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
      );
      this.contractWithMembers = contracts[0]
        ? V1_observe_DataContract(contracts[0])
        : undefined;
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

  getContractUserType(userId: string): V1_UserType | undefined {
    return this.contractWithMembers?.members.find(
      (member) => member.user.name === userId,
    )?.user.userType;
  }
}
