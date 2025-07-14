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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type V1_EntitlementsDataProductDetails,
  type V1_PureGraphManager,
  GraphManagerState,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { MarketplaceLakehouseStore } from '../MarketplaceLakehouseStore.js';
import { deserialize } from 'serializr';
import { type Entity } from '@finos/legend-storage';

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductDetailsAndElement {
  readonly dataProductState: DataProductState;
  readonly entitlementsDataProductDetails: V1_EntitlementsDataProductDetails;
  dataProductElement: V1_DataProduct | undefined;
  readonly loadingEntityState = ActionState.create();

  constructor(
    dataProductState: DataProductState,
    entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
  ) {
    this.dataProductState = dataProductState;
    this.entitlementsDataProductDetails = entitlementsDataProductDetails;

    makeObservable(this, {
      dataProductElement: observable,
      fetchDataProductElement: flow,
    });
  }

  *fetchDataProductElement(): GeneratorFn<void> {
    if (
      this.entitlementsDataProductDetails.origin instanceof
      V1_SdlcDeploymentDataProductOrigin
    ) {
      this.loadingEntityState.inProgress();
      try {
        const dataProductEntity = deserialize(
          V1_dataProductModelSchema,
          (
            (yield this.dataProductState.lakehouseState.depotServerClient.getVersionEntity(
              this.entitlementsDataProductDetails.origin.group,
              this.entitlementsDataProductDetails.origin.artifact,
              this.entitlementsDataProductDetails.origin.version,
              this.entitlementsDataProductDetails.id,
            )) as Entity
          ).content,
        );
        this.dataProductElement = dataProductEntity;
      } catch (error) {
        assertErrorThrown(error);
        this.dataProductState.lakehouseState.applicationStore.notificationService.notifyError(
          'Error fetching data product entity from SDLC deployment',
        );
      } finally {
        this.loadingEntityState.complete();
      }
    } else if (
      this.entitlementsDataProductDetails.origin instanceof
      V1_AdHocDeploymentDataProductOrigin
    ) {
      this.loadingEntityState.inProgress();
      try {
        const graphManagerState = new GraphManagerState(
          this.dataProductState.lakehouseState.applicationStore.pluginManager,
          this.dataProductState.lakehouseState.applicationStore.logService,
        );
        const entities: Entity[] =
          yield this.dataProductState.graphManager.pureCodeToEntities(
            this.entitlementsDataProductDetails.origin.definition,
          );
        yield this.dataProductState.graphManager.buildGraph(
          graphManagerState.graph,
          entities,
          ActionState.create(),
        );
        const dataProductEntity = guaranteeType(
          guaranteeNonNullable(
            this.dataProductState.graphManager.elementToProtocol(
              graphManagerState.graph.getElement(
                this.entitlementsDataProductDetails.id,
              ),
            ),
            `Unable to find ${this.entitlementsDataProductDetails.id} in deployed definition`,
          ),
          V1_DataProduct,
          `${this.entitlementsDataProductDetails.id} is not a data product`,
        );
        this.dataProductElement = dataProductEntity;
      } catch (error) {
        assertErrorThrown(error);
        this.dataProductState.lakehouseState.applicationStore.notificationService.notifyError(
          'Error fetching data product entity from ad-hoc deployment',
        );
      }
    }
  }
}

export class DataProductState {
  readonly lakehouseState: MarketplaceLakehouseStore;
  readonly graphManager: V1_PureGraphManager;
  readonly initState = ActionState.create();
  dataProductDetailsMap: Map<string, DataProductDetailsAndElement>;
  currentDataProductDetailsAndElement: DataProductDetailsAndElement | undefined;

  constructor(
    lakehouseState: MarketplaceLakehouseStore,
    graphManager: V1_PureGraphManager,
  ) {
    this.lakehouseState = lakehouseState;
    this.graphManager = graphManager;

    this.dataProductDetailsMap = new Map<
      string,
      DataProductDetailsAndElement
    >();

    makeObservable(this, {
      isInitialized: computed,
      versionOptions: computed,
      setSelectedVersion: action,
      dataProductDetailsMap: observable,
      currentDataProductDetailsAndElement: observable,
    });
  }

  get title(): string {
    return (
      this.currentDataProductDetailsAndElement?.dataProductElement?.title ?? ''
    );
  }

  get description(): string | undefined {
    return (
      this.currentDataProductDetailsAndElement?.dataProductElement
        ?.description ?? ''
    );
  }

  get icon(): string | undefined {
    return this.currentDataProductDetailsAndElement?.dataProductElement?.icon;
  }

  get imageUrl(): string | undefined {
    return this.currentDataProductDetailsAndElement?.dataProductElement
      ?.imageUrl;
  }

  get isInitialized(): boolean {
    return this.currentDataProductDetailsAndElement !== undefined;
  }

  get versionId(): string {
    const origin =
      this.currentDataProductDetailsAndElement?.entitlementsDataProductDetails
        .origin;
    return origin instanceof V1_SdlcDeploymentDataProductOrigin
      ? origin.version
      : origin instanceof V1_AdHocDeploymentDataProductOrigin
        ? `${
            this.currentDataProductDetailsAndElement
              ?.entitlementsDataProductDetails.deploymentId ?? 'Unknown'
          }`
        : 'default';
  }

  get environmentClassification():
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined {
    return this.currentDataProductDetailsAndElement
      ?.entitlementsDataProductDetails.lakehouseEnvironment?.type;
  }

  get versionOptions(): string[] {
    return Array.from(this.dataProductDetailsMap.keys());
  }

  get isLoading(): boolean {
    return Array.from(this.dataProductDetailsMap.values()).some(
      (detailsAndElement) => detailsAndElement.loadingEntityState.isInProgress,
    );
  }

  setSelectedVersion(versionId: string): void {
    this.currentDataProductDetailsAndElement =
      this.dataProductDetailsMap.get(versionId);
  }

  addDataProductDetails(
    dataProductDetails: V1_EntitlementsDataProductDetails,
  ): void {
    const detailsAndElement = new DataProductDetailsAndElement(
      this,
      dataProductDetails,
    );
    if (
      dataProductDetails.origin instanceof V1_SdlcDeploymentDataProductOrigin
    ) {
      this.dataProductDetailsMap.set(
        dataProductDetails.origin.version,
        detailsAndElement,
      );
    } else if (
      dataProductDetails.origin instanceof V1_AdHocDeploymentDataProductOrigin
    ) {
      this.dataProductDetailsMap.set(
        `${dataProductDetails.deploymentId}`,
        detailsAndElement,
      );
    } else {
      this.dataProductDetailsMap.set('default', detailsAndElement);
    }
    detailsAndElement.fetchDataProductElement();
  }
}
