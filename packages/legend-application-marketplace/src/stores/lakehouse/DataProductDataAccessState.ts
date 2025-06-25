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
  type V1_AccessPointGroup,
  type V1_DataContract,
  type V1_DataProduct,
  type V1_DataSubscription,
  type V1_DataSubscriptionResponse,
  type V1_DataSubscriptionTarget,
  V1_ContractState,
  V1_CreateSubscriptionInput,
  V1_CreateSubscriptionInputModelSchema,
  V1_dataSubscriptionModelSchema,
  V1_DataSubscriptionResponseModelSchema,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  uuid,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  action,
  flow,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import {
  dataContractContainsAccessGroup,
  isContractCompleted,
  isMemberOfContract,
} from './LakehouseUtils.js';
import { deserialize, serialize } from 'serializr';

export enum AccessPointGroupAccess {
  // can be used to indicate fetching or resyncing of group access
  UNKNOWN = 'UNKNOWN',

  PENDING_MANAGER_APPROVAL = 'PENDING_MANAGER_APPROVAL',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  COMPLETED = 'COMPLETED',
  NO_ACCESS = 'NO_ACCESS',
}

const getDataProductGroupAccessFromContract = (
  val: V1_DataContract,
): AccessPointGroupAccess => {
  if (isContractCompleted(val)) {
    return AccessPointGroupAccess.COMPLETED;
  } else if (
    val.state === V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL
  ) {
    return AccessPointGroupAccess.PENDING_MANAGER_APPROVAL;
  } else if (val.state === V1_ContractState.PENDING_DATA_OWNER_APPROVAL) {
    return AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL;
  }
  return AccessPointGroupAccess.UNKNOWN;
};

export class DataProductGroupAccessState {
  readonly accessState: DataProductDataAccessState;
  readonly group: V1_AccessPointGroup;
  id = uuid();
  subscriptions: V1_DataSubscription[] = [];

  fetchingAccessState = ActionState.create();
  requestingAccessState = ActionState.create();
  fetchingSubscriptionsState = ActionState.create();
  creatingSubscriptionState = ActionState.create();

  // ASSUMPTION: one contract per user per group;
  // false here mentions contracts have not been fetched
  associatedContract: V1_DataContract | undefined | false = false;

  constructor(
    group: V1_AccessPointGroup,
    accessState: DataProductDataAccessState,
  ) {
    this.group = group;
    this.accessState = accessState;
    makeAutoObservable(this, {
      handleContractClick: action,
      handleDataProductContracts: action,
      requestingAccessState: observable,
      associatedContract: observable,
      setAssociatedContract: action,
      subscriptions: observable,
      fetchingSubscriptionsState: observable,
      creatingSubscriptionState: observable,
      createSubscription: flow,
      setSubscriptions: action,
    });
  }

  get access(): AccessPointGroupAccess {
    if (this.associatedContract === false) {
      return AccessPointGroupAccess.UNKNOWN;
    }
    if (this.associatedContract) {
      return getDataProductGroupAccessFromContract(this.associatedContract);
    } else {
      return AccessPointGroupAccess.NO_ACCESS;
    }
  }

  setAssociatedContract(val: V1_DataContract | undefined): void {
    this.associatedContract = val;
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }

  handleDataProductContracts(contracts: V1_DataContract[]): void {
    const groupContracts = contracts
      .filter((_contract) =>
        dataContractContainsAccessGroup(this.group, _contract),
      )
      .filter((_contract) =>
        isMemberOfContract(
          this.accessState.viewerState.applicationStore.identityService
            .currentUser,
          _contract,
        ),
      );
    // ASSUMPTION: one contract per user per group
    const userContract = groupContracts[0];
    this.setAssociatedContract(userContract);
  }

  handleContractClick(): void {
    if (this.access === AccessPointGroupAccess.NO_ACCESS) {
      this.accessState.viewerState.setDataContractAccessPointGroup(this.group);
    } else if (
      this.access === AccessPointGroupAccess.PENDING_MANAGER_APPROVAL ||
      this.access === AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL ||
      this.access === AccessPointGroupAccess.COMPLETED
    ) {
      const associatedContract = this.associatedContract;
      if (associatedContract) {
        this.accessState.viewerState.setDataContract(associatedContract);
      }
    }
  }

  *fetchSubscriptions(
    contractId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingSubscriptionsState.inProgress();
      const rawSubscriptions =
        (yield this.accessState.viewerState.lakeServerClient.getSubscriptionsForContract(
          contractId,
          token,
        )) as V1_DataSubscriptionResponse;
      const subscriptions = rawSubscriptions.subscriptions?.map(
        (rawSubscription) =>
          deserialize(V1_dataSubscriptionModelSchema, rawSubscription),
      );
      this.setSubscriptions(subscriptions ?? []);
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.fetchingSubscriptionsState.complete();
    }
  }

  *createSubscription(
    contractId: string,
    target: V1_DataSubscriptionTarget,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.creatingSubscriptionState.inProgress();
      const input = new V1_CreateSubscriptionInput();
      input.contractId = contractId;
      input.target = target;
      const response =
        (yield this.accessState.viewerState.lakeServerClient.createSubscription(
          serialize(V1_CreateSubscriptionInputModelSchema, input),
          token,
        )) as PlainObject<V1_DataSubscriptionResponse>;
      guaranteeNonNullable(
        deserialize(V1_DataSubscriptionResponseModelSchema, response)
          .subscriptions?.[0],
        'No subsription returned from server',
      );
      this.accessState.viewerState.applicationStore.notificationService.notifySuccess(
        `Subscription created`,
      );
      this.fetchSubscriptions(contractId, token);
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.creatingSubscriptionState.complete();
    }
  }
}

export class DataProductDataAccessState {
  readonly viewerState: DataProductViewerState;
  accessGroupStates: DataProductGroupAccessState[];
  fetchingDataProductAccessState = ActionState.create();

  constructor(viewerState: DataProductViewerState) {
    makeObservable(this, {
      accessGroupStates: observable,
      fetchingDataProductAccessState: observable,
    });

    this.viewerState = viewerState;
    this.accessGroupStates = this.product.accessPointGroups.map(
      (e) => new DataProductGroupAccessState(e, this),
    );
  }

  get product(): V1_DataProduct {
    return this.viewerState.product;
  }
}
