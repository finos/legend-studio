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
import { ActionState, assertErrorThrown } from '@finos/legend-shared';
import {
  type V1_DataSubscription,
  type V1_LiteDataContract,
  V1_deserializeLiteDataContractsPaginatedResponse,
  V1_dataSubscriptionsPaginatedResponseModelSchema,
} from '@finos/legend-graph';
import { makeObservable, action, observable } from 'mobx';
import type {
  DataGridServerSideDatasource,
  DataGridServerSideGetRowsParams,
} from '@finos/legend-lego/data-grid';
import { deserialize } from 'serializr';

const CONTRACTS_PAGE_SIZE = 100;
const SUBSCRIPTIONS_PAGE_SIZE = 100;

export class LakehouseAdminStore {
  readonly legendMarketplaceBaseStore: LegendMarketplaceBaseStore;
  initializationState = ActionState.create();
  contractsGridApi: { refreshServerSide: () => void } | undefined = undefined;
  subscriptionsGridApi: { refreshServerSide: () => void } | undefined =
    undefined;

  constructor(legendMarketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.legendMarketplaceBaseStore = legendMarketplaceBaseStore;
    makeObservable(this, {
      initializationState: observable,
      contractsGridApi: observable.ref,
      subscriptionsGridApi: observable.ref,
      setContractsGridApi: action,
      setSubscriptionsGridApi: action,
      refresh: action,
    });
  }

  createContractsServerSideDatasource(
    token: string | undefined,
  ): DataGridServerSideDatasource {
    return {
      getRows: (
        params: DataGridServerSideGetRowsParams<V1_LiteDataContract>,
      ) => {
        // eslint-disable-next-line no-void
        void this.fetchContractsPage(params, token);
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
      const lastContractId =
        startRow > 0
          ? params.api.getDisplayedRowAtIndex(startRow - 1)?.data?.guid
          : undefined;

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
    this.subscriptionsGridApi?.refreshServerSide();
  }

  createSubscriptionsServerSideDatasource(
    token: string | undefined,
  ): DataGridServerSideDatasource {
    return {
      getRows: (
        params: DataGridServerSideGetRowsParams<V1_DataSubscription>,
      ) => {
        // eslint-disable-next-line no-void
        void this.fetchSubscriptionsPage(params, token);
      },
    };
  }

  private async fetchSubscriptionsPage(
    params: DataGridServerSideGetRowsParams<V1_DataSubscription>,
    token: string | undefined,
  ): Promise<void> {
    try {
      const startRow = params.request.startRow ?? 0;
      const lastSubscriptionId =
        startRow > 0
          ? params.api.getDisplayedRowAtIndex(startRow - 1)?.data?.guid
          : undefined;

      const rawResponse =
        await this.legendMarketplaceBaseStore.lakehouseContractServerClient.getAllSubscriptionsPaginated(
          SUBSCRIPTIONS_PAGE_SIZE,
          lastSubscriptionId,
          token,
        );
      const paginatedResponse = deserialize(
        V1_dataSubscriptionsPaginatedResponseModelSchema,
        rawResponse,
      );
      const subscriptions = paginatedResponse.dataContractSubscriptions ?? [];
      const hasNextPage =
        paginatedResponse.paginationMetadataRecord.hasNextPage;

      const lastRow = hasNextPage ? -1 : startRow + subscriptions.length;

      params.success({
        rowData: subscriptions,
        rowCount: lastRow,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.legendMarketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching subscriptions: ${error.message}`,
      );
      params.fail();
    }
  }

  setContractsGridApi(
    api: { refreshServerSide: () => void } | undefined,
  ): void {
    this.contractsGridApi = api;
  }

  setSubscriptionsGridApi(
    api: { refreshServerSide: () => void } | undefined,
  ): void {
    this.subscriptionsGridApi = api;
  }
}
