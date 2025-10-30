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

import { makeObservable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import {
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  type DataProductSearchResult,
} from '@finos/legend-server-marketplace';
import { extractEntityNameFromPath } from '@finos/legend-storage';

export class ProductCardState {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly searchResult: DataProductSearchResult;
  readonly displayImage: string;

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    searchResult: DataProductSearchResult,
    displayImageMap: Map<string, string>,
  ) {
    makeObservable(this);

    this.marketplaceBaseStore = marketplaceBaseStore;
    this.searchResult = searchResult;
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
}
