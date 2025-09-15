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

import { isNonEmptyString } from '@finos/legend-shared';
import {
  type V1_DataProductIcon,
  type V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import { BaseProductCardState } from './BaseProductCardState.js';
import type { V1_DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

export class LegacyDataProductCardState extends BaseProductCardState {
  readonly dataSpace: V1_DataSpace;
  readonly groupId: string;
  readonly artifactId: string;
  readonly _versionId: string;

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    dataSpace: V1_DataSpace,
    groupId: string,
    artifactId: string,
    versionId: string,
  ) {
    super(marketplaceBaseStore);

    this.dataSpace = dataSpace;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this._versionId = versionId;
  }

  *init() {
    this.initState.complete();
  }

  get title(): string {
    return isNonEmptyString(this.dataSpace.title)
      ? this.dataSpace.title
      : this.dataSpace.name;
  }

  get description(): string | undefined {
    return this.dataSpace.description;
  }

  get guid(): string {
    return `${this.groupId}:${this.artifactId}:${this._versionId}`;
  }

  get icon(): V1_DataProductIcon | undefined {
    return undefined;
  }

  get versionId(): string | undefined {
    return this._versionId;
  }

  get isSdlcDeployed(): boolean {
    return true;
  }

  get isAdHocDeployed(): boolean {
    return false;
  }

  get environmentClassification():
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined {
    return undefined;
  }
}
