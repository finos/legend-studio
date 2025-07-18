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
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsLakehouseEnvironmentType,
  type V1_PureGraphManager,
  DataProduct,
  GraphManagerState,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { MarketplaceLakehouseStore } from '../MarketplaceLakehouseStore.js';
import { deserialize } from 'serializr';
import { type Entity } from '@finos/legend-storage';

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductState {
  readonly lakehouseState: MarketplaceLakehouseStore;
  readonly graphManager: V1_PureGraphManager;
  readonly initState = ActionState.create();
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
    if (
      this.dataProductDetails.origin instanceof
      V1_SdlcDeploymentDataProductOrigin
    ) {
      try {
        const dataProductEntity = deserialize(
          V1_dataProductModelSchema,
          (
            (yield this.lakehouseState.depotServerClient.getVersionEntity(
              this.dataProductDetails.origin.group,
              this.dataProductDetails.origin.artifact,
              this.dataProductDetails.origin.version,
              this.dataProductDetails.id,
            )) as PlainObject<Entity>
          ).content,
        );
        this.dataProductElement = dataProductEntity;
      } catch (error) {
        assertErrorThrown(error);
        this.lakehouseState.applicationStore.notificationService.notifyError(
          'Error fetching data product entity from SDLC deployment',
        );
      } finally {
        this.initState.complete();
      }
    } else if (
      this.dataProductDetails.origin instanceof
      V1_AdHocDeploymentDataProductOrigin
    ) {
      try {
        const graphManagerState = new GraphManagerState(
          this.lakehouseState.applicationStore.pluginManager,
          this.lakehouseState.applicationStore.logService,
        );
        const entities: Entity[] = yield this.graphManager.pureCodeToEntities(
          this.dataProductDetails.origin.definition,
        );
        yield this.graphManager.buildGraph(
          graphManagerState.graph,
          entities,
          ActionState.create(),
        );
        const dataProductEntity = guaranteeType(
          this.graphManager.elementToProtocol(
            guaranteeNonNullable(
              graphManagerState.graph.allElements.find(
                (element) =>
                  element instanceof DataProduct &&
                  element.name.toLowerCase() ===
                    this.dataProductDetails.id.toLowerCase(),
              ),
              `Unable to find ${this.dataProductDetails.id} in deployed definition`,
            ),
          ),
          V1_DataProduct,
          `${this.dataProductDetails.id} is not a data product`,
        );
        this.dataProductElement = dataProductEntity;
      } catch (error) {
        assertErrorThrown(error);
        this.lakehouseState.applicationStore.notificationService.notifyError(
          'Error fetching data product entity from ad-hoc deployment',
        );
      } finally {
        this.initState.complete();
      }
    }
    this.initState.complete();
  }

  get title(): string {
    return this.dataProductElement?.title ?? '';
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

  get versionId(): string {
    const origin = this.dataProductDetails.origin;
    return origin instanceof V1_SdlcDeploymentDataProductOrigin
      ? origin.version
      : origin instanceof V1_AdHocDeploymentDataProductOrigin
        ? 'AdHoc'
        : 'Unknown';
  }

  get environmentClassification():
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined {
    return this.dataProductDetails.lakehouseEnvironment?.type;
  }
}
