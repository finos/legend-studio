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

import { action, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import {
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  type DataProductSearchResult,
} from '@finos/legend-server-marketplace';
import { extractEntityNameFromPath } from '@finos/legend-storage';
import {
  type V1_DataProductIcon,
  type V1_PureGraphManager,
  V1_DataProduct,
  V1_EntitlementsDataProductDetails,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import {
  V1_deserializeDataSpace,
  type V1_DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../../__lib__/LegendMarketplaceAppEvent.js';
import { getDataProductFromDetails } from '../../../utils/LakehouseUtils.js';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';

export class ProductCardState {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly searchResult: DataProductSearchResult;
  readonly displayImage: string;
  readonly graphManager: V1_PureGraphManager;
  dataProductElement: V1_DataProduct | V1_DataSpace | undefined;
  lakehouseEnvironment: IngestDeploymentServerConfig | undefined;
  lakehouseOwners: string[] = [];

  readonly initState = ActionState.create();
  readonly fetchingOwnersState = ActionState.create();

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    searchResult: DataProductSearchResult,
    graphManager: V1_PureGraphManager,
    displayImageMap: Map<string, string>,
  ) {
    makeObservable(this, {
      dataProductElement: observable,
      lakehouseEnvironment: observable,
      lakehouseOwners: observable,
      setDataProductElement: action,
      setLakehouseEnvironment: action,
      setLakehouseOwners: action,
      init: flow,
      fetchOwners: flow,
    });

    this.marketplaceBaseStore = marketplaceBaseStore;
    this.searchResult = searchResult;
    this.graphManager = graphManager;
    this.displayImage = this.getDataProductImage(displayImageMap);
  }

  get title(): string {
    return this.searchResult.dataProductTitle ?? this.dataProductId;
  }

  get description(): string {
    return this.searchResult.dataProductDescription ?? '';
  }

  get dataProductId(): string {
    return this.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails
      ? this.searchResult.dataProductDetails.dataProductId
      : this.searchResult.dataProductDetails instanceof
          LegacyDataProductSearchResultDetails
        ? extractEntityNameFromPath(this.searchResult.dataProductDetails.path)
        : 'unknown';
  }

  get guid(): string {
    return this.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails
      ? `${this.searchResult.dataProductDetails.dataProductId}:${this.searchResult.dataProductDetails.deploymentId}`
      : this.searchResult.dataProductDetails instanceof
          LegacyDataProductSearchResultDetails
        ? `${this.searchResult.dataProductDetails.groupId}:${this.searchResult.dataProductDetails.artifactId}:${this.searchResult.dataProductDetails.versionId}:${this.searchResult.dataProductDetails.path}`
        : (this.searchResult.dataProductTitle ?? '');
  }

  get versionId(): string | undefined {
    return this.searchResult.dataProductDetails instanceof
      LegacyDataProductSearchResultDetails
      ? this.searchResult.dataProductDetails.versionId
      : this.searchResult.dataProductDetails instanceof
            LakehouseDataProductSearchResultDetails &&
          this.searchResult.dataProductDetails.origin instanceof
            LakehouseSDLCDataProductSearchResultOrigin
        ? this.searchResult.dataProductDetails.origin.versionId
        : undefined;
  }

  get icon(): V1_DataProductIcon | undefined {
    return this.dataProductElement instanceof V1_DataProduct
      ? this.dataProductElement.icon
      : undefined;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initState.inProgress();
    try {
      if (
        this.searchResult.dataProductDetails instanceof
        LakehouseDataProductSearchResultDetails
      ) {
        yield Promise.all([
          (async (
            _dataProductDetails: LakehouseDataProductSearchResultDetails,
          ) => {
            const dataProduct = await this.getLakehouseDataProduct(
              _dataProductDetails,
              token,
            );
            this.setDataProductElement(dataProduct);
          })(this.searchResult.dataProductDetails),
          (async (
            _dataProductDetails: LakehouseDataProductSearchResultDetails,
          ) => {
            const lakehouseEnvironment =
              await this.marketplaceBaseStore.lakehouseDataProductService.getOrFetchEnvironmentForDID(
                _dataProductDetails.deploymentId,
                token,
              );
            this.setLakehouseEnvironment(lakehouseEnvironment);
          })(this.searchResult.dataProductDetails),
        ]);
      } else if (
        this.searchResult.dataProductDetails instanceof
        LegacyDataProductSearchResultDetails
      ) {
        const dataProduct = (yield this.getLegacyDataProduct(
          this.searchResult.dataProductDetails,
        )) as V1_DataProduct | undefined;
        this.setDataProductElement(dataProduct);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.FETCH_DATA_PRODUCT_FAILURE,
        ),
        `Failed to load data product with identifier ${this.guid}: ${error.message}`,
        error.message,
      );
    } finally {
      this.initState.complete();
    }
  }

  *fetchOwners(token: string | undefined): GeneratorFn<void> {
    if (
      this.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails
    ) {
      this.fetchingOwnersState.inProgress();
      try {
        const owners =
          (yield this.marketplaceBaseStore.lakehouseDataProductService.getOrFetchOwnersForDID(
            this.searchResult.dataProductDetails.deploymentId,
            token,
          )) as string[];
        this.setLakehouseOwners(owners);
      } catch (error) {
        assertErrorThrown(error);
        this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
          `Failed to fetch owners for data product ${this.dataProductId}: ${error.message}`,
        );
      } finally {
        this.fetchingOwnersState.complete();
      }
    }
  }

  setDataProductElement(value: V1_DataProduct | undefined): void {
    this.dataProductElement = value;
  }

  setLakehouseEnvironment(
    value: IngestDeploymentServerConfig | undefined,
  ): void {
    this.lakehouseEnvironment = value;
  }

  setLakehouseOwners(value: string[]): void {
    this.lakehouseOwners = value;
  }

  getDataProductImage(productImageMap: Map<string, string>): string {
    const maxImageCount = 7;
    const existingImage = productImageMap.get(this.title);
    if (existingImage) {
      return existingImage;
    }

    const randomIndex = Math.floor(Math.random() * maxImageCount) + 1;
    const selectedImage = `/assets/images${randomIndex}.jpg`;
    productImageMap.set(this.title, selectedImage);
    return selectedImage;
  }

  async getLakehouseDataProduct(
    searchResultDetails: LakehouseDataProductSearchResultDetails,
    token: string | undefined,
  ): Promise<V1_DataProduct | undefined> {
    if (
      searchResultDetails.origin instanceof
      LakehouseSDLCDataProductSearchResultOrigin
    ) {
      // Build V1_EntitlementsDataProductDetails
      const entitlementsDataProductDetails =
        new V1_EntitlementsDataProductDetails();
      entitlementsDataProductDetails.id = searchResultDetails.dataProductId;
      entitlementsDataProductDetails.deploymentId =
        searchResultDetails.deploymentId;
      const origin = new V1_SdlcDeploymentDataProductOrigin();
      origin.group = searchResultDetails.origin.groupId;
      origin.artifact = searchResultDetails.origin.artifactId;
      origin.version = searchResultDetails.origin.versionId;
      entitlementsDataProductDetails.origin = origin;

      // Fetch data product entity
      const v1_dataProduct = await getDataProductFromDetails(
        entitlementsDataProductDetails,
        this.graphManager,
        this.marketplaceBaseStore,
      );

      return v1_dataProduct;
    } else if (
      searchResultDetails.origin instanceof
      LakehouseAdHocDataProductSearchResultOrigin
    ) {
      const rawResponse =
        await this.marketplaceBaseStore.lakehouseContractServerClient.getDataProductByIdAndDID(
          searchResultDetails.dataProductId,
          searchResultDetails.deploymentId,
          token,
        );
      const entitlementsDataProductDetails = guaranteeNonNullable(
        V1_entitlementsDataProductDetailsResponseToDataProductDetails(
          rawResponse,
        )[0],
      );

      // Build data product entity
      const v1_dataProduct = await getDataProductFromDetails(
        entitlementsDataProductDetails,
        this.graphManager,
        this.marketplaceBaseStore,
      );

      return v1_dataProduct;
    }
    return undefined;
  }

  async getLegacyDataProduct(
    searchResultDetails: LegacyDataProductSearchResultDetails,
  ): Promise<V1_DataSpace | undefined> {
    const dataSpaceEntity = (
      await this.marketplaceBaseStore.depotServerClient.getVersionEntity(
        searchResultDetails.groupId,
        searchResultDetails.artifactId,
        searchResultDetails.versionId,
        searchResultDetails.path,
      )
    ).content as PlainObject<V1_DataSpace>;
    const dataSpace = V1_deserializeDataSpace(dataSpaceEntity);
    return dataSpace;
  }
}
