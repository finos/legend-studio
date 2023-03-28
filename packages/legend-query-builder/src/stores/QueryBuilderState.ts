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
  action,
  flow,
  observable,
  makeObservable,
  computed,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  filterByType,
  ActionState,
  hashArray,
} from '@finos/legend-shared';
import { QueryBuilderFilterState } from './filter/QueryBuilderFilterState.js';
import { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import {
  QueryBuilderTextEditorMode,
  QueryBuilderTextEditorState,
} from './QueryBuilderTextEditorState.js';
import { QueryBuilderExplorerState } from './explorer/QueryBuilderExplorerState.js';
import { QueryBuilderResultState } from './QueryBuilderResultState.js';
import {
  processQueryLambdaFunction,
  processParameters,
} from './QueryBuilderStateBuilder.js';
import { QueryBuilderUnsupportedQueryState } from './QueryBuilderUnsupportedQueryState.js';
import {
  type Class,
  type Mapping,
  type Runtime,
  type GraphManagerState,
  GRAPH_MANAGER_EVENT,
  CompilationError,
  extractSourceInformationCoordinates,
  LambdaFunctionInstanceValue,
  RawLambda,
  VariableExpression,
  observe_ValueSpecification,
  ObserverContext,
  isStubbed_RawLambda,
  buildLambdaVariableExpressions,
  buildRawLambdaFromLambdaFunction,
  type ValueSpecification,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import type {
  CommandRegistrar,
  GenericLegendApplicationStore,
} from '@finos/legend-application';
import { QueryFunctionsExplorerState } from './explorer/QueryFunctionsExplorerState.js';
import { QueryBuilderParametersState } from './QueryBuilderParametersState.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterOperator.js';
import { getQueryBuilderCoreFilterOperators } from './filter/QueryBuilderFilterOperatorLoader.js';
import { QueryBuilderChangeDetectionState } from './QueryBuilderChangeDetectionState.js';
import { QueryBuilderMilestoningState } from './milestoning/QueryBuilderMilestoningState.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../graphManager/QueryBuilderHashUtils.js';
import { QUERY_BUILDER_COMMAND_KEY } from './QueryBuilderCommand.js';
import { QueryBuilderWatermarkState } from './watermark/QueryBuilderWatermarkState.js';
import { QueryBuilderConstantsState } from './QueryBuilderConstantsState.js';
import { QueryBuilderCheckEntitlementsState } from './entitlements/QueryBuilderCheckEntitlementsState.js';

export abstract class QueryBuilderState implements CommandRegistrar {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;

  readonly changeDetectionState: QueryBuilderChangeDetectionState;
  readonly queryCompileState = ActionState.create();
  readonly observerContext: ObserverContext;

  explorerState: QueryBuilderExplorerState;
  functionsExplorerState: QueryFunctionsExplorerState;
  parametersState: QueryBuilderParametersState;
  constantState: QueryBuilderConstantsState;
  milestoningState: QueryBuilderMilestoningState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  watermarkState: QueryBuilderWatermarkState;
  checkEntitlementsState: QueryBuilderCheckEntitlementsState;
  filterOperators: QueryBuilderFilterOperator[] =
    getQueryBuilderCoreFilterOperators();
  resultState: QueryBuilderResultState;
  textEditorState: QueryBuilderTextEditorState;
  unsupportedQueryState: QueryBuilderUnsupportedQueryState;

  titleOfQuery: string | undefined;
  showFunctionsExplorerPanel = false;
  showParametersPanel = false;
  isEditingWatermark = false;
  isCheckingEntitlments = false;

  class?: Class | undefined;
  mapping?: Mapping | undefined;
  runtimeValue?: Runtime | undefined;

  // NOTE: this makes it so that we need to import components in stores code,
  // we probably want to refactor to an extension mechanism
  TEMPORARY__setupPanelContentRenderer?: (() => React.ReactNode) | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    makeObservable(this, {
      explorerState: observable,
      parametersState: observable,
      constantState: observable,
      functionsExplorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      watermarkState: observable,
      titleOfQuery: observable,
      checkEntitlementsState: observable,
      resultState: observable,
      textEditorState: observable,
      unsupportedQueryState: observable,
      showFunctionsExplorerPanel: observable,
      showParametersPanel: observable,
      isEditingWatermark: observable,
      isCheckingEntitlments: observable,
      changeDetectionState: observable,
      class: observable,
      mapping: observable,
      runtimeValue: observable,

      sideBarClassName: computed,
      isQuerySupported: computed,
      validationIssues: computed,

      setShowFunctionsExplorerPanel: action,
      setShowParametersPanel: action,
      setIsEditingWatermark: action,
      setIsCheckingEntitlments: action,
      setClass: action,
      setMapping: action,
      setRuntimeValue: action,

      setTitleOfQuery: action,

      resetQueryResult: action,
      resetQueryContent: action,
      changeClass: action,
      changeMapping: action,

      rebuildWithQuery: action,
      saveQuery: action,
      compileQuery: flow,
      hashCode: computed,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.parametersState = new QueryBuilderParametersState(this);
    this.constantState = new QueryBuilderConstantsState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.watermarkState = new QueryBuilderWatermarkState(this);
    this.checkEntitlementsState = new QueryBuilderCheckEntitlementsState(this);
    this.resultState = new QueryBuilderResultState(this);
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.observerContext = new ObserverContext(
      this.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );
    this.changeDetectionState = new QueryBuilderChangeDetectionState(this);
  }

  get isMappingReadOnly(): boolean {
    return false;
  }

  get isRuntimeReadOnly(): boolean {
    return false;
  }

  get sideBarClassName(): string | undefined {
    return undefined;
  }

  get isParameterSupportDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }

  /**
   * This flag is for turning on/off DnD support from projection panel to filter panel,
   * and will be leveraged when the concepts of workflows are introduced into query builder.
   */
  get TEMPORARY__isDnDFetchStructureToFilterSupported(): boolean {
    return true;
  }

  get allVariables(): VariableExpression[] {
    const parameterVars = this.parametersState.parameterStates.map(
      (paramState) => paramState.parameter,
    );
    const letVars = this.constantState.constants.map(
      (letVar) => letVar.variable,
    );
    return [...parameterVars, ...letVars];
  }

  get allVariableNames(): string[] {
    return this.allVariables.map((e) => e.name);
  }

  setShowFunctionsExplorerPanel(val: boolean): void {
    this.showFunctionsExplorerPanel = val;
  }

  setShowParametersPanel(val: boolean): void {
    this.showParametersPanel = val;
  }

  setIsEditingWatermark(val: boolean): void {
    this.isEditingWatermark = val;
  }

  setIsCheckingEntitlments(val: boolean): void {
    this.isCheckingEntitlments = val;
  }

  setClass(val: Class | undefined): void {
    this.class = val;
  }

  setMapping(val: Mapping | undefined): void {
    this.mapping = val;
  }

  setRuntimeValue(val: Runtime | undefined): void {
    this.runtimeValue = val;
  }

  setTitleOfQuery(val: string | undefined): void {
    this.titleOfQuery = val;
  }

  get isQuerySupported(): boolean {
    return !this.unsupportedQueryState.rawLambda;
  }

  registerCommands(): void {
    this.applicationStore.commandService.registerCommand({
      key: QUERY_BUILDER_COMMAND_KEY.COMPILE,
      action: () => {
        flowResult(this.compileQuery()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
  }

  // Used to determine if variable is used within query
  // For places where we don't know, we will assume the variable is not used (i.e projection derivation column)
  isVariableUsed(variable: VariableExpression): boolean {
    return (
      this.milestoningState.isVariableUsed(variable) ||
      this.filterState.isVariableUsed(variable) ||
      this.watermarkState.isVariableUsed(variable) ||
      this.fetchStructureState.implementation.isVariableUsed(variable)
    );
  }

  deregisterCommands(): void {
    [QUERY_BUILDER_COMMAND_KEY.COMPILE].forEach((key) =>
      this.applicationStore.commandService.deregisterCommand(key),
    );
  }

  resetQueryResult(options?: { preserveResult?: boolean | undefined }): void {
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    if (options?.preserveResult) {
      resultState.setExecutionResult(this.resultState.executionResult);
      resultState.setExecutionDuration(this.resultState.executionDuration);
      resultState.latestRunHashCode = this.resultState.latestRunHashCode;
    }
    this.resultState = resultState;
  }

  resetQueryContent(): void {
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.milestoningState = new QueryBuilderMilestoningState(this);
    const mappingModelCoverageAnalysisResult =
      this.explorerState.mappingModelCoverageAnalysisResult;
    this.explorerState = new QueryBuilderExplorerState(this);
    if (mappingModelCoverageAnalysisResult) {
      this.explorerState.mappingModelCoverageAnalysisResult =
        mappingModelCoverageAnalysisResult;
    }
    this.explorerState.refreshTreeData();
    this.constantState = new QueryBuilderConstantsState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.parametersState = new QueryBuilderParametersState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.watermarkState = new QueryBuilderWatermarkState(this);
    this.checkEntitlementsState = new QueryBuilderCheckEntitlementsState(this);

    const currentFetchStructureImplementationType =
      this.fetchStructureState.implementation.type;
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    if (
      currentFetchStructureImplementationType !==
      this.fetchStructureState.implementation.type
    ) {
      this.fetchStructureState.changeImplementation(
        currentFetchStructureImplementationType,
      );
    }
  }

  changeClass(val: Class): void {
    this.resetQueryResult();
    this.resetQueryContent();
    this.setClass(val);
    this.explorerState.refreshTreeData();
    this.fetchStructureState.implementation.onClassChange(val);
    this.milestoningState.updateMilestoningConfiguration();
  }

  changeMapping(val: Mapping, options?: { keepQueryContent?: boolean }): void {
    this.resetQueryResult();
    if (!options?.keepQueryContent) {
      this.resetQueryContent();
      this.milestoningState.updateMilestoningConfiguration();
    }
    this.setMapping(val);
  }

  changeRuntime(val: Runtime): void {
    this.resetQueryResult();
    this.setRuntimeValue(val);
  }

  buildQuery(options?: { keepSourceInformation: boolean }): RawLambda {
    if (!this.isQuerySupported) {
      const parameters = this.parametersState.parameterStates.map((e) =>
        this.graphManagerState.graphManager.serializeValueSpecification(
          e.parameter,
        ),
      );
      this.unsupportedQueryState.setRawLambda(
        new RawLambda(parameters, this.unsupportedQueryState.rawLambda?.body),
      );
      return guaranteeNonNullable(this.unsupportedQueryState.rawLambda);
    }
    return buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        keepSourceInformation: Boolean(options?.keepSourceInformation),
      }),
      this.graphManagerState,
    );
  }

  initializeWithQuery(query: RawLambda): void {
    this.rebuildWithQuery(query);
    this.resetQueryResult();
    this.changeDetectionState.initialize(query);
  }

  /**
   * Process the provided query, and rebuild the query builder state.
   */
  rebuildWithQuery(
    query: RawLambda,
    options?: {
      preserveParameterValues?: boolean | undefined;
      preserveResult?: boolean | undefined;
    },
  ): void {
    const previousStateParameterValues = new Map<
      VariableExpression,
      ValueSpecification | undefined
    >();
    try {
      if (options?.preserveParameterValues) {
        // Preserving parameter values
        this.parametersState.parameterStates.forEach((ps) => {
          previousStateParameterValues.set(ps.parameter, ps.value);
        });
      }
      this.resetQueryResult({ preserveResult: options?.preserveResult });
      this.resetQueryContent();

      if (!isStubbed_RawLambda(query)) {
        const valueSpec = observe_ValueSpecification(
          this.graphManagerState.graphManager.buildValueSpecification(
            this.graphManagerState.graphManager.serializeRawValueSpecification(
              query,
            ),
            this.graphManagerState.graph,
          ),
          this.observerContext,
        );
        const compiledValueSpecification = guaranteeType(
          valueSpec,
          LambdaFunctionInstanceValue,
          `Can't build query state: query builder only support lambda`,
        );
        processQueryLambdaFunction(
          guaranteeNonNullable(compiledValueSpecification.values[0]),
          this,
          previousStateParameterValues,
        );
      }
      if (this.parametersState.parameterStates.length > 0) {
        this.setShowParametersPanel(true);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.resetQueryResult();
      this.resetQueryContent();
      this.unsupportedQueryState.setLambdaError(error);
      this.unsupportedQueryState.setRawLambda(query);
      this.setClass(undefined);
      const parameters = buildLambdaVariableExpressions(
        query,
        this.graphManagerState,
      )
        .map((param) => observe_ValueSpecification(param, this.observerContext))
        .filter(filterByType(VariableExpression));
      processParameters(parameters, this);
    }
  }

  async saveQuery(
    onSaveQuery: (lambda: RawLambda) => Promise<void>,
  ): Promise<void> {
    try {
      const query = this.buildQuery();
      await onSaveQuery(query);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Can't save query: ${error.message}`,
      );
    }
  }

  *compileQuery(): GeneratorFn<void> {
    if (!this.textEditorState.mode) {
      this.queryCompileState.inProgress();
      this.fetchStructureState.implementation.clearCompilationError();
      // form mode
      try {
        this.textEditorState.setCompilationError(undefined);
        // NOTE: retain the source information on the lambda in order to be able
        // to pin-point compilation issue in form mode
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.buildQuery({ keepSourceInformation: true }),
          this.graphManagerState.graph,
          { keepSourceInformation: true },
        )) as string;
        this.applicationStore.notificationService.notifySuccess(
          'Compiled successfully',
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
          error,
        );
        let fallbackToTextModeForDebugging = true;
        // if compilation failed, we try to reveal the error in form mode,
        // if even this fail, we will fall back to show it in text mode
        if (error instanceof CompilationError && error.sourceInformation) {
          fallbackToTextModeForDebugging =
            !this.fetchStructureState.implementation.revealCompilationError(
              error,
            );
        }

        // decide if we need to fall back to text mode for debugging
        if (fallbackToTextModeForDebugging) {
          this.applicationStore.notificationService.notifyWarning(
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
          );
          this.textEditorState.openModal(QueryBuilderTextEditorMode.TEXT);
          // TODO: trigger another compilation to pin-point the issue
          // since we're using the lambda editor right now, we are a little bit limitted
          // in terms of the timing to do compilation (since we're using an `useEffect` to
          // convert the lambda to grammar text), we might as well wait for the refactor
          // of query builder text-mode
          // See https://github.com/finos/legend-studio/issues/319
        } else {
          this.applicationStore.notificationService.notifyWarning(
            `Compilation failed: ${error.message}`,
          );
        }
      } finally {
        this.queryCompileState.complete();
      }
    } else if (this.textEditorState.mode === QueryBuilderTextEditorMode.TEXT) {
      this.queryCompileState.inProgress();
      try {
        this.textEditorState.setCompilationError(undefined);
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.textEditorState.rawLambdaState.lambda,
          this.graphManagerState.graph,
          { keepSourceInformation: true },
        )) as string;
        this.applicationStore.notificationService.notifySuccess(
          'Compiled successfully',
        );
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof CompilationError) {
          this.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
            error,
          );
          this.applicationStore.notificationService.notifyWarning(
            `Compilation failed: ${error.message}`,
          );
          const errorElementCoordinates = extractSourceInformationCoordinates(
            error.sourceInformation,
          );
          if (errorElementCoordinates) {
            this.textEditorState.setCompilationError(error);
          }
        }
      } finally {
        this.queryCompileState.complete();
      }
    }
  }

  get validationIssues(): string[] | undefined {
    return this.fetchStructureState.implementation.validationIssues;
  }

  /**
   * This method can be used to simplify the current query builder state
   * to a basic one that can be used for testing or some special operations,
   * see {@link INTERNAL__BasicQueryBuilderState} for more details
   */
  INTERNAL__toBasicQueryBuilderState(): QueryBuilderState {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const basicState = new INTERNAL__BasicQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
    );
    basicState.class = this.class;
    basicState.mapping = this.mapping;
    basicState.runtimeValue = this.runtimeValue;
    return basicState;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.QUERY_BUILDER_STATE,
      this.unsupportedQueryState,
      this.milestoningState,
      this.parametersState,
      this.filterState,
      this.watermarkState,
      this.checkEntitlementsState,
      this.fetchStructureState.implementation,
    ]);
  }
}

/**
 * This type is used for testing and analytics operation in query builder.
 * For example, we use this to build the preview data lambda, or to build the auto-complete lambda
 * in filters.
 *
 * NOTE: The latter is quite clever since query-builder itself is used to build the lambda (i.e. dogfooding),
 * unfortunately, it creates a circular dependency between QueryBuilderState and PreviewData/AutoComplete
 *
 * @internal
 */
export class INTERNAL__BasicQueryBuilderState extends QueryBuilderState {}
