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

import { CORE_PURE_PATH } from '@finos/legend-graph';
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
  type GeneratorFn,
} from '@finos/legend-shared';
import type { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import type { DataSpaceOption } from '@finos/legend-extension-dsl-data-space/application-query';
import { action, flow, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';

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
  readonly applicationStore: LegendQueryApplicationStore;
  disableDataProducts = false;

  constructor(
    depotServerClient: DepotServerClient,
    applicationStore: LegendQueryApplicationStore,
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
