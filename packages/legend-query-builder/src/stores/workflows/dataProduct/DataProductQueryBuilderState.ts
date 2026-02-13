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
  NativeModelExecutionContext,
  CORE_PURE_PATH,
  type NativeModelAccess,
  type Mapping,
  type DataProductElementScope,
  PackageableRuntime,
  resolveUsableDataProductClasses,
  LakehouseRuntime,
  type LambdaFunction,
  SimpleFunctionExpression,
  InstanceValue,
  Multiplicity,
  extractElementNameFromPath,
  SUPPORTED_FUNCTIONS,
  PackageableElementExplicitReference,
  resolveDataProductExecutionState,
  RuntimePointer,
} from '@finos/legend-graph';
import { QueryBuilderState } from '../../QueryBuilderState.js';

import { type GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  QueryBuilderActionConfig,
  QueryBuilderWorkflowState,
} from '../../query-workflow/QueryBuilderWorkFlowState.js';
import type { QueryBuilderConfig } from '../../../graph-manager/QueryBuilderConfig.js';
import { renderDataProductQueryBuilderSetupPanelContent } from '../../../components/workflows/DataProductQueryBuilder.js';
import {
  ActionState,
  assertErrorThrown,
  filterByType,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  DepotEntityWithOrigin,
  type QueryableSourceInfo,
} from '@finos/legend-storage';
import { compareLabelFn } from '@finos/legend-art';

export type DataProductOption = {
  label: string;
  value: DepotEntityWithOrigin;
};

export const buildDataProductOption = (
  value: DepotEntityWithOrigin,
): DataProductOption => ({
  label: value.name,
  value,
});

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

export type ModelAccessPointGroupOption = {
  label: string;
  value: ModelAccessPointGroup;
};

export const buildModelAccessPointGroupOption = (
  value: ModelAccessPointGroup,
): ModelAccessPointGroupOption => ({
  label: value.title ?? value.id,
  value,
});

export abstract class DataProductExecutionState<T> {
  readonly queryBuilderState: DataProductQueryBuilderState;
  exectionValue: T;

  constructor(
    executionState: T,
    queryBuilderState: DataProductQueryBuilderState,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.exectionValue = executionState;
  }

  abstract get label(): string;

  abstract get mapping(): Mapping;

  abstract get featuredElements(): DataProductElementScope[] | undefined;

  get selectedOption(): { label: string; value: T } {
    return {
      label: this.label,
      value: this.exectionValue,
    };
  }
}

export class NativeModelDataProductExecutionState extends DataProductExecutionState<NativeModelExecutionContext> {
  nativeModelAccess: NativeModelAccess;

  constructor(
    executionState: NativeModelExecutionContext,
    queryBuilderState: DataProductQueryBuilderState,
  ) {
    super(executionState, queryBuilderState);
    this.nativeModelAccess = executionState.__owner;
  }

  override get label(): string {
    return this.exectionValue.key;
  }

  get mapping(): Mapping {
    return this.exectionValue.mapping.value;
  }

  get featuredElements(): DataProductElementScope[] | undefined {
    return this.nativeModelAccess.featuredElements;
  }
}

export class ModelAccessPointDataProductExecutionState extends DataProductExecutionState<ModelAccessPointGroup> {
  selectedRuntime: PackageableRuntime | undefined;

  constructor(
    executionState: ModelAccessPointGroup,
    queryBuilderState: DataProductQueryBuilderState,
  ) {
    super(executionState, queryBuilderState);
    makeObservable(this, {
      selectedRuntime: observable,
      compatibleRuntimes: computed,
      showRuntimeOptions: computed,
      changeSelectedRuntime: action,
    });
    this.selectedRuntime = this.compatibleRuntimes[0];
  }

  changeSelectedRuntime(val: PackageableRuntime): void {
    this.selectedRuntime = val;
    this.queryBuilderState.changeRuntime(val);
  }

  override get label(): string {
    return this.exectionValue.title ?? this.exectionValue.id;
  }

  get mapping(): Mapping {
    return this.exectionValue.mapping.value;
  }

  get featuredElements(): DataProductElementScope[] | undefined {
    return this.exectionValue.featuredElements;
  }

  get showRuntimeOptions(): boolean {
    return this.compatibleRuntimes.length > 1;
  }

