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
  type GraphManagerState,
  type Class,
  DataProduct,
  type V1_DataProductArtifact,
  ModelAccessPointGroup,
  type NativeModelExecutionContext,
  CORE_PURE_PATH,
  type NativeModelAccess,
  resolveUsableDataProductClasses,
} from '@finos/legend-graph';
import {
  QueryBuilderState,
  type QueryableSourceInfo,
} from '../../QueryBuilderState.js';
import { type GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  QueryBuilderActionConfig,
  QueryBuilderWorkflowState,
} from '../../query-workflow/QueryBuilderWorkFlowState.js';
import type { QueryBuilderConfig } from '../../../graph-manager/QueryBuilderConfig.js';
import { renderDataProductQueryBuilderSetupPanelContent } from '../../../components/workflows/DataProductQueryBuilder.js';
import {
  ActionState,
  filterByType,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { DepotEntityWithOrigin } from '@finos/legend-storage';
import { compareLabelFn } from '@finos/legend-art';

export type DataProductOption = {
  label: string;
  value: DepotEntityWithOrigin;
};

export const buildExecOptions = (
  val: NativeModelExecutionContext,
): {
  label: string;
  value: NativeModelExecutionContext;
} => {
  return {
    label: val.key,
    value: val,
  };
};

export class DataProductQueryBuilderState extends QueryBuilderState {
  readonly onClassChange?: ((val: Class) => void) | undefined;
  readonly onDataProductChange?: (val: DepotEntityWithOrigin) => Promise<void>;
  readonly onExecutionContextChange?:
    | ((val: NativeModelExecutionContext) => void)
    | undefined;

  loadDataProductModelState = ActionState.create();
  nativeNativeModelAccess: NativeModelAccess;
  dataProduct: DataProduct;
  dataProductArtifact: V1_DataProductArtifact | undefined;
  selectedExecContext: NativeModelExecutionContext;
  entities: DepotEntityWithOrigin[] | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataProductQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    dataProduct: DataProduct,
    artifact: V1_DataProductArtifact | undefined,
    actionConfig: QueryBuilderActionConfig,
    nativeNativeModelAccess: NativeModelAccess,
    nativeModelExecContext: NativeModelExecutionContext,
    onDataProductChange: (val: DepotEntityWithOrigin) => Promise<void>,
    onExecutionContextChange?:
      | ((val: NativeModelExecutionContext) => void)
      | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    super(applicationStore, graphManagerState, workflow, config, sourceInfo);
    makeObservable(this, {
      selectedExecContext: observable,
      dataProduct: observable,
      setExecOptions: action,
      selectedDataProductOption: computed,
      isProductLinkable: computed,
      loadEntities: flow,
    });
    this.workflowState.updateActionConfig(actionConfig);
    this.dataProduct = dataProduct;
    this.dataProductArtifact = artifact;
    this.nativeNativeModelAccess = nativeNativeModelAccess;
    this.selectedExecContext = nativeModelExecContext;
    this.onDataProductChange = onDataProductChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onClassChange = onClassChange;
  }

  get isProductLinkable(): boolean {
    return false;
  }

  copyDataProductLinkToClipBoard(): void {
    if (!this.isProductLinkable) {
      this.applicationStore.notificationService.notifyError(
        'Data product link is not available.',
      );
    }
  }

  protected getElementType(): typeof DataProduct {
    return DataProduct;
  }

  setExecOptions(exec: NativeModelExecutionContext): void {
    this.selectedExecContext = exec;
  }

  *loadEntities(): GeneratorFn<void> {
    this.entities = this.graphManagerState.graph.allOwnElements
      .filter(filterByType(this.getElementType()))
      .map((element) => this.transformElement(element));
  }

  protected transformElement(element: DataProduct): DepotEntityWithOrigin {
    return new DepotEntityWithOrigin(
      undefined,
      element.name,
      element.path,
      CORE_PURE_PATH.DATA_PRODUCT,
    );
  }

  get selectedDataProductOption(): DataProductOption {
    return {
      label: this.dataProduct.title ?? this.dataProduct.name,
      value: {
        origin: undefined,
        name: this.dataProduct.name,
        path: this.dataProduct.path,
        classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
      },
    };
  }

  get isSupported(): boolean {
    return (
      this.dataProduct.nativeModelAccess !== undefined ||
      // contains model access point group
      this.dataProduct.accessPointGroups.filter(
        filterByType(ModelAccessPointGroup),
      ).length > 0
    );
  }

  // includes model access point group if more than one group
  get execOptions(): { label: string; value: NativeModelExecutionContext }[] {
    return (
      this.dataProduct.nativeModelAccess?.nativeModelExecutionContexts.map(
        buildExecOptions,
      ) ?? []
    ).sort(compareLabelFn);
  }

  override async propagateExecutionContextChange(
    requireReBuildingGraph?: boolean | undefined,
  ): Promise<void> {
    const currentMapping = this.executionContextState.mapping;
    const execMapping = this.selectedExecContext.mapping.value;
    if (execMapping !== currentMapping) {
      this.changeMapping(execMapping, {
        keepQueryContent: true,
      });
      const classes = resolveUsableDataProductClasses(
        this.nativeNativeModelAccess.featuredElements,
        this.selectedExecContext.mapping.value,
        this.graphManagerState,
        undefined,
      );
      if (this.class && !classes.includes(this.class)) {
        this.setClass(classes[0]);
      }
    }
  }
}
