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
import {
  ActionState,
  assertErrorThrown,
  isNonEmptyString,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type V1_DataProductIcon,
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsLakehouseEnvironmentType,
  type V1_PureGraphManager,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import { getDataProductFromDetails } from '../LakehouseUtils.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../../__lib__/LegendMarketplaceAppEvent.js';
import { BaseProductCardState } from './BaseProductCardState.js';

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

const getDataProductDescriptorFromDetails = (
  details: V1_EntitlementsDataProductDetails,
): string => {
  let name = details.dataProduct.name;
  const origin = details.origin;
  if (origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    name += ` (${origin.artifact}:${origin.group}:${origin.version})`;
  } else if (origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    name += ` (Adhoc)`;
  }
  return name;
};

export class DataProductCardState extends BaseProductCardState {
  readonly graphManager: V1_PureGraphManager;
  readonly dataProductDetails: V1_EntitlementsDataProductDetails;
  dataProductElement: V1_DataProduct | undefined;

  readonly enrichedState = ActionState.create();

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    graphManager: V1_PureGraphManager,
    dataProductDetails: V1_EntitlementsDataProductDetails,
    displayImageMap: Map<string, string>,
  ) {
    super(marketplaceBaseStore);
    this.graphManager = graphManager;
    this.dataProductDetails = dataProductDetails;

    makeObservable(this, {
      dataProductElement: observable,
    });

    this.displayImage = this.dataProductImage(displayImageMap);
  }

  *init(): GeneratorFn<void> {
    this.initState.inProgress();
    try {
      if (
        this.dataProductDetails.title !== undefined ||
        this.dataProductDetails.description !== undefined
      ) {
        // To save load time, we create a temporary data product element with the title and
        // description, and then we will enrich it with the actual data product element after.
        const dataProductElement = new V1_DataProduct();
        dataProductElement.title = this.dataProductDetails.title;
        dataProductElement.description = this.dataProductDetails.description;
        this.dataProductElement = dataProductElement;
        this.initState.complete();
      }
      this.enrichedState.inProgress();
      this.dataProductElement = (yield getDataProductFromDetails(
        this.dataProductDetails,
        this.graphManager,
        this.marketplaceBaseStore,
      )) as V1_DataProduct | undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.logService.warn(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.FETCH_DATA_PRODUCT_FAILURE,
        ),
        `Failed to load data product with identifier ${getDataProductDescriptorFromDetails(this.dataProductDetails)}: ${error.message}`,
        error.message,
      );
    } finally {
      this.initState.complete();
      this.enrichedState.complete();
    }
  }

  get title(): string {
    return isNonEmptyString(this.dataProductDetails.title)
      ? this.dataProductDetails.title
      : isNonEmptyString(this.dataProductElement?.title)
        ? this.dataProductElement.title
        : this.dataProductDetails.dataProduct.name;
  }

  get description(): string | undefined {
    return isNonEmptyString(this.dataProductDetails.description)
      ? this.dataProductDetails.description
      : (this.dataProductElement?.description ?? '');
  }

  get guid(): string {
    return `${this.dataProductDetails.id}-${this.dataProductDetails.deploymentId}`;
  }

  get icon(): V1_DataProductIcon | undefined {
    return this.dataProductElement?.icon;
  }

  get versionId(): string | undefined {
    const origin = this.dataProductDetails.origin;
    return origin instanceof V1_SdlcDeploymentDataProductOrigin
      ? origin.version
      : origin instanceof V1_AdHocDeploymentDataProductOrigin
        ? 'Sandbox'
        : undefined;
  }

  get environmentClassification():
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined {
    return this.dataProductDetails.lakehouseEnvironment?.type;
  }
}
