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

import { flow, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsLakehouseEnvironmentType,
  type V1_PureGraphManager,
  GraphManagerState,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { MarketplaceLakehouseStore } from '../MarketplaceLakehouseStore.js';
import { getDataProductFromDetails } from '../LakehouseUtils.js';

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductState {
  readonly lakehouseState: MarketplaceLakehouseStore;
  readonly graphManager: V1_PureGraphManager;
  readonly initState = ActionState.create();
  readonly enrichedState = ActionState.create();
  readonly dataProductDetails: V1_EntitlementsDataProductDetails;
  dataProductElement: V1_DataProduct | undefined;

  constructor(
    lakehouseState: MarketplaceLakehouseStore,
    graphManager: V1_PureGraphManager,
    dataProductDetails: V1_EntitlementsDataProductDetails,
  ) {
    this.lakehouseState = lakehouseState;
    this.graphManager = graphManager;
    this.dataProductDetails = dataProductDetails;

    makeObservable(this, {
      dataProductElement: observable,
      init: flow,
    });
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
      const graphManagerState = new GraphManagerState(
        this.lakehouseState.applicationStore.pluginManager,
        this.lakehouseState.applicationStore.logService,
      );
      this.dataProductElement = (yield getDataProductFromDetails(
        this.dataProductDetails,
        graphManagerState,
        this.graphManager,
        this.lakehouseState.marketplaceBaseStore,
      )) as V1_DataProduct | undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseState.applicationStore.notificationService.notifyError(
        'Error fetching data product entity',
        error.message,
      );
    } finally {
      this.initState.complete();
      this.enrichedState.complete();
    }
  }

  get title(): string {
    return this.dataProductElement?.title !== undefined &&
      this.dataProductElement.title !== ''
      ? this.dataProductElement.title
      : this.dataProductDetails.dataProduct.name;
  }

  get description(): string | undefined {
    return this.dataProductElement?.description ?? '';
  }

  get icon(): string | undefined {
    return this.dataProductElement?.icon;
  }

  get imageUrl(): string | undefined {
    return this.dataProductElement?.imageUrl;
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
