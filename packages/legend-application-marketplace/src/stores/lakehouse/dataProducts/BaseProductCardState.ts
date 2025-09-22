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

import { flow, makeObservable } from 'mobx';
import { ActionState, type GeneratorFn } from '@finos/legend-shared';
import { type V1_DataProductIcon } from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';

export abstract class BaseProductCardState {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly initState = ActionState.create();
  displayImage!: string;

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    makeObservable(this, {
      init: flow,
    });
  }

  abstract init(): GeneratorFn<void>;

  abstract get title(): string;

  abstract get description(): string | undefined;

  abstract get guid(): string;

  abstract get icon(): V1_DataProductIcon | undefined;

  abstract get versionId(): string | undefined;

  dataProductImage(productImageMap: Map<string, string>): string {
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
