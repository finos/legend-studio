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
  type V1_DataProduct,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  ActionState,
  assertErrorThrown,
  assertTrue,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  action,
  flow,
  flowResult,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';

export enum DataProductGroupAccess {
  // can be used to indicate fetching or resyncing of group access
  UNKNOWN = 'UNKNOWN',

  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  NO_ACCESS = 'NO_ACCESS',
}

const generatePromise = (time?: number | undefined) => {
  return new Promise((resolve) => setTimeout(resolve, time ?? 5000));
};

export class DataProductGroupAccessState {
  readonly accessState: DataProductDataAccessState;
  readonly group: V1_AccessPointGroup;
  id = uuid();

  access = DataProductGroupAccess.UNKNOWN;
  fetchingAccessState = ActionState.create();
  requestingAccessState = ActionState.create();

  constructor(
    group: V1_AccessPointGroup,
    accessState: DataProductDataAccessState,
  ) {
    this.group = group;
    this.accessState = accessState;
    makeAutoObservable(this, {
      access: observable,
      setAccess: action,
      requestAccess: flow,
      handleClick: flow,
      goToEtask: flow,
      requestingAccessState: observable,
    });
  }

  setAccess(val: DataProductGroupAccess): void {
    this.access = val;
  }

  fetchGroupAccess(): void {}

  *handleClick(): GeneratorFn<void> {
    if (this.access === DataProductGroupAccess.NO_ACCESS) {
      flowResult(this.requestAccess()).catch(
        this.accessState.viewerState.applicationStore.alertUnhandledError,
      );
    } else if (this.access === DataProductGroupAccess.PENDING) {
      flowResult(this.goToEtask()).catch(
        this.accessState.viewerState.applicationStore.alertUnhandledError,
      );
    }
  }

  *requestAccess(): GeneratorFn<void> {
    try {
      this.requestingAccessState.inProgress();
      this.accessState.viewerState.applicationStore.alertService.setBlockingAlert(
        {
          message: 'Requesting Access...',
          showLoading: true,
        },
      );
      assertTrue(
        this.access === DataProductGroupAccess.NO_ACCESS,
        `Access Group must be in no access state to request access`,
      );
      yield generatePromise();
      this.setAccess(DataProductGroupAccess.PENDING);
    } catch (error) {
      assertErrorThrown(error);
      this.requestingAccessState.complete();
    } finally {
      this.accessState.viewerState.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  *goToEtask(): GeneratorFn<void> {
    try {
      assertTrue(
        this.access === DataProductGroupAccess.PENDING,
        `Access Group must be in no access state to request access`,
      );
      yield generatePromise();
      this.setAccess(DataProductGroupAccess.PENDING);
    } catch (error) {
      assertErrorThrown(error);
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
      fetchGroupState: flow,
    });

    this.viewerState = viewerState;
    this.accessGroupStates = this.product.accessPointGroups.map(
      (e) => new DataProductGroupAccessState(e, this),
    );
  }

  *fetchGroupState(): GeneratorFn<void> {
    try {
      // dummy fetch to get access
      this.fetchingDataProductAccessState.inProgress();
      yield generatePromise();

      if (this.accessGroupStates.length === 3) {
        this.accessGroupStates[0]?.setAccess(DataProductGroupAccess.NO_ACCESS);
        this.accessGroupStates[1]?.setAccess(DataProductGroupAccess.PENDING);
        this.accessGroupStates[2]?.setAccess(DataProductGroupAccess.COMPLETED);
      }
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.fetchingDataProductAccessState.complete();
    }
  }

  get product(): V1_DataProduct {
    return this.viewerState.product;
  }
}
