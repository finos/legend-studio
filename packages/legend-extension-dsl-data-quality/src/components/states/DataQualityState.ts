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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  type GraphManagerState,
  type Runtime,
  type RawLambda,
  type RootGraphFetchTree,
  type PackageableElement,
  type Class,
  buildRawLambdaFromLambdaFunction,
  CORE_PURE_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  Multiplicity,
  observe_ValueSpecification,
  PackageableElementExplicitReference,
  VariableExpression,
} from '@finos/legend-graph';
import {
  type EditorExtensionState,
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import { DataQualityGraphFetchTreeState } from './DataQualityGraphFetchTreeState.js';
import { DataQualityRootGraphFetchTree } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import { buildGraphFetchTreeData } from '../utils/DataQualityGraphFetchTreeUtil.js';
import {
  type GeneratorFn,
  ActionState,
  guaranteeNonNullable,
  guaranteeType,
  hashArray,
  isNonNullable,
} from '@finos/legend-shared';
import { type GenericLegendApplicationStore } from '@finos/legend-application';
import { DataQualityResultState } from './DataQualityResultState.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import {
  buildFilterConditionExpression,
  processFilterLambda,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';
import { DataQualityQueryBuilderState } from './DataQualityQueryBuilderState.js';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import {
  dataQualityClassValidation_setDataQualityGraphFetchTree,
  dataQualityClassValidation_setFilter,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import type { DataQualityClassValidationsConfiguration } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { type DSL_DataQuality_LegendStudioPlugin_Extension } from '../DSL_DataQuality_LegendStudioPlugin_Extension.js';

export enum DATA_QUALITY_TAB {
  FILTER = 'Filter ',
  CONSTRAINTS_SELECTION = 'Constraints Selection',
  TRIAL_RUNS = 'Trial Runs',
}
export function buildExtensionState(
  editorStore: EditorStore,
  dataQualityState: DataQualityState,
): EditorExtensionState | undefined {
  const extensionStateBuilders = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_DataQuality_LegendStudioPlugin_Extension
        ).getExtensionStates?.() ?? [],
    );
  for (const stateBuilder of extensionStateBuilders) {
    const state = stateBuilder(editorStore, dataQualityState);
    if (state) {
      return state;
    }
  }
  return undefined;
}

