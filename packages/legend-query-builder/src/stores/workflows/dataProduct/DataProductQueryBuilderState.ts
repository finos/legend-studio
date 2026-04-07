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
  type QueryExecutionContext,
  QueryDataProductNativeExecutionContext,
  QueryDataProductModelAccessExecutionContext,
  type RawLambda,
  buildRawLambdaFromLambdaFunction,
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
import { QueryBuilderEmbeddedFromExecutionContextState } from '../../QueryBuilderExecutionContextState.js';
import { buildLambdaFunction } from '../../QueryBuilderValueSpecificationBuilder.js';

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
  adhocRuntime = false;

  constructor(
    executionState: ModelAccessPointGroup,
    queryBuilderState: DataProductQueryBuilderState,
  ) {
    super(executionState, queryBuilderState);
    makeObservable(this, {
      selectedRuntime: observable,
      adhocRuntime: observable,
      compatibleRuntimes: computed,
      showRuntimeOptions: computed,
      changeSelectedRuntime: action,
      withAdhocRuntime: action,
    });
    this.selectedRuntime = this.compatibleRuntimes[0];
  }

  changeSelectedRuntime(val: PackageableRuntime): void {
    this.selectedRuntime = val;
    this.queryBuilderState.changeRuntime(val);
  }

  withAdhocRuntime(): ModelAccessPointDataProductExecutionState {
    this.adhocRuntime = true;
    return this;
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
      initWithDataProduct: action,
      handleDataProductChange: action,
      setExecutionState: action,
      selectedDataProductOption: computed,
      isProductLinkable: computed,
      isNativeMode: computed,
      isModelAccessPointGroupMode: computed,
      showExecutionContextOptions: computed,
      showModelAccessPointGroupSelector: computed,
      selectedExecOption: computed,
      selectedModelAccessPointGroupOption: computed,
      usableClasses: computed,
      modelAccessPointGroups: computed,
      hasModelAccessPointGroups: computed,
      modelAccessPointGroupOptions: computed,
      activeMapping: computed,
      activeFeaturedElements: computed,
      loadEntities: flow,
      entities: observable,
    });
    // for queries against data product, we always want to default to from
    this.executionContextState =
      new QueryBuilderEmbeddedFromExecutionContextState(this);
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

  get isNativeMode(): boolean {
    return this.executionState instanceof NativeModelDataProductExecutionState;
  }

  get isModelAccessPointGroupMode(): boolean {
    return (
      this.executionState instanceof ModelAccessPointDataProductExecutionState
    );
  }

  get showExecutionContextOptions(): boolean {
    return this.isNativeMode && this.execOptions.length > 1;
  }

  get showModelAccessPointGroupSelector(): boolean {
    return (
      this.isModelAccessPointGroupMode &&
      this.modelAccessPointGroupOptions.length > 1
    );
  }

  get selectedExecOption():
    | { label: string; value: NativeModelExecutionContext }
    | undefined {
    return this.executionState instanceof NativeModelDataProductExecutionState
      ? buildExecOptions(this.executionState.exectionValue)
      : undefined;
  }

  get selectedModelAccessPointGroupOption():
    | ModelAccessPointGroupOption
    | undefined {
    return this.executionState instanceof
      ModelAccessPointDataProductExecutionState
      ? buildModelAccessPointGroupOption(this.executionState.exectionValue)
      : undefined;
  }

  get usableClasses(): Class[] {
    const activeMapping = this.activeMapping;
    return activeMapping
      ? resolveUsableDataProductClasses(
          this.activeFeaturedElements,
          activeMapping,
          this.graphManagerState,
          this.explorerState.mappingModelCoverageAnalysisResult,
        )
      : [];
  }

  changeNativeExecutionContext(val: NativeModelExecutionContext): void {
    if (this.isNativeMode && val === this.executionState.exectionValue) {
      return;
    }
    this.setExecutionState(val);
    this.propagateExecutionContextChange()
      .then(() => this.onExecutionContextChange?.(val))
      .catch(this.applicationStore.alertUnhandledError);
  }

  changeModelAccessPointGroupValue(val: ModelAccessPointGroup): void {
    if (
      this.isModelAccessPointGroupMode &&
      val === this.executionState.exectionValue
    ) {
      return;
    }
    this.setExecutionState(val);
    this.propagateExecutionContextChange().catch(
      this.applicationStore.alertUnhandledError,
    );
  }

  override buildQueryForPersistence(): RawLambda {
    if (!this.isQuerySupported) {
      return this.buildQuery();
    }
    // Build without embedding execution context in the lambda body.
    // The execution context (dataProductPath, executionKey/accessPointGroupId)
    // is stored separately in query.executionContext via getQueryExecutionContext().
    return buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        skipExecutionContext: true,
        useTypedRelationFunctions: this.isFetchStructureTyped,
      }),
      this.graphManagerState,
    );
  }

  override getQueryExecutionContext(): QueryExecutionContext {
    if (this.executionState instanceof NativeModelDataProductExecutionState) {
      const execContext = new QueryDataProductNativeExecutionContext();
      execContext.dataProductPath = this.dataProduct.path;
      execContext.executionKey = this.executionState.exectionValue.key;
      return execContext;
    } else if (
      this.executionState instanceof ModelAccessPointDataProductExecutionState
    ) {
      const execContext = new QueryDataProductModelAccessExecutionContext();
      execContext.dataProductPath = this.dataProduct.path;
      execContext.accessPointGroupId = this.executionState.exectionValue.id;
      return execContext;
    }
    return super.getQueryExecutionContext();
  }

  handleDataProductChange(val: DepotEntityWithOrigin): void {
    try {
      this.loadDataProductModelState.inProgress();
      const dataProduct =
        this.graphManagerState.graph.getOwnNullableDataProduct(val.path) ??
        this.graphManagerState.graph.generationModel.getOwnNullableDataProduct(
          val.path,
        );
      if (dataProduct) {
        this.initWithDataProduct(dataProduct);
        this.loadDataProductModelState.pass();
      } else if (this.onDataProductChange) {
        // data product not in current graph — trigger full rebuild
        this.onDataProductChange(val).catch((error) => {
          assertErrorThrown(error);
          this.applicationStore.notificationService.notifyError(
            `Failed to change Data Product: ${error.message}`,
          );
          this.loadDataProductModelState.fail();
        });
      } else {
        throw new Error(
          `Data Product '${val.path}' not found in current graph and no cross-project handler is available`,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to change Data Product: ${error.message}`,
      );
      this.loadDataProductModelState.fail();
    }
  }

  initWithDataProduct(
    dataProduct: DataProduct,
    preResolvedState?: NativeModelExecutionContext | ModelAccessPointGroup,
  ): void {
    try {
      const execValue =
        preResolvedState ?? resolveDataProductExecutionState(dataProduct);
      this.dataProduct = dataProduct;
      this.executionState =
        execValue instanceof NativeModelExecutionContext
          ? new NativeModelDataProductExecutionState(execValue, this)
          : new ModelAccessPointDataProductExecutionState(execValue, this);
      this.changeMapping(this.executionState.mapping);
      if (this.executionState instanceof NativeModelDataProductExecutionState) {
        const runtime = guaranteeNonNullable(
          this.executionState.exectionValue.runtime,
          'runtime unable to be resolved',
        );
        this.changeRuntime(new RuntimePointer(runtime));
      } else if (
        this.executionState instanceof
          ModelAccessPointDataProductExecutionState &&
        this.executionState.selectedRuntime instanceof PackageableRuntime
      ) {
        this.changeRuntime(this.executionState.selectedRuntime);
      }
      const compatibleClasses = resolveUsableDataProductClasses(
        this.activeFeaturedElements,
        this.executionState.mapping,
        this.graphManagerState,
        undefined,
      );
      // if there is no chosen class or the chosen one is not compatible
      // with the mapping then pick a compatible class if possible
      if (!this.sourceClass || !compatibleClasses.includes(this.sourceClass)) {
        const possibleNewClass = compatibleClasses[0];
        if (possibleNewClass) {
          this.changeSourceElement(possibleNewClass);
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
      if (this.sourceClass && !classes.includes(this.sourceClass)) {
        this.setSourceElement(classes[0]);
      }
    }
  }
}
