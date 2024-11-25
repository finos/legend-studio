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
  type Class,
  type GraphFetchTree,
  type GraphManagerState,
  type PackageableElement,
  type RawLambda,
  type RootGraphFetchTree,
  type Runtime,
  CORE_PURE_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  getMilestoneTemporalStereotype,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  MILESTONING_STEREOTYPE,
  Multiplicity,
  observe_ValueSpecification,
  PackageableElementExplicitReference,
  ParameterValue,
  PRIMITIVE_TYPE,
  buildRawLambdaFromLambdaFunction,
  VariableExpression,
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  V1_RawValueSpecificationType,
} from '@finos/legend-graph';
import {
  type EditorExtensionState,
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { DataSpaceExecutionContext } from '@finos/legend-extension-dsl-data-space/graph';
import { DataQualityGraphFetchTreeState } from './DataQualityGraphFetchTreeState.js';
import {
  type DataQualityRootGraphFetchTree,
  DataQualityPropertyGraphFetchTree,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import {
  buildDefaultDataQualityRootGraphFetchTree,
  buildGraphFetchTreeData,
} from '../utils/DataQualityGraphFetchTreeUtil.js';
import {
  type GeneratorFn,
  ActionState,
  guaranteeNonNullable,
  guaranteeType,
  hashArray,
  isNonNullable,
  assertType,
} from '@finos/legend-shared';
import { type GenericLegendApplicationStore } from '@finos/legend-application';
import { DataQualityResultState } from './DataQualityResultState.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import {
  buildFilterConditionExpression,
  generateDefaultValueForPrimitiveType,
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
  showDateSelection = false;
  processingDate = generateDefaultValueForPrimitiveType(
    PRIMITIVE_TYPE.STRICTDATE,
  ) as string;
  businessDate = generateDefaultValueForPrimitiveType(
    PRIMITIVE_TYPE.STRICTDATE,
  ) as string;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    makeObservable(this, {
      selectedTab: observable,
      showRuntimeSelector: observable,
      dataQualityGraphFetchTreeState: observable,
      structuralValidationsGraphFetchTreeState: observable,
      dataQualityQueryBuilderState: observable,
      showStructuralValidations: observable,
      showDateSelection: observable,
      processingDate: observable,
      businessDate: observable,
      constraintsConfigurationElement: computed,
      setSelectedTab: action,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      initializeGraphFetchTreeState: action,
      initializeStructuralValidationsGraphFetchTreeState: action,
      setShowStructuralValidations: action,
      setShowDateSelection: action,
      updateElementOnClassChange: action,
      checkConstraintsSelectedAtNode: action,
      changeClass: action,
      setProcessingDate: action,
      setBusinessDate: action,
      fetchStructuralValidations: flow,
      tabsToShow: computed,
      areNestedConstraintsSelected: computed,
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

  setShowDateSelection(val: boolean): void {
    this.showDateSelection = val;
  }

  setProcessingDate(val: string): void {
    this.processingDate = val;
  }

  setBusinessDate(val: string): void {
    this.businessDate = val;
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

  get currentClassMilestoningStrategy(): MILESTONING_STEREOTYPE | undefined {
    const currentclass = this.dataQualityQueryBuilderState.class;
    if (currentclass !== undefined) {
      return getMilestoneTemporalStereotype(
        currentclass,
        this.graphManagerState.graph,
      );
    }
    return undefined;
  }

  get isCurrentClassMilestoned(): boolean {
    return this.currentClassMilestoningStrategy !== undefined;
  }

  get lambdaParameterValues(): ParameterValue[] {
    const parameters: ParameterValue[] = [];
    const currentClassMilestoningStrategy =
      this.currentClassMilestoningStrategy;
    if (
      currentClassMilestoningStrategy ===
        MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL ||
      currentClassMilestoningStrategy === MILESTONING_STEREOTYPE.BITEMPORAL
    ) {
      const parameterValue = new ParameterValue();
      parameterValue.name = PROCESSING_DATE_MILESTONING_PROPERTY_NAME;
      parameterValue.value = {
        _type: V1_RawValueSpecificationType.CSTRICTDATE,
        value: this.processingDate,
      };
      parameters.push(parameterValue);
    }
    if (
      currentClassMilestoningStrategy ===
        MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL ||
      currentClassMilestoningStrategy === MILESTONING_STEREOTYPE.BITEMPORAL
    ) {
      const parameterValue = new ParameterValue();
      parameterValue.name = BUSINESS_DATE_MILESTONING_PROPERTY_NAME;
      parameterValue.value = {
        _type: V1_RawValueSpecificationType.CSTRICTDATE,
        value: this.businessDate,
      };
      parameters.push(parameterValue);
    }
    return parameters;
  }

  *fetchStructuralValidations(): GeneratorFn<void> {
    const packagePath = this.constraintsConfigurationElement.path;
    const model = this.graphManagerState.graph;
    const rootGraphFetchTree = (yield getDataQualityPureGraphManagerExtension(
      this.graphManagerState.graphManager,
    ).fetchStructuralValidations(model, packagePath, {})) as RootGraphFetchTree;
    this.initializeStructuralValidationsGraphFetchTreeState(
      rootGraphFetchTree as DataQualityRootGraphFetchTree,
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

  get areNestedConstraintsSelected(): boolean {
    const treeData = this.dataQualityGraphFetchTreeState.treeData;
    if (!treeData) {
      return false;
    }
    let constraintSelectedAtChildLevel = false;
    treeData.tree.subTrees.forEach((subtree) => {
      constraintSelectedAtChildLevel =
        constraintSelectedAtChildLevel ||
        this.checkConstraintsSelectedAtNode(subtree);
    });
    return constraintSelectedAtChildLevel;
  }

  checkConstraintsSelectedAtNode(tree: GraphFetchTree): boolean {
    assertType(tree, DataQualityPropertyGraphFetchTree);
    if (tree.constraints.length > 0) {
      return true;
    }
    let constraintSelectedAtChildLevel = false;
    tree.subTrees.forEach((subtree) => {
      constraintSelectedAtChildLevel =
        constraintSelectedAtChildLevel ||
        this.checkConstraintsSelectedAtNode(subtree);
    });
    return constraintSelectedAtChildLevel;
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
    this.structuralValidationsGraphFetchTreeState =
      new DataQualityGraphFetchTreeState(this);
    this.resultState = new DataQualityResultState(this);
    this.initializeGraphFetchTreeState(
      buildDefaultDataQualityRootGraphFetchTree(
        this.dataQualityQueryBuilderState.class!,
      ),
    );
    this.updateElementOnClassChange();
  }

  updateElementOnClassChange() {
    dataQualityClassValidation_setDataQualityGraphFetchTree(
      this
        .constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
      this.dataQualityGraphFetchTreeState.treeData!.tree,
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