export abstract class DataQualityState extends ElementEditorState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly loadDataSpacesState = ActionState.create();
  readonly onExecutionContextChange?:
    | ((val: DataSpaceExecutionContext) => void)
    | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;
  readonly extensionState: EditorExtensionState | undefined;
  selectedTab: string;
  executionContext!: DataSpaceExecutionContext;
  dataQualityGraphFetchTreeState: DataQualityGraphFetchTreeState;
  structuralValidationsGraphFetchTreeState: DataQualityGraphFetchTreeState;
  showRuntimeSelector = false;
  dataQualityQueryBuilderState: DataQualityQueryBuilderState;
  resultState: DataQualityResultState;
  showStructuralValidations = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    makeObservable(this, {
      selectedTab: observable,
      showRuntimeSelector: observable,
      dataQualityGraphFetchTreeState: observable,
      structuralValidationsGraphFetchTreeState: observable,
      dataQualityQueryBuilderState: observable,
      showStructuralValidations: observable,
      constraintsConfigurationElement: computed,
      setSelectedTab: action,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      initializeGraphFetchTreeState: action,
      initialGraphFetchTreeFromClass: action,
      initializeStructuralValidationsGraphFetchTreeState: action,
      setShowStructuralValidations: action,
      updateElementOnClassChange: action,
      fetchStructuralValidations: flow,
      tabsToShow: computed,
      hashCode: computed,
    });
    this.applicationStore = this.editorStore.applicationStore;
    this.graphManagerState = this.editorStore.graphManagerState;
    this.dataQualityQueryBuilderState = new DataQualityQueryBuilderState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      this.editorStore.applicationStore.config.options.queryBuilderConfig,
      undefined,
    );
    this.selectedTab = DATA_QUALITY_TAB.CONSTRAINTS_SELECTION;
    this.dataQualityGraphFetchTreeState = new DataQualityGraphFetchTreeState(
      this,
    );
    this.structuralValidationsGraphFetchTreeState =
      new DataQualityGraphFetchTreeState(this);
    this.resultState = new DataQualityResultState(this);
    this.extensionState = buildExtensionState(this.editorStore, this);
  }

  abstract get constraintsConfigurationElement(): PackageableElement;

  setShowStructuralValidations(val: boolean): void {
    this.showStructuralValidations = val;
  }

  get tabsToShow(): string[] {
    const tabs: string[] = Object.values(DATA_QUALITY_TAB);
    const extensionTabGetters = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_DataQuality_LegendStudioPlugin_Extension
          ).getAllTabs?.() ?? [],
      );
    for (const tabGetter of extensionTabGetters) {
      tabs.push(...tabGetter());
    }
    return tabs;
  }

  *fetchStructuralValidations(): GeneratorFn<void> {
    const packagePath = this.constraintsConfigurationElement.path;
    const model = this.graphManagerState.graph;
    const rootGraphFetchTree = (yield getDataQualityPureGraphManagerExtension(
      this.graphManagerState.graphManager,
    ).fetchStructuralValidations(model, packagePath)) as RootGraphFetchTree;
    this.initializeStructuralValidationsGraphFetchTreeState(
      rootGraphFetchTree as DataQualityRootGraphFetchTree,
    );
  }

  initialGraphFetchTreeFromClass(
    rootClass: Class,
  ): DataQualityRootGraphFetchTree {
    return new DataQualityRootGraphFetchTree(
      PackageableElementExplicitReference.create(rootClass),
    );
  }

  initializeFilterState(filterLambda: RawLambda | undefined) {
    if (!filterLambda) {
      return;
    }
    const filterSpec = observe_ValueSpecification(
      this.graphManagerState.graphManager.buildValueSpecification(
        this.graphManagerState.graphManager.serializeRawValueSpecification(
          filterLambda,
        ),
        this.graphManagerState.graph,
      ),
      this.dataQualityQueryBuilderState.observerContext,
    );
    const compiledValueSpecification = guaranteeType(
      filterSpec,
      LambdaFunctionInstanceValue,
      `Can't build filter state: data quality filter only support lambda`,
    );
    processFilterLambda(
      compiledValueSpecification.values[0]!,
      this.dataQualityQueryBuilderState,
    );
  }

  initializeGraphFetchTreeState(
    tree: DataQualityRootGraphFetchTree | undefined,
  ) {
    if (!tree) {
      return;
    }
    this.dataQualityGraphFetchTreeState.treeData = buildGraphFetchTreeData(
      this.editorStore,
      tree,
      true,
      true,
      false,
    );
  }

  updateFilterElement = (): void => {
    const { filterState } = this.dataQualityQueryBuilderState;
    const filterConditionExpressions = filterState.rootIds
      .map((e) => guaranteeNonNullable(filterState.nodes.get(e)))
      .map((e) => buildFilterConditionExpression(filterState, e))
      .filter(isNonNullable);
    if (!filterConditionExpressions.length) {
      dataQualityClassValidation_setFilter(
        this
          .constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
        undefined,
      );
      return;
    }
    const genericType = new GenericType(
      this.dataQualityQueryBuilderState.class!,
    );
    const genericTypeReference =
      GenericTypeExplicitReference.create(genericType);

    const functionType = new FunctionType(
      PackageableElementExplicitReference.create(
        this.dataQualityQueryBuilderState.graphManagerState.graph.getType(
          CORE_PURE_PATH.ANY,
        ),
      ),
      Multiplicity.ONE,
    );
    functionType.parameters.push(
      new VariableExpression(
        filterState.lambdaParameterName,
        Multiplicity.ONE,
        genericTypeReference,
      ),
    );

    const lambdaFunction = new LambdaFunction(functionType);
    lambdaFunction.expressionSequence = filterConditionExpressions;
    dataQualityClassValidation_setFilter(
      this
        .constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
      buildRawLambdaFromLambdaFunction(
        lambdaFunction,
        this.dataQualityQueryBuilderState.graphManagerState,
      ),
    );
  };

  initializeStructuralValidationsGraphFetchTreeState(
    tree: DataQualityRootGraphFetchTree | undefined,
  ) {
    if (!tree) {
      return;
    }
    this.structuralValidationsGraphFetchTreeState.treeData =
      buildGraphFetchTreeData(this.editorStore, tree, true, true, true);
  }

  get sideBarClassName(): string | undefined {
    return this.showRuntimeSelector
      ? 'data-quality-validation__setup__data-space--with-runtime'
      : 'data-quality-validation__setup__data-space';
  }

  changeClass(val: Class): void {
    this.dataQualityQueryBuilderState.changeClass(val);
    this.dataQualityGraphFetchTreeState.onClassChange(val);
    this.structuralValidationsGraphFetchTreeState =
      new DataQualityGraphFetchTreeState(this);
    this.resultState = new DataQualityResultState(this);
    this.updateElementOnClassChange();
  }

  updateElementOnClassChange() {
    dataQualityClassValidation_setDataQualityGraphFetchTree(
      this
        .constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
      this.initialGraphFetchTreeFromClass(
        this.dataQualityQueryBuilderState.class!,
      ),
    );
    dataQualityClassValidation_setFilter(
      this
        .constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
      undefined,
    );
  }

  setExecutionContext(val: DataSpaceExecutionContext): void {
    this.executionContext = val;
  }

  get isMappingReadOnly(): boolean {
    return false;
  }

  get isRuntimeReadOnly(): boolean {
    return false;
  }

  get isQuerySupported(): boolean {
    return true;
  }

  setSelectedTab(tab: string): void {
    this.selectedTab = tab;
  }

  setShowRuntimeSelector(val: boolean): void {
    this.showRuntimeSelector = val;
  }
  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_STATE,
      this.dataQualityGraphFetchTreeState,
      this.dataQualityQueryBuilderState.filterState,
    ]);
  }
}