  get compatibleRuntimes(): PackageableRuntime[] {
    return this.queryBuilderState.graphManagerState.usableRuntimes.filter(
      (runtime) => runtime.runtimeValue instanceof LakehouseRuntime,
    );
  }
}

export class DataProductQueryBuilderState extends QueryBuilderState {
  readonly onClassChange?: ((val: Class) => void) | undefined;
  readonly onDataProductChange?: (val: DepotEntityWithOrigin) => Promise<void>;
  readonly onExecutionContextChange?:
    | ((val: NativeModelExecutionContext) => void)
    | undefined;

  loadDataProductModelState = ActionState.create();
  dataProduct: DataProduct;
  dataProductArtifact: V1_DataProductArtifact | undefined;
  executionState: DataProductExecutionState<
    NativeModelExecutionContext | ModelAccessPointGroup
  >;
  entities: DepotEntityWithOrigin[] | undefined;

  prioritizeEntityFunc?: ((val: DepotEntityWithOrigin) => boolean) | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataProductQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    dataProduct: DataProduct,
    artifact: V1_DataProductArtifact | undefined,
    actionConfig: QueryBuilderActionConfig,
    executionState: NativeModelExecutionContext | ModelAccessPointGroup,
    prioritizeEntityFunc: ((val: DepotEntityWithOrigin) => boolean) | undefined,
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
      dataProduct: observable,
      executionState: observable,
      setExecutionState: action,
      handleDataProductChange: action,
      selectedDataProductOption: computed,
      isProductLinkable: computed,
      modelAccessPointGroups: computed,
      hasModelAccessPointGroups: computed,
      modelAccessPointGroupOptions: computed,
      activeMapping: computed,
      activeFeaturedElements: computed,
      loadEntities: flow,
      entities: observable,
    });
    this.workflowState.updateActionConfig(actionConfig);
    this.dataProduct = dataProduct;
    this.dataProductArtifact = artifact;
    this.executionState =
      executionState instanceof NativeModelExecutionContext
        ? new NativeModelDataProductExecutionState(executionState, this)
        : new ModelAccessPointDataProductExecutionState(executionState, this);
    this.prioritizeEntityFunc = prioritizeEntityFunc;
    this.onDataProductChange = onDataProductChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onClassChange = onClassChange;
  }

  get isProductLinkable(): boolean {
    return false;
  }

  handleDataProductChange(val: DepotEntityWithOrigin): void {
    try {
      this.loadDataProductModelState.inProgress();
      const dataProduct = this.graphManagerState.graph.getDataProduct(val.path);
      this.initWithDataProduct(dataProduct);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to change Data Product: ${error.message}`,
      );
    }
  }

  initWithDataProduct(dataProduct: DataProduct): void {
    try {
      const execState = resolveDataProductExecutionState(dataProduct);
      this.dataProduct = dataProduct;
      this.executionState =
        execState instanceof NativeModelExecutionContext
          ? new NativeModelDataProductExecutionState(execState, this)
          : new ModelAccessPointDataProductExecutionState(execState, this);
      this.changeMapping(this.executionState.mapping);
      if (execState instanceof NativeModelDataProductExecutionState) {
        const runtime = guaranteeNonNullable(
          execState.exectionValue.runtime,
          'runtime unable to be resolved',
        );
        this.changeRuntime(new RuntimePointer(runtime));
      } else if (
        execState instanceof ModelAccessPointDataProductExecutionState &&
        execState.selectedRuntime instanceof PackageableRuntime
      ) {
        this.changeRuntime(execState.selectedRuntime);
      }
      const compatibleClasses = resolveUsableDataProductClasses(
        this.activeFeaturedElements,
        this.executionState.mapping,
        this.graphManagerState,
        undefined,
      );
      // if there is no chosen class or the chosen one is not compatible
      // with the mapping then pick a compatible class if possible
      if (!this.class || !compatibleClasses.includes(this.class)) {
        const possibleNewClass = compatibleClasses[0];
        if (possibleNewClass) {
          this.changeClass(possibleNewClass);
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to load Data Product: ${error.message}`,
      );
    }
  }

  copyDataProductLinkToClipBoard(): void {
    if (!this.isProductLinkable) {
      this.applicationStore.notificationService.notifyError(
        'Data Product link is not available.',
      );
    }
  }

  protected getElementType(): typeof DataProduct {
    return DataProduct;
  }

  setExecutionState(
    val: NativeModelExecutionContext | ModelAccessPointGroup,
  ): void {
    this.executionState =
      val instanceof NativeModelExecutionContext
        ? new NativeModelDataProductExecutionState(val, this)
        : new ModelAccessPointDataProductExecutionState(val, this);
  }

  get modelAccessPointGroups(): ModelAccessPointGroup[] {
    return this.dataProduct.accessPointGroups.filter(
      filterByType(ModelAccessPointGroup),
    );
  }

  get hasModelAccessPointGroups(): boolean {
    return this.modelAccessPointGroups.length > 0;
  }

  get modelAccessPointGroupOptions(): ModelAccessPointGroupOption[] {
    return this.modelAccessPointGroups
      .map(buildModelAccessPointGroupOption)
      .sort(compareLabelFn);
  }

  get activeMapping(): Mapping | undefined {
    return this.executionState.mapping;
  }

  get activeFeaturedElements(): DataProductElementScope[] | undefined {
    return this.executionState.featuredElements;
  }

  override buildExecutionContextExpression(
    lambdaFunction: LambdaFunction,
  ): LambdaFunction {
    if (
      this.executionState instanceof ModelAccessPointDataProductExecutionState
    ) {
      // for model access point group with attached ->with(dataProduct)->from(runtime) to execute query
      let precedingExpression = guaranteeNonNullable(
        lambdaFunction.expressionSequence[0],
        `Can't build from() expression: preceding expression is not defined`,
      );
      const withFunc = new SimpleFunctionExpression(
        extractElementNameFromPath(SUPPORTED_FUNCTIONS.WITH),
      );
      const dataProductInstance = new InstanceValue(
        Multiplicity.ONE,
        undefined,
      );
      dataProductInstance.values = [
        PackageableElementExplicitReference.create(this.dataProduct),
      ];
      withFunc.parametersValues = [precedingExpression, dataProductInstance];
      precedingExpression = withFunc;
      const fromFunc = new SimpleFunctionExpression(
        extractElementNameFromPath(SUPPORTED_FUNCTIONS.FROM),
      );
      const runtime = this.executionState.selectedRuntime;
      if (runtime) {
        const runtimeInstance = new InstanceValue(Multiplicity.ONE, undefined);
        runtimeInstance.values = [
          PackageableElementExplicitReference.create(runtime),
        ];
        fromFunc.parametersValues = [precedingExpression, runtimeInstance];
        lambdaFunction.expressionSequence[0] = fromFunc;
      }
      return lambdaFunction;
    }
    return super.buildExecutionContextExpression(lambdaFunction);
  }

  *loadEntities(): GeneratorFn<void> {
    this.loadDataProductModelState.inProgress();
    this.entities = this.graphManagerState.graph.allOwnElements
      .filter(filterByType(this.getElementType()))
      .map((element) => this.transformElement(element));
    this.loadDataProductModelState.complete();
  }

  protected transformElement(element: DataProduct): DepotEntityWithOrigin {
    return new DepotEntityWithOrigin(
      undefined,
      element.name,
      element.path,
      CORE_PURE_PATH.DATA_PRODUCT,
    );
  }

  get dataProductOptions(): DataProductOption[] {
    const sortedAllOptions = (this.entities ?? [])
      .map(buildDataProductOption)
      .sort(compareLabelFn);

    return this.prioritizeEntityFunc
      ? [
          ...sortedAllOptions.filter((val) =>
            this.prioritizeEntityFunc?.(val.value),
          ),
          ...sortedAllOptions.filter(
            (val) => !this.prioritizeEntityFunc?.(val.value),
          ),
        ]
      : sortedAllOptions;
  }

  get selectedDataProductOption(): DataProductOption {
    return {
      label: this.dataProduct.title ?? this.dataProduct.name,
      value: new DepotEntityWithOrigin(
        undefined,
        this.dataProduct.name,
        this.dataProduct.path,
        CORE_PURE_PATH.DATA_PRODUCT,
      ),
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
    const newMapping = this.activeMapping;
    if (newMapping && newMapping !== currentMapping) {
      this.changeMapping(newMapping, {
        keepQueryContent: true,
      });
      const classes = resolveUsableDataProductClasses(
        this.activeFeaturedElements,
        newMapping,
        this.graphManagerState,
        undefined,
      );
      if (this.class && !classes.includes(this.class)) {
        this.setClass(classes[0]);
      }
    }
  }
}
