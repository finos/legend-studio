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
  DepotScope,
  type DepotServerClient,
  extractDepotEntityInfo,
  type StoredEntity,
  type StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  isNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import type { DataSpaceOption } from '@finos/legend-extension-dsl-data-space/application-query';
import { action, flow, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { type LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  CORE_PURE_PATH,
  type V1_EntitlementsDataProductLite,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
  V1_entitlementsDataProductLiteResponseToDataProductLite,
} from '@finos/legend-graph';

const createDepotEntityFromLiteDataProduct = (
  value: V1_EntitlementsDataProductLite,
): DepotEntityWithOrigin | undefined => {
  if (value.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    const origin = {
      groupId: value.origin.group,
      artifactId: value.origin.artifact,
      versionId: value.origin.version,
    };

    return new DepotEntityWithOrigin(
      origin,
      value.title ?? value.id,
      value.fullPath ?? value.id,
      CORE_PURE_PATH.DATA_PRODUCT,
    );
  }
  // do not include non sdlc data products
  return undefined;
};

export type DataProductOption = {
  label: string;
  value: DepotEntityWithOrigin;
};

export type DataProductWithLegacyOption = DataSpaceOption | DataProductOption;

// Helper function to build option for both DataSpace and DataProduct
export const buildDataSpaceOrProductOption = (
  value: ResolvedDataSpaceEntityWithOrigin | DepotEntityWithOrigin,
): DataProductWithLegacyOption => {
  // For ResolvedDataSpaceEntityWithOrigin, use title if available, otherwise name
  // For DepotEntityWithOrigin, just use name
  const label =
    value instanceof ResolvedDataSpaceEntityWithOrigin
      ? (value.title ?? value.name)
      : value.name;
  return {
    label,
    value: value,
  };
};

export class DataProductSelectorState {
  legacyDataProducts: ResolvedDataSpaceEntityWithOrigin[] | undefined;
  dataProducts: DepotEntityWithOrigin[] | undefined;
  readonly loadProductsState = ActionState.create();
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseContractServerClient:
    | LakehouseContractServerClient
    | undefined;
  readonly applicationStore: LegendQueryApplicationStore;
  disableDataProducts = false;

  constructor(
    depotServerClient: DepotServerClient,
    applicationStore: LegendQueryApplicationStore,
    lakehouseContractServerClient?: LakehouseContractServerClient,
  ) {
    makeObservable(this, {
      legacyDataProducts: observable,
      dataProducts: observable,
      loadProductsState: observable,
      loadProducts: flow,
      setLegacyDataProducts: action,
      setDataProducts: action,
      clearProducts: action,
    });
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.lakehouseContractServerClient = lakehouseContractServerClient;

    // TEMPORARY: Disable data products when NonProductionFeatureFlag is off.
    // Remove once the feature is fully tested.
    const configOptions = applicationStore.config.options;
    this.disableDataProducts = !configOptions.NonProductionFeatureFlag;
  }

  setLegacyDataProducts(val: ResolvedDataSpaceEntityWithOrigin[]): void {
    this.legacyDataProducts = val;
  }

  setDataProducts(val: DepotEntityWithOrigin[]): void {
    this.dataProducts = val;
  }

  clearProducts(): void {
    this.legacyDataProducts = undefined;
    this.dataProducts = undefined;
  }

  get isFetchingProducts(): boolean {
    return this.loadProductsState.isInProgress;
  }

  get isCompletelyLoaded(): boolean {
    return Boolean(this.legacyDataProducts) && Boolean(this.dataProducts);
  }

  *loadProducts(): GeneratorFn<void> {
    this.loadProductsState.inProgress();
    try {
      const accessToken = this.applicationStore.getAccessToken();
      // Load DataSpaces
      const dataSpaces = (
        (yield this.depotServerClient.getEntitiesByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => {
        return extractDataSpaceInfo(storedEntity, false);
      });
      const dataProducts = this.disableDataProducts
        ? []
        : this.lakehouseContractServerClient
          ? V1_entitlementsDataProductLiteResponseToDataProductLite(
              yield this.lakehouseContractServerClient.getAllLiteDataProducts(
                V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
                undefined,
                accessToken,
              ),
            )
              .map(createDepotEntityFromLiteDataProduct)
              .filter(isNonNullable)
          : (
              (yield this.depotServerClient.getEntitiesSummaryByClassifier(
                CORE_PURE_PATH.DATA_PRODUCT,
                {
                  scope: DepotScope.RELEASES,
                  summary: true,
                },
              )) as StoredSummaryEntity[]
            ).map((storedEntity) => {
              return extractDepotEntityInfo(storedEntity, false);
            });
      // Set both lists separately
      this.legacyDataProducts = dataSpaces;
      this.dataProducts = dataProducts;
      this.loadProductsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProductsState.fail();
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        error,
      );
    }
  }

  get dataProductOptions(): DataProductWithLegacyOption[] {
    return [
      ...(this.legacyDataProducts?.map(buildDataSpaceOrProductOption) ?? []),
      ...(this.dataProducts?.map(buildDataSpaceOrProductOption) ?? []),
    ];
  }
}
