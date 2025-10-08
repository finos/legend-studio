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
  type V1_DataProductArtifact,
  type V1_EngineServerClient,
} from '@finos/legend-graph';
import { makeObservable } from 'mobx';
import { BaseViewerState } from '../BaseViewerState.js';
import { DataProductLayoutState } from '../BaseLayoutState.js';
import { DATA_PRODUCT_VIEWER_SECTION } from '../ProductViewerNavigation.js';
import { type UserSearchService } from '@finos/legend-shared';
import { DataProductAPGState } from './DataProductAPGState.js';
import type { DataProductConfig } from './DataProductConfig.js';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly engineServerClient: V1_EngineServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly apgStates: DataProductAPGState[];
  readonly userSearchService: UserSearchService | undefined;
  readonly dataProductConfig: DataProductConfig | undefined;
  readonly projectGAV: ProjectGAVCoordinates | undefined;
  readonly artifactGeneration: V1_DataProductArtifact | undefined;

  // actions
  readonly viewDataProductSource?: (() => void) | undefined;
  readonly openPowerBi?: ((apg: string) => void) | undefined;
  readonly openDataCube?: ((sourceData: object) => void) | undefined;

  constructor(
    product: V1_DataProduct,
    applicationStore: GenericLegendApplicationStore,
    engineServerClient: V1_EngineServerClient,
    graphManagerState: GraphManagerState,
    dataProductConfig: DataProductConfig | undefined,
    userSearchService: UserSearchService | undefined,
    projectGAV: ProjectGAVCoordinates | undefined,
    artifactGeneration: V1_DataProductArtifact | undefined,
    actions: {
      viewDataProductSource?: (() => void) | undefined;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
      openPowerBi?: ((apg: string) => void) | undefined;
      openDataCube?: (sourceData: object) => void;
    },
  ) {
    super(product, applicationStore, new DataProductLayoutState(), actions);

    makeObservable(this);

    this.apgStates = this.product.accessPointGroups.map(
      (e) => new DataProductAPGState(e, this),
    );
    this.engineServerClient = engineServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
    this.dataProductConfig = dataProductConfig;
    this.projectGAV = projectGAV;
    this.artifactGeneration = artifactGeneration;

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
}
