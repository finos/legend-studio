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

import { type GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
  type QueryBuilderActionConfig,
  QueryBuilderState,
  type QueryBuilderExtraFunctionAnalysisInfo,
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type ExtraOptionsConfig,
} from '@finos/legend-query-builder';
import {
  type Class,
  type GraphManagerState,
  type QueryExecutionContext,
  type Runtime,
  type Mapping,
  type FunctionAnalysisInfo,
  getMappingCompatibleClasses,
  Package,
  QueryDataSpaceExecutionContext,
  elementBelongsToPackage,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  filterByType,
  uniq,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  renderDataSpaceQueryBuilderSetupPanelContent,
  type DataSpaceOption,
} from '../../components/query-builder/DataSpaceQueryBuilder.js';
import {
  type DataSpaceElement,
  type DataSpaceExecutionContext,
  DataSpace,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { DataSpaceAdvancedSearchState } from '../query/DataSpaceAdvancedSearchState.js';
import {
  type DataSpaceAnalysisResult,
  type DataSpaceExecutableAnalysisResult,
} from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { ResolvedDataSpaceEntityWithOrigin } from '../shared/DataSpaceInfo.js';
import type {
  DepotEntityWithOrigin,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import { buildDataSpaceExecutableAnalysisResultFromExecutable } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';
import { compareLabelFn } from '@finos/legend-art';

const matchesDataElement = (
  _class: Class,
  element: DataSpaceElement,
): boolean => {
  if (_class === element) {
    return true;
  }
  if (element instanceof Package) {
    return elementBelongsToPackage(_class, element);
  }
  return false;
};

export const resolveUsableDataSpaceClasses = (
  dataSpace: DataSpace,
  mapping: Mapping,
  graphManagerState: GraphManagerState,
  queryBuilderState?: DataSpaceQueryBuilderState,
): Class[] => {
  let compatibleClasses = getMappingCompatibleClasses(
    mapping,
    graphManagerState.usableClasses,
  );
  const mappingModelCoverageAnalysisResult =
    queryBuilderState?.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
      mapping.path,
    );
  if (
    // This check is to make sure that we have `info` field present in `MappedEntity` which
    // contains information about the mapped class path
    mappingModelCoverageAnalysisResult?.mappedEntities.some(
      (m) => m.info !== undefined,
    )
  ) {
    const uniqueCompatibleClasses = uniq(
      mappingModelCoverageAnalysisResult.mappedEntities
        // is root entity filters out mapped classes
        .filter((e) => e.info?.isRootEntity)
        .map((e) => e.info?.classPath),
    );
    compatibleClasses = graphManagerState.graph.classes.filter((c) =>
      uniqueCompatibleClasses.includes(c.path),
    );
  }
  if (dataSpace.elements?.length) {
    const elements = dataSpace.elements;
    return compatibleClasses.filter((_class) => {
      const _classElements = elements
        .filter((e) => matchesDataElement(_class, e.element.value))
        // we sort because we respect the closest definition to the element.
        .sort(
          (a, b) => b.element.value.path.length - a.element.value.path.length,
        );
      if (!_classElements.length) {
        return false;
      }
      return !_classElements[0]?.exclude;
    });
  }
  return compatibleClasses;
};

export interface DataSpaceQuerySDLC extends QueryableSourceInfo {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpace: string;
}

export const buildDataSpaceOption = (
  value: ResolvedDataSpaceEntityWithOrigin,
): DataSpaceOption => ({
  label: value.title ?? value.name,
  value,
});

export class DataSpaceQueryBuilderState extends QueryBuilderState {
  readonly onDataSpaceChange: (
    val: ResolvedDataSpaceEntityWithOrigin,
  ) => Promise<void>;
  readonly onExecutionContextChange?:
    | ((val: DataSpaceExecutionContext) => void)
    | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;
  readonly onClassChange?: ((val: Class) => void) | undefined;
  readonly dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined;
  readonly extraOptionsConfig?:
    | ExtraOptionsConfig<DepotEntityWithOrigin>
    | undefined;
  entities: ResolvedDataSpaceEntityWithOrigin[] | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataSpaceQueryBuilderSetupPanelContent(this);

  dataSpace: DataSpace;
  executionContext!: DataSpaceExecutionContext;
  showRuntimeSelector = false;
  isTemplateQueryDialogOpen = false;
  isLightGraphEnabled!: boolean;
  displayedTemplateQueries: DataSpaceExecutableAnalysisResult[] | undefined;
  advancedSearchState?: DataSpaceAdvancedSearchState | undefined;
  loadEntitiesState = ActionState.create();
  prioritizeEntityFunc?:
    | ((val: ResolvedDataSpaceEntityWithOrigin) => boolean)
    | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    isLightGraphEnabled: boolean,
    prioritizeEntityFunc:
      | ((val: ResolvedDataSpaceEntityWithOrigin) => boolean)
      | undefined,
    onDataSpaceChange: (
      val: ResolvedDataSpaceEntityWithOrigin,
    ) => Promise<void>,
    dataSpaceAnalysisResult?: DataSpaceAnalysisResult | undefined,
    onExecutionContextChange?:
      | ((val: DataSpaceExecutionContext) => void)
      | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    onClassChange?: ((val: Class) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
    extraOptionsConfig?: ExtraOptionsConfig<DepotEntityWithOrigin> | undefined,
  ) {
    super(applicationStore, graphManagerState, workflow, config, sourceInfo);

    makeObservable(this, {
      executionContext: observable,
      showRuntimeSelector: observable,
      isTemplateQueryDialogOpen: observable,
      isLightGraphEnabled: observable,
      displayedTemplateQueries: observable,
      advancedSearchState: observable,
      selectedDataSpaceOption: computed,
      setExecutionContext: action,
      setShowRuntimeSelector: action,
      setTemplateQueryDialogOpen: action,
      setIsLightGraphEnabled: action,
      intialize: flow,
      loadEntities: flow,
      entities: observable,
    });

    this.dataSpace = dataSpace;
    this.executionContext = executionContext;
    this.onDataSpaceChange = onDataSpaceChange;
    this.onExecutionContextChange = onExecutionContextChange;
    this.onRuntimeChange = onRuntimeChange;
    this.onClassChange = onClassChange;
    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
    this.workflowState.updateActionConfig(actionConfig);
    this.isLightGraphEnabled = isLightGraphEnabled;
    this.prioritizeEntityFunc = prioritizeEntityFunc;
    this.extraOptionsConfig = extraOptionsConfig;
    if (dataSpaceAnalysisResult?.__INTERNAL__useRelationTDS) {
      this.setLambdaWriteMode(
        QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
      );
    }
  }

  get dataSpaceOptions(): DataSpaceOption[] {
    const sortedAllOptions = (this.entities ?? [])
      .map(buildDataSpaceOption)
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

  override get sideBarClassName(): string | undefined {
    return this.showRuntimeSelector
      ? 'query-builder__setup__data-space--with-runtime'
      : 'query-builder__setup__data-space';
  }

  override getQueryExecutionContext(): QueryExecutionContext {
    const queryExeContext = new QueryDataSpaceExecutionContext();
    queryExeContext.dataSpacePath = this.dataSpace.path;
    queryExeContext.executionKey = this.executionContext.name;
    return queryExeContext;
  }

  get isAdvancedDataSpaceSearchEnabled(): boolean {
    return false;
  }

  get isDataSpaceLinkable(): boolean {
    return false;
  }

  copyDataSpaceLinkToClipboard(): void {
    if (!this.isDataSpaceLinkable) {
      this.applicationStore.notificationService.notifyError(
        'Data space link is not available.',
      );
    }
  }

  get selectedDataSpaceOption(): DataSpaceOption {
    return {
      label: this.dataSpace.title ?? this.dataSpace.name,
      value: new ResolvedDataSpaceEntityWithOrigin(
        undefined,
        this.dataSpace.title,
        this.dataSpace.name,
        this.dataSpace.path,
        this.dataSpace.defaultExecutionContext.title ??
          this.dataSpace.defaultExecutionContext.name,
      ),
    };
  }

  get canVisitTemplateQuery(): boolean {
    return false;
  }

  protected getElementType(): typeof DataSpace {
    return DataSpace;
  }

  *loadEntities(): GeneratorFn<void> {
    this.loadEntitiesState.inProgress();
    this.entities = this.graphManagerState.graph.allOwnElements
      .filter(filterByType(this.getElementType()))
      .map((element) => this.transformElement(element));
    this.loadEntitiesState.complete();
  }

  protected transformElement(
    element: DataSpace,
  ): ResolvedDataSpaceEntityWithOrigin {
    return new ResolvedDataSpaceEntityWithOrigin(
      undefined,
      element.title,
      element.name,
      element.path,
      element.defaultExecutionContext.title ??
        element.defaultExecutionContext.name,
    );
  }

  setTemplateQueryDialogOpen(val: boolean): void {
    this.isTemplateQueryDialogOpen = val;
  }

  setExecutionContext(val: DataSpaceExecutionContext): void {
    this.executionContext = val;
  }

  setShowRuntimeSelector(val: boolean): void {
    this.showRuntimeSelector = val;
  }

  setIsLightGraphEnabled(val: boolean): void {
    this.isLightGraphEnabled = val;
  }

  override buildFunctionAnalysisInfo():
    | QueryBuilderExtraFunctionAnalysisInfo
    | undefined {
    let functionInfoMap: Map<string, FunctionAnalysisInfo> = new Map<
      string,
      FunctionAnalysisInfo
    >();
    let dependencyFunctionInfoMap: Map<string, FunctionAnalysisInfo> = new Map<
      string,
      FunctionAnalysisInfo
    >();
    const functionInfos = this.dataSpaceAnalysisResult?.functionInfos;
    if (functionInfos) {
      functionInfoMap = functionInfos;
    }
    const dependencyFunctionInfos =
      this.dataSpaceAnalysisResult?.dependencyFunctionInfos;
    if (dependencyFunctionInfos) {
      dependencyFunctionInfoMap = dependencyFunctionInfos;
    }
    return {
      functionInfoMap,
      dependencyFunctionInfoMap,
    };
  }

  *intialize(): GeneratorFn<void> {
    this.displayedTemplateQueries =
      this.dataSpace.executables && this.dataSpace.executables.length > 0
        ? ((yield buildDataSpaceExecutableAnalysisResultFromExecutable(
            this.dataSpace,
            this.dataSpace.executables,
            this.graphManagerState,
          )) as DataSpaceExecutableAnalysisResult[])
        : this.dataSpaceAnalysisResult?.executables.filter(
            (ex) => ex.info !== undefined,
          );
  }

  visitTemplateQuery(
    dataSpace: DataSpace,
    template: DataSpaceExecutableAnalysisResult,
  ): void {
    this.applicationStore.notificationService.notifyError(
      'Visiting template query is not supported yet.',
    );
  }

  hideAdvancedSearchPanel(): void {
    this.advancedSearchState = undefined;
  }

  showAdvancedSearchPanel(dataSpace: DataSpace): void {
    this.applicationStore.notificationService.notifyError(
      'Advanced search panel not supported.',
    );
  }
}
