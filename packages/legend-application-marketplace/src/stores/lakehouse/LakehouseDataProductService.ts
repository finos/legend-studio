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
  type LakehouseContractServerClient,
  type LakehousePlatformServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { V1_AppDirLevel } from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';

export class LakehouseDataProductService {
  readonly legendMarketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly didToEnvironmentRequestMap = new Map<
    number,
    Promise<IngestDeploymentServerConfig>
  >();
  readonly didToOwnersRequestMap = new Map<number, Promise<string[]>>();
  readonly didToEnvironmentMap: Map<number, IngestDeploymentServerConfig> =
    new Map();
  readonly didToOwnersMap: Map<number, string[]> = new Map();

  constructor(
    legendMarketplaceBaseStore: LegendMarketplaceBaseStore,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
    lakehouseContractServerClient: LakehouseContractServerClient,
  ) {
    this.legendMarketplaceBaseStore = legendMarketplaceBaseStore;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;
    this.lakehouseContractServerClient = lakehouseContractServerClient;

    makeObservable(this, {
      didToEnvironmentMap: observable,
      didToOwnersMap: observable,
      setEnvironment: action,
      setOwners: action,
    });
  }

  setEnvironment(did: number, environment: IngestDeploymentServerConfig): void {
    this.didToEnvironmentMap.set(did, environment);
  }

  setOwners(did: number, owners: string[]): void {
    this.didToOwnersMap.set(did, owners);
  }

  private async fetchEnvironmentForDID(
    did: number,
    token: string | undefined,
  ): Promise<IngestDeploymentServerConfig> {
    const rawResult =
      await this.lakehousePlatformServerClient.findProducerServer(
        did,
        V1_AppDirLevel.DEPLOYMENT,
        token,
      );
    return IngestDeploymentServerConfig.serialization.fromJson(rawResult);
  }

  async getOrFetchEnvironmentForDID(
    did: number,
    token: string | undefined,
  ): Promise<IngestDeploymentServerConfig | undefined> {
    if (this.didToEnvironmentMap.has(did)) {
      return guaranteeNonNullable(this.didToEnvironmentMap.get(did));
    }

    if (!this.didToEnvironmentRequestMap.has(did)) {
      this.didToEnvironmentRequestMap.set(
        did,
        this.fetchEnvironmentForDID(did, token),
      );
    }

    const environment = guaranteeNonNullable(
      await this.didToEnvironmentRequestMap.get(did),
    );
    this.didToEnvironmentRequestMap.delete(did);
    this.setEnvironment(did, environment);
    return environment;
  }

  private async fetchOwnersForDID(
    did: number,
    token: string | undefined,
  ): Promise<string[]> {
    const rawResult = await this.lakehouseContractServerClient.getOwnersForDid(
      did,
      token,
    );
    return this.legendMarketplaceBaseStore.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.handleDataProductOwnersResponse?.(rawResult) ?? [],
      );
  }

  async getOrFetchOwnersForDID(
    did: number,
    token: string | undefined,
  ): Promise<string[]> {
    if (this.didToOwnersMap.has(did)) {
      return guaranteeNonNullable(this.didToOwnersMap.get(did));
    }

    if (!this.didToOwnersRequestMap.has(did)) {
      this.didToOwnersRequestMap.set(did, this.fetchOwnersForDID(did, token));
    }

    const owners = guaranteeNonNullable(
      await this.didToOwnersRequestMap.get(did),
    );
    this.didToOwnersRequestMap.delete(did);
    this.setOwners(did, owners);
    return owners;
  }
}
