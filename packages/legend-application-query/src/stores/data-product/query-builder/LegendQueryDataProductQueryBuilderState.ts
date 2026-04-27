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
  DataProductQueryBuilderState,
  NativeModelDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
  type DataProductOption,
  type QueryBuilderActionConfig,
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
  LakehouseDataProductExecutionState,
} from '@finos/legend-query-builder';
import { renderLegendDataProductQueryBuilderSetupPanelContent } from '../../../components/data-product/LegendQueryDataProductQueryBuilder.js';
import type { LegendQueryApplicationStore } from '../../LegendQueryBaseStore.js';
import {
  resolveVersion,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import type {
  DepotEntityWithOrigin,
  ProjectGAVCoordinates,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import {
  LegendSDLC,
  type PackageableRuntime,
  type Class,
  type DataProduct,
  type GraphManagerState,
  type ModelAccessPointGroup,
  type NativeModelExecutionContext,
  type PackageableElement,
  type V1_DataProductArtifact,
  type LakehouseAccessPoint,
} from '@finos/legend-graph';
import {
  generateDataProductNativeRoute,
  generateDataProductModelRoute,
  generateDataProductLakehouseRoute,
} from '../../../__lib__/LegendQueryNavigation.js';
import { compareLabelFn } from '@finos/legend-art';
import type { DataProductSelectorState } from '../../data-space/DataProductSelectorState.js';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import type { GeneratorFn } from '@finos/legend-shared';
import { flowResult } from 'mobx';

export class LegendQueryDataProductQueryBuilderState extends DataProductQueryBuilderState {
  declare applicationStore: LegendQueryApplicationStore;
  depotServerClient: DepotServerClient;
  project: ProjectGAVCoordinates;
  readonly onLegacyDataSpaceChange:
    | ((val: ResolvedDataSpaceEntityWithOrigin) => void)
    | undefined;
  productSelectorState: DataProductSelectorState;
  createLakehousePackageableRuntime: (
    dataProductPath: string,
    gav: { groupId: string; artifactId: string; versionId: string },
  ) => Promise<PackageableRuntime>;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    dataProduct: DataProduct,
    artifact: V1_DataProductArtifact | undefined,
    executionState:
      | NativeModelExecutionContext
      | ModelAccessPointGroup
      | LakehouseAccessPoint,
    depotServerClient: DepotServerClient,
    project: ProjectGAVCoordinates,
    onDataProductChange: (val: DepotEntityWithOrigin) => Promise<void>,
    createLakehousePackageableRuntime: (
      dataProductPath: string,
      gav: { groupId: string; artifactId: string; versionId: string },
    ) => Promise<PackageableRuntime>,
    productSelectorState: DataProductSelectorState,
    onLegacyDataSpaceChange?:
      | ((val: ResolvedDataSpaceEntityWithOrigin) => void)
      | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      workflow,
      dataProduct,
      artifact,
      actionConfig,
      executionState,
      undefined,
      onDataProductChange,
      onClassChange,
      config,
      sourceInfo,
    );
    this.project = project;
    this.depotServerClient = depotServerClient;
    this.productSelectorState = productSelectorState;
    this.onLegacyDataSpaceChange = onLegacyDataSpaceChange;
    this.createLakehousePackageableRuntime = createLakehousePackageableRuntime;
  }

  override handleDataProductChange(val: DepotEntityWithOrigin): void {
    if (
      val instanceof ResolvedDataSpaceEntityWithOrigin &&
      this.onLegacyDataSpaceChange
    ) {
      this.onLegacyDataSpaceChange(val);
    } else {
      super.handleDataProductChange(val);
    }
  }

  override async prepareAccessForExecution(): Promise<void> {
    const origin = this.graphManagerState.graph.origin;
    if (
      this.executionState instanceof
        ModelAccessPointDataProductExecutionState &&
      origin instanceof LegendSDLC
    ) {
      const packageableRuntime = await this.createLakehousePackageableRuntime(
        this.dataProduct.path,
        {
          groupId: origin.groupId,
          artifactId: origin.artifactId,
          versionId: origin.versionId,
        },
      );
      this.graphManagerState.graph.addElement(packageableRuntime, '_internal_');

      if (!this.executionState.adhocRuntime) {
        this.executionState.withAdhocRuntime();
      }

      this.executionState.changeSelectedRuntime(packageableRuntime);
    } else if (
      this.executionState instanceof LakehouseDataProductExecutionState &&
      origin instanceof LegendSDLC
    ) {
      const packageableRuntime = await this.createLakehousePackageableRuntime(
        this.dataProduct.path,
        {
          groupId: origin.groupId,
          artifactId: origin.artifactId,
          versionId: origin.versionId,
        },
      );
      this.graphManagerState.graph.addElement(packageableRuntime, '_internal_');
      this.executionState.changeSelectedRuntime(packageableRuntime);
    }
    await super.prepareAccessForExecution();
  }

  override get dataProductOptions(): DataProductOption[] {
    const graphOptions = super.dataProductOptions;
    const depotOptions: DataProductOption[] = [
      ...(this.productSelectorState.legacyDataProducts ?? []),
      ...(this.productSelectorState.dataProducts ?? []),
    ].map((e) => ({ label: e.name, value: e }));
    // merge depot entities, deduplicating against graph-local options
    const seenPaths = new Set(graphOptions.map((o) => o.value.path));
    const uniqueDepotOptions = depotOptions.filter(
      (o) => !seenPaths.has(o.value.path),
    );
    return [...graphOptions, ...uniqueDepotOptions].sort(compareLabelFn);
  }

  override *loadEntities(): GeneratorFn<void> {
    if (!this.productSelectorState.isCompletelyLoaded) {
      yield flowResult(this.productSelectorState.loadProducts());
    }
  }

  override get isProductLinkable(): boolean {
    return true;
  }

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderLegendDataProductQueryBuilderSetupPanelContent(this);

  get sdlc(): LegendSDLC {
    return new LegendSDLC(
      this.project.groupId,
      this.project.artifactId,
      resolveVersion(this.project.versionId),
    );
  }

  override get floatingExecutionElements(): PackageableElement[] | undefined {
    if (
      (this.executionState instanceof
        ModelAccessPointDataProductExecutionState ||
        this.executionState instanceof LakehouseDataProductExecutionState) &&
      this.executionState.adhocRuntime &&
      this.graphManagerState.graph.origin !== undefined &&
      this.executionState.selectedRuntime !== undefined
    ) {
      return [this.executionState.selectedRuntime];
    }
    return undefined;
  }

  override copyDataProductLinkToClipBoard(): void {
    const dataProduct = this.dataProduct;
    const execState = this.executionState;
    let route: string;
    if (execState instanceof NativeModelDataProductExecutionState) {
      route = this.applicationStore.navigationService.navigator.generateAddress(
        generateDataProductNativeRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          dataProduct.path,
          execState.exectionValue.key,
        ),
      );
    } else if (execState instanceof ModelAccessPointDataProductExecutionState) {
      route = this.applicationStore.navigationService.navigator.generateAddress(
        generateDataProductModelRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          dataProduct.path,
          execState.exectionValue.id,
        ),
      );
    } else if (execState instanceof LakehouseDataProductExecutionState) {
      route = this.applicationStore.navigationService.navigator.generateAddress(
        generateDataProductLakehouseRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          dataProduct.path,
          execState.exectionValue.id,
        ),
      );
    } else {
      this.applicationStore.notificationService.notifyError(
        'Data Product link is not available for this execution type.',
      );
      return;
    }

    navigator.clipboard
      .writeText(route)
      .catch(() =>
        this.applicationStore.notificationService.notifyError(
          'Error copying data product query set up link to clipboard',
        ),
      );

    this.applicationStore.notificationService.notifySuccess(
      'Copied data product query set up link to clipboard',
    );
  }
}
