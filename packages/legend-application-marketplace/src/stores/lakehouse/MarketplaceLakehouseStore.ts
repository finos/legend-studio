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

import type { CommandRegistrar } from '@finos/legend-application';
import {
  DepotScope,
  StoredSummaryEntity,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import type { MarketplaceLakehouseServerClient } from '../MarketplaceLakehouseServerClient.js';
import { action, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceApplicationStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  uuid,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  V1_dataProductModelSchema,
  V1_LakehouseAccessPoint,
  type V1_AccessPoint,
  type V1_DataProduct,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import { GAV_DELIMITER, type Entity } from '@finos/legend-storage';
import type { DataAsset } from '@finos/legend-server-marketplace';

interface DataProductEntity {
  product: V1_DataProduct;
  groupId: string;
  artifactId: string;
  versionId: string;
}

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductState {
  readonly state: MarketplaceLakehouseStore;
  id: string;
  productEntity: DataProductEntity;

  constructor(product: DataProductEntity, state: MarketplaceLakehouseStore) {
    this.id = uuid();
    this.productEntity = product;
    this.state = state;
  }

  get product(): V1_DataProduct {
    return this.productEntity.product;
  }

  get accessPoints(): V1_AccessPoint[] {
    return this.product.accessPointGroups.map((e) => e.accessPoints).flat();
  }

  get accessTypes(): DataProductType {
    if (this.accessPoints.length) {
      const lake = this.accessPoints.every(
        (e) => e instanceof V1_LakehouseAccessPoint,
      );
      if (lake) {
        return DataProductType.LAKEHOUSE;
      }
    }
    return DataProductType.UNKNOWN;
  }

  get dataSet(): DataAsset {
    return {
      description: `${this.productEntity.groupId}${GAV_DELIMITER}${this.productEntity.artifactId}`,
      provider: this.product.name,
      type: 'curated',
      moreInfo: this.accessTypes,
    };
  }
}

export class MarketplaceLakehouseStore implements CommandRegistrar {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseServerClient: MarketplaceLakehouseServerClient;
  productStates: DataProductState[] | undefined;
  loadingProductsState = ActionState.create();

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: MarketplaceLakehouseServerClient,
    depotServerClient: DepotServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    this.depotServerClient = depotServerClient;
    makeObservable(this, {
      init: flow,
      productStates: observable,
      setProducts: action,
    });
  }

  setProducts(data: DataProductState[] | undefined): void {
    this.productStates = data;
  }

  *init(): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const summaryP = (
        (yield this.depotServerClient.getEntitiesSummaryByClassifier(
          CORE_PURE_PATH.DATA_PRODUCT,
          {
            scope: DepotScope.RELEASES,
            summary: true,
          },
        )) as PlainObject<StoredSummaryEntity>[]
      ).map((p) => StoredSummaryEntity.serialization.fromJson(p));
      // for now we will do 2 calls;
      const allProducts = (
        (yield Promise.all(
          summaryP.map((p) =>
            this.depotServerClient
              .getVersionEntity(p.groupId, p.artifactId, p.versionId, p.path)
              .then((entity) => ({
                product: deserialize(
                  V1_dataProductModelSchema,
                  (entity as unknown as Entity).content,
                ),
                groupId: p.groupId,
                artifactId: p.artifactId,
                versionId: p.versionId,
              })),
          ),
        )) as DataProductEntity[]
      )
        .map((e) => new DataProductState(e, this))
        .sort((a, b) => a.product.name.localeCompare(b.product.name));
      this.setProducts(allProducts);
      this.loadingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.loadingProductsState.fail();
    }
  }

  registerCommands(): void {
    throw new Error('Method not implemented.');
  }
  deregisterCommands(): void {
    throw new Error('Method not implemented.');
  }
}
