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

import type {
  V1_DataContract,
  V1_AccessPointGroup,
  V1_DataProduct,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import { ActionState, uuid } from '@finos/legend-shared';
import { action, makeAutoObservable, makeObservable, observable } from 'mobx';
import {
  dataContractContainsAccessGroup,
  isContractCompleted,
  isContractPending,
  isMemberOfContract,
} from './LakehouseUtils.js';
import { generateLakehouseContractPath } from '../../__lib__/LegendMarketplaceNavigation.js';

export enum DataProductGroupAccess {
  // can be used to indicate fetching or resyncing of group access
  UNKNOWN = 'UNKNOWN',

  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  NO_ACCESS = 'NO_ACCESS',
}

const getDataProductGroupAccessFromContract = (
  val: V1_DataContract,
): DataProductGroupAccess => {
  if (isContractCompleted(val)) {
    return DataProductGroupAccess.COMPLETED;
  }

  if (isContractPending(val)) {
    return DataProductGroupAccess.PENDING;
  }
  return DataProductGroupAccess.UNKNOWN;
};

export class DataProductGroupAccessState {
  readonly accessState: DataProductDataAccessState;
  readonly group: V1_AccessPointGroup;
  id = uuid();

  fetchingAccessState = ActionState.create();
  requestingAccessState = ActionState.create();

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
      handleClick: action,
      handleDataProductContracts: action,
      requestingAccessState: observable,
      associatedContract: observable,
      setAssociatedContract: action,
    });
  }

  get access(): DataProductGroupAccess {
    if (this.associatedContract === false) {
      return DataProductGroupAccess.UNKNOWN;
    }
    if (this.associatedContract) {
      return getDataProductGroupAccessFromContract(this.associatedContract);
    } else {
      return DataProductGroupAccess.NO_ACCESS;
    }
  }

  setAssociatedContract(val: V1_DataContract | undefined): void {
    this.associatedContract = val;
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

  handleClick(): void {
    if (this.access === DataProductGroupAccess.NO_ACCESS) {
      this.accessState.viewerState.setDataContractAccessPointGroup(this.group);
    } else if (this.access === DataProductGroupAccess.PENDING) {
      const associatedContract = this.associatedContract;
      if (associatedContract) {
        this.accessState.viewerState.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateLakehouseContractPath(associatedContract.guid),
        );
      }
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
