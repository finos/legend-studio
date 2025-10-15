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

import type {
  GenericLegendApplicationStore,
  NavigationZone,
} from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_DataProduct,
  type V1_EngineServerClient,
  type V1_EntitlementsDataProductDetails,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  V1_DataProductArtifact,
} from '@finos/legend-graph';
import { flow, makeObservable, observable } from 'mobx';
import { BaseViewerState } from '../BaseViewerState.js';
import { DataProductLayoutState } from '../BaseLayoutState.js';
import { DATA_PRODUCT_VIEWER_SECTION } from '../ProductViewerNavigation.js';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
} from '@finos/legend-shared';
import { DataProductAPGState } from './DataProductAPGState.js';
import type { DataProductConfig } from './DataProductConfig.js';
import {
  StoredFileGeneration,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  type DepotServerClient,
  resolveVersion,
  StoreProjectData,
} from '@finos/legend-server-depot';

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly engineServerClient: V1_EngineServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly apgStates: DataProductAPGState[];
  readonly userSearchService: UserSearchService | undefined;
  readonly dataProductConfig: DataProductConfig | undefined;
  readonly projectGAV: ProjectGAVCoordinates | undefined;
  artifactGeneration: V1_DataProductArtifact | undefined;

  // actions
  readonly viewDataProductSource?: (() => void) | undefined;
  readonly openPowerBi?: ((apg: string) => void) | undefined;
  readonly openDataCube?: ((sourceData: object) => void) | undefined;

  readonly fetchingArtifactGenerationState = ActionState.create();

  constructor(
    product: V1_DataProduct,
    applicationStore: GenericLegendApplicationStore,
    engineServerClient: V1_EngineServerClient,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    dataProductConfig: DataProductConfig | undefined,
    userSearchService: UserSearchService | undefined,
    projectGAV: ProjectGAVCoordinates | undefined,
    actions: {
      viewDataProductSource?: (() => void) | undefined;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
      openPowerBi?: ((apg: string) => void) | undefined;
      openDataCube?: (sourceData: object) => void;
    },
  ) {
    super(product, applicationStore, new DataProductLayoutState(), actions);

    makeObservable(this, {
      artifactGeneration: observable,
      init: flow,
    });

    this.apgStates = this.product.accessPointGroups.map(
      (e) => new DataProductAPGState(e, this),
    );
    this.engineServerClient = engineServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
    this.dataProductConfig = dataProductConfig;
    this.projectGAV = projectGAV;

    // actions
    this.viewDataProductSource = actions.viewDataProductSource;
    this.openPowerBi = actions.openPowerBi;
    this.openDataCube = actions.openDataCube;
  }

  public override getTitle(): string | undefined {
    return this.product.title;
  }

  public override getPath(): string | undefined {
    return this.product.path;
  }

  public override getName(): string | undefined {
    return this.product.name;
  }

  protected getValidSections(): string[] {
    return Object.values(DATA_PRODUCT_VIEWER_SECTION).map((section) =>
      section.toString(),
    );
  }

  async fetchDataProductArtifactGeneration(): Promise<
    V1_DataProductArtifact | undefined
  > {
    this.fetchingArtifactGenerationState.inProgress();
    let artifact: V1_DataProductArtifact | undefined;
    try {
      if (this.projectGAV !== undefined) {
        const storeProject = new StoreProjectData();
        storeProject.groupId = this.projectGAV.groupId;
        storeProject.artifactId = this.projectGAV.artifactId;
        const files = (
          (await this.depotServerClient.getGenerationFilesByType(
            storeProject,
            resolveVersion(this.projectGAV.versionId),
            V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
          )) as PlainObject<StoredFileGeneration>[]
        ).map((rawFile) =>
          StoredFileGeneration.serialization.fromJson(rawFile),
        );
        const fileGen = files.filter((e) => e.path === this.product.path)[0]
          ?.file.content;
        if (fileGen) {
          const content: PlainObject = JSON.parse(fileGen) as PlainObject;
          artifact = V1_DataProductArtifact.serialization.fromJson(content);
          return artifact;
        } else {
          throw new Error(
            `Artifact generation not found for data product: ${storeProject.groupId}:${storeProject.artifactId}:${this.projectGAV.versionId}/${this.product.path}`,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error.message);
    } finally {
      this.fetchingArtifactGenerationState.complete();
    }
    return artifact;
  }

  *init(
    entitlementsDataProductDetails?: V1_EntitlementsDataProductDetails,
  ): GeneratorFn<void> {
    const artifactGenerationPromise = this.fetchDataProductArtifactGeneration();
    this.apgStates.map((apgState) =>
      apgState.init(artifactGenerationPromise, entitlementsDataProductDetails),
    );
    const artifactGeneration = yield artifactGenerationPromise;
    this.artifactGeneration = artifactGeneration;
  }
}
