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
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type V1_DataProduct,
  type V1_PureGraphManager,
  V1_EntitlementsDataProductDetails,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import {
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  type DataProductSearchResult,
} from '@finos/legend-server-marketplace';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../../__lib__/LegendMarketplaceAppEvent.js';
import { getDataProductFromDetails } from '../../../utils/LakehouseUtils.js';
import {
  V1_deserializeDataSpace,
  type V1_DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';

const getDataProductDescriptorFromSearchResult = (
  searchResult: DataProductSearchResult,
): string => {
  let name = searchResult.data_product_name;
  if (
    searchResult.dataProductDetails instanceof
    LakehouseDataProductSearchResultDetails
  ) {
    const origin = searchResult.dataProductDetails.origin;
    if (origin instanceof LakehouseSDLCDataProductSearchResultOrigin) {
      name += ` (${origin.groupId}:${origin.artifactId}:${origin.versionId})`;
    } else if (origin instanceof LakehouseAdHocDataProductSearchResultOrigin) {
      name += ` (Adhoc)`;
    }
  } else if (
    searchResult.dataProductDetails instanceof
    LegacyDataProductSearchResultDetails
  ) {
    name += ` (${searchResult.dataProductDetails.groupId}:${searchResult.dataProductDetails.artifactId}:${searchResult.dataProductDetails.versionId})`;
  }
  return name;
};

export class ProductCardState {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly searchResult: DataProductSearchResult;
  readonly graphManager: V1_PureGraphManager;
  readonly initState = ActionState.create();
  readonly displayImage: string;
  dataProductElement: V1_DataProduct | V1_DataSpace | undefined;

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    searchResult: DataProductSearchResult,
    graphManager: V1_PureGraphManager,
    displayImageMap: Map<string, string>,
  ) {
    makeObservable(this, {
      dataProductElement: observable,
      setDataProductElement: action,
      init: flow,
    });

    this.marketplaceBaseStore = marketplaceBaseStore;
    this.searchResult = searchResult;
    this.graphManager = graphManager;
    this.displayImage = this.getDataProductImage(displayImageMap);
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initState.inProgress();
    try {
      if (
        this.searchResult.dataProductDetails instanceof
        LakehouseDataProductSearchResultDetails
      ) {
        const dataProduct =
          this.searchResult.dataProductDetails.origin instanceof
          LakehouseSDLCDataProductSearchResultOrigin
            ? yield this.getLakehouseSDLCDataProduct(
                this.searchResult.dataProductDetails.origin,
              )
            : yield this.getLakehouseAdHocDataProduct(
                this.searchResult.dataProductDetails,
                token,
              );
        this.setDataProductElement(dataProduct);
      } else if (
        this.searchResult.dataProductDetails instanceof
        LegacyDataProductSearchResultDetails
      ) {
        const dataProduct = yield this.getLegacyDataProduct(
          this.searchResult.dataProductDetails,
        );
        this.setDataProductElement(dataProduct);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.FETCH_DATA_PRODUCT_FAILURE,
        ),
        `Failed to load data product with identifier ${getDataProductDescriptorFromSearchResult(this.searchResult)}: ${error.message}`,
        error.message,
      );
    } finally {
      this.initState.complete();
    }
  }

  get title(): string {
    return this.searchResult.data_product_name;
  }

  get description(): string {
    return this.searchResult.data_product_description;
  }

  get guid(): string {
    return this.searchResult.data_product_name;
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

  setDataProductElement(value: V1_DataProduct | undefined): void {
    this.dataProductElement = value;
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

  async getLakehouseSDLCDataProduct(
    searchResultOrigin: LakehouseSDLCDataProductSearchResultOrigin,
  ): Promise<V1_DataProduct | undefined> {
    // Build V1_EntitlementsDataProductDetails
    const origin = new V1_SdlcDeploymentDataProductOrigin();
    origin.group = searchResultOrigin.groupId;
    origin.artifact = searchResultOrigin.artifactId;
    origin.version = searchResultOrigin.versionId;
    const entitlementsDataProductDetails =
      new V1_EntitlementsDataProductDetails();
    entitlementsDataProductDetails.origin = origin;

    // Fetch data product entity
    const v1_dataProduct = await getDataProductFromDetails(
      entitlementsDataProductDetails,
      this.graphManager,
      this.marketplaceBaseStore,
    );

    return v1_dataProduct;
  }

  async getLakehouseAdHocDataProduct(
    searchResultDetails: LakehouseDataProductSearchResultDetails,
    token: string | undefined,
  ): Promise<V1_DataProduct | undefined> {
    const rawResponse =
      await this.marketplaceBaseStore.lakehouseContractServerClient.getDataProductByIdAndDID(
        searchResultDetails.dataProductId,
        searchResultDetails.did,
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
