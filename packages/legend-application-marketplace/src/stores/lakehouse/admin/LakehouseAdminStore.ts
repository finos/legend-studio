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

import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_DataSubscription,
  type V1_LiteDataContract,
  V1_DataSubscriptionResponseModelSchema,
  V1_deserializeLiteDataContractsPaginatedResponse,
} from '@finos/legend-graph';
import { makeObservable, flow, action, observable } from 'mobx';
import type {
  DataGridServerSideDatasource,
  DataGridServerSideGetRowsParams,
} from '@finos/legend-lego/data-grid';

const CONTRACTS_PAGE_SIZE = 100;

export class LakehouseAdminStore {
  readonly legendMarketplaceBaseStore: LegendMarketplaceBaseStore;
  initializationState = ActionState.create();
  subscriptionsInitializationState = ActionState.create();
  subscriptions: V1_DataSubscription[] = [];
  contractsGridApi: { refreshServerSide: () => void } | undefined = undefined;

  constructor(legendMarketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.legendMarketplaceBaseStore = legendMarketplaceBaseStore;
    makeObservable(this, {
      subscriptions: observable,
      initializationState: observable,
      contractsGridApi: observable.ref,
      init: flow,
      setSubscriptions: action,
      setContractsGridApi: action,
      refresh: action,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    const fetchSubscriptions = async (): Promise<void> => {
      try {
        this.subscriptionsInitializationState.inProgress();
        const rawSubscriptions =
          await this.legendMarketplaceBaseStore.lakehouseContractServerClient.getAllSubscriptions(
            token,
          );
        const subscriptions = deserialize(
          V1_DataSubscriptionResponseModelSchema,
          rawSubscriptions,
        ).subscriptions;
        this.setSubscriptions(subscriptions ?? []);
      } catch (error) {
        assertErrorThrown(error);
        this.legendMarketplaceBaseStore.applicationStore.notificationService.notifyError(
          `Error fetching subscriptions: ${error.message}`,
        );
      } finally {
        this.subscriptionsInitializationState.complete();
      }
    };

    this.initializationState.inProgress();
    try {
      yield fetchSubscriptions();
    } finally {
      this.initializationState.complete();
    }
  }

  createContractsServerSideDatasource(
    token: string | undefined,
  ): DataGridServerSideDatasource {
    return {
      getRows: (
        params: DataGridServerSideGetRowsParams<V1_LiteDataContract>,
      ) => {
        this.fetchContractsPage(params, token);
      },
    };
  }

  private async fetchContractsPage(
    params: DataGridServerSideGetRowsParams<V1_LiteDataContract>,
    token: string | undefined,
  ): Promise<void> {
    try {
      const startRow = params.request.startRow ?? 0;
      // Determine cursor: for the first page we pass undefined
      // For subsequent pages, get the last contract id from the currently loaded rows
      let lastContractId: string | undefined;
      if (startRow > 0) {
        const lastLoadedRow = params.api.getDisplayedRowAtIndex(startRow - 1);
        lastContractId = (
          lastLoadedRow?.data as V1_LiteDataContract | undefined
        )?.guid;
      }

      const rawResponse =
        await this.legendMarketplaceBaseStore.lakehouseContractServerClient.getLiteDataContractsPaginated(
          CONTRACTS_PAGE_SIZE,
          lastContractId,
          token,
        );
      const paginatedResponse =
        V1_deserializeLiteDataContractsPaginatedResponse(
          rawResponse,
          this.legendMarketplaceBaseStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
        );
      const contracts =
        paginatedResponse.liteDataContractsResponse.dataContracts ?? [];
      const hasNextPage =
        paginatedResponse.paginationMetadataRecord.hasNextPage;

      // If there's no next page, compute the total row count
      const lastRow = hasNextPage ? -1 : startRow + contracts.length;

      params.success({
        rowData: contracts,
        rowCount: lastRow,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.legendMarketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts: ${error.message}`,
      );
      params.fail();
    }
  }

  refresh(): void {
    this.initializationState = ActionState.create();
    this.contractsGridApi?.refreshServerSide();
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }

  setContractsGridApi(
    api: { refreshServerSide: () => void } | undefined,
  ): void {
    this.contractsGridApi = api;
  }
}
