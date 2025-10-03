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

import { makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../../LegendMarketplaceBaseStore.js';
import { ActionState } from '@finos/legend-shared';
import { EntitlementsDashboardState } from './EntitlementsDashboardState.js';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

export const TEST_USER = undefined;
export const TEST_USER2 = undefined;

export class LakehouseEntitlementsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly directoryUrl: string | undefined;
  readonly applicationIdUrl: string | undefined;
  readonly directoryCallBack: ((user: string) => void) | undefined;
  readonly applicationCallBack: ((applicationId: string) => void) | undefined;
  readonly contractIdToTargetUsersMap: Map<string, string[]> = new Map<
    string,
    string[]
  >();
  readonly contractIdToAssigneesMap: Map<string, string[]> = new Map<
    string,
    string[]
  >();
  currentViewerFetchStatus = ActionState.create();
  dashboardViewer: EntitlementsDashboardState;

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      contractIdToTargetUsersMap: observable,
      contractIdToAssigneesMap: observable,
    });

    this.marketplaceBaseStore = marketplaceBaseStore;
    this.applicationStore = marketplaceBaseStore.applicationStore;
    this.lakehouseContractServerClient =
      marketplaceBaseStore.lakehouseContractServerClient;
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
    this.dashboardViewer = new EntitlementsDashboardState(this);
  }
}
