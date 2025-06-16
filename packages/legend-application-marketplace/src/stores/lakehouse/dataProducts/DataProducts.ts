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

import { action, computed, makeObservable, observable } from 'mobx';
import { ActionState, isNonEmptyString, uuid } from '@finos/legend-shared';
import {
  ELEMENT_PATH_DELIMITER,
  type V1_DataProduct,
  type V1_DataProductArtifactGeneration,
  type V1_DataProductDefinitionAndArtifact,
} from '@finos/legend-graph';
import type { MarketplaceLakehouseStore } from '../MarketplaceLakehouseStore.js';

export class DataProductEntity {
  product: V1_DataProduct | undefined;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;

  loadingEntityState = ActionState.create();

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.path = path;

    makeObservable(this, {
      groupId: observable,
      artifactId: observable,
      versionId: observable,
      path: observable,
      product: observable,
      loadingEntityState: observable,
      setProduct: action,
      title: computed,
    });
  }

  setProduct(product: V1_DataProduct | undefined): void {
    this.product = product;
  }

  get title(): string {
    return (
      this.product?.title ?? this.path.split(ELEMENT_PATH_DELIMITER).pop() ?? ''
    );
  }
}

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export abstract class BaseDataProductState {
  readonly state: MarketplaceLakehouseStore;
  readonly id: string;
  abstract accessTypes: DataProductType;
  abstract isLoading: boolean;
  abstract title: string;
  abstract description: string | undefined;
  abstract icon: string | undefined;
  abstract imageUrl: string | undefined;
  abstract isInitialized: boolean;
  abstract versionOptions: string[];
  abstract setSelectedVersion(versionId: string): void;

  constructor(state: MarketplaceLakehouseStore) {
    this.id = uuid();
    this.state = state;

    makeObservable(this, {
      id: observable,
      accessTypes: computed,
      isLoading: computed,
      title: computed,
      description: computed,
      icon: computed,
      imageUrl: computed,
      isInitialized: computed,
      versionOptions: computed,
      setSelectedVersion: action,
    });
  }
}

export class DataProductState extends BaseDataProductState {
  productEntityMap: Map<string, DataProductEntity>;
  currentProductEntity: DataProductEntity | undefined;

  constructor(state: MarketplaceLakehouseStore) {
    super(state);

    this.productEntityMap = new Map<string, DataProductEntity>();

    makeObservable(this, {
      productEntityMap: observable,
      currentProductEntity: observable,
      setProductEntity: action,
    });
  }

  get accessTypes(): DataProductType {
    return DataProductType.LAKEHOUSE;
  }

  get isLoading(): boolean {
    return this.productEntityMap
      .values()
      .some((entity) => entity.loadingEntityState.isInProgress);
  }

  get title(): string {
    return this.currentProductEntity?.title ?? '';
  }

  get description(): string | undefined {
    return this.currentProductEntity?.product?.description ?? '';
  }

  get icon(): string | undefined {
    return this.currentProductEntity?.product?.icon;
  }

  get imageUrl(): string | undefined {
    return this.currentProductEntity?.product?.imageUrl;
  }

  get isInitialized(): boolean {
    return this.currentProductEntity !== undefined;
  }

  get versionId(): string {
    return this.currentProductEntity?.versionId ?? '';
  }

  get versionOptions(): string[] {
    return Array.from(this.productEntityMap.keys());
  }

  setSelectedVersion(versionId: string): void {
    this.currentProductEntity = this.productEntityMap.get(versionId);
  }

  setProductEntity(versionId: string, productEntity: DataProductEntity): void {
    this.productEntityMap.set(versionId, productEntity);
  }
}

export class SandboxDataProductState extends BaseDataProductState {
  ingestEnvironmentUrn: string;
  dataProductDefinition: string | undefined;
  dataProductArtifact: V1_DataProductArtifactGeneration | undefined;

  constructor(
    state: MarketplaceLakehouseStore,
    ingestEnvironmentUrn: string,
    dataProductDefinitionAndArtifact: V1_DataProductDefinitionAndArtifact,
  ) {
    super(state);
    this.ingestEnvironmentUrn = ingestEnvironmentUrn;
    this.dataProductDefinition = dataProductDefinitionAndArtifact.definition;
    this.dataProductArtifact = dataProductDefinitionAndArtifact.artifact;

    makeObservable(this, {
      dataProductDefinition: observable,
      dataProductArtifact: observable,
    });
  }

  get accessTypes(): DataProductType {
    return DataProductType.LAKEHOUSE;
  }

  get isLoading(): boolean {
    return false;
  }

  get title(): string {
    return isNonEmptyString(this.dataProductArtifact?.dataProduct.title)
      ? this.dataProductArtifact.dataProduct.title
      : (this.dataProductArtifact?.dataProduct.path
          .split(ELEMENT_PATH_DELIMITER)
          .pop() ?? '');
  }

  get description(): string | undefined {
    return this.dataProductArtifact?.dataProduct.description;
  }

  get icon(): string | undefined {
    return undefined;
  }

  get imageUrl(): string | undefined {
    return '/assets/UnknownTypeLogo.png';
  }

  get isInitialized(): boolean {
    return this.dataProductArtifact !== undefined;
  }

  get versionOptions(): string[] {
    return [];
  }

  setSelectedVersion(_: string): void {}
}
