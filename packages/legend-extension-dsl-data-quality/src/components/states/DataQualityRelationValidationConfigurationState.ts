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
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import {
  DataQualityRelationValidation,
  DataQualityRelationValidationConfiguration,
  RelationValidationType,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  hashArray,
  LogEvent,
  filterByType,
  getContentTypeFileExtension,
  ActionState,
  StopWatch,
} from '@finos/legend-shared';
import {
  type ExecutionResult,
  type RawExecutionPlan,
  buildSourceInformationSourceId,
  GRAPH_MANAGER_EVENT,
  isStubbed_PackageableElement,
  isStubbed_RawLambda,
  ParserError,
  RawLambda,
  buildLambdaVariableExpressions,
  observe_ValueSpecification,
  VariableExpression,
  V1_DELEGATED_EXPORT_HEADER,
  RelationTypeMetadata,
  observe_RelationTypeMetadata,
} from '@finos/legend-graph';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  buildExecutionParameterValues,
  ExecutionPlanState,
  LambdaEditorState,
  LambdaParametersState,
  LambdaParameterState,
  PARAMETER_SUBMIT_ACTION,
} from '@finos/legend-query-builder';
import { DataQualityRelationValidationState } from './DataQualityRelationValidationState.js';
import { DataQualityRelationResultState } from './DataQualityRelationResultState.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import { PanelDisplayState, type SelectOption } from '@finos/legend-art';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import { downloadStream } from '@finos/legend-application';
import {
  SuggestedValidationsState,
  SuggestionType,
} from './DataQualityRelationValidationSuggestedValidationState.js';
import {
  dataQualityRelationValidation_addValidation,
  dataQualityRelationValidation_setAssertion,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';

export enum DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB {
  DEFINITION = 'Definition',
  VALIDATIONS = 'Validations',
  TRIAL_RUN = 'Trial Run',
}

export enum EXECUTION_TYPE {
  EXECUTION = 'EXECUTION',
  PROFILING = 'PROFILING',
}

export class RelationFunctionDefinitionEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly relationValidationElement: DataQualityRelationValidationConfiguration;
  readonly configurationState: DataQualityRelationValidationConfigurationState;

  isConvertingFunctionBodyToString = false;

  constructor(
    relationValidationElement: DataQualityRelationValidationConfiguration,
    editorStore: EditorStore,
    configurationState: DataQualityRelationValidationConfigurationState,
  ) {
    super('', '|');

    makeObservable(this, {
      relationValidationElement: observable,
      isConvertingFunctionBodyToString: observable,
    });

    this.relationValidationElement = relationValidationElement;
    this.editorStore = editorStore;
    this.configurationState = configurationState;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.relationValidationElement.path,
    ]);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.relationValidationElement.query.body = lambda.body;
        // Refresh relation columns after successful query update
        yield flowResult(
          this.configurationState.setupValidationStatesWithColumns(),
        );
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.relationValidationElement.query.body = new RawLambda(
        undefined,
        undefined,
      ).body;
      this.relationValidationElement.query.parameters = [];
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
    firstLoad?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_PackageableElement(this.relationValidationElement)) {
      this.isConvertingFunctionBodyToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        const functionLamba = new RawLambda(
          [],
          this.relationValidationElement.query.body,
        );
        lambdas.set(this.lambdaId, functionLamba);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        if (grammarText) {
          this.setLambdaString(this.extractLambdaString(grammarText));
        } else {
          this.setLambdaString('');
        }
        // `firstLoad` flag is used in the first rendering of the function editor (in a `useEffect`)
        // This flag helps block editing while the JSON is converting to text and to avoid reseting parser/compiler error in reveal error
        if (!options?.firstLoad) {
          this.clearErrors({
            preserveCompilationError: options?.preserveCompilationError,
          });
        }
        this.isConvertingFunctionBodyToString = false;
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        this.isConvertingFunctionBodyToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_FUNCTION_DEFINITION,
      this.lambdaString,
    ]);
  }
}

export class RelationDefinitionParameterState extends LambdaParametersState {
  readonly relationValidationConfigurationState: DataQualityRelationValidationConfigurationState;

  constructor(
    relationValidationConfigurationState: DataQualityRelationValidationConfigurationState,
  ) {
    super();
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameterStates: observable,
      addParameter: action,
      removeParameter: action,
      openModal: action,
      build: action,
      setParameters: action,
    });
    this.relationValidationConfigurationState =
      relationValidationConfigurationState;
  }

  openModal(lambda: RawLambda, onSubmit: () => GeneratorFn<void>): void {
    this.parameterStates = this.build(lambda);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(onSubmit()).catch(
          this.relationValidationConfigurationState.editorStore.applicationStore
            .alertUnhandledError,
        ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  build(lambda: RawLambda): LambdaParameterState[] {
    const parameters = buildLambdaVariableExpressions(
      lambda,
      this.relationValidationConfigurationState.editorStore.graphManagerState,
    )
      .map((parameter) =>
        observe_ValueSpecification(
          parameter,
          this.relationValidationConfigurationState.editorStore
            .changeDetectionState.observerContext,
        ),
      )
      .filter(filterByType(VariableExpression));
    const states = parameters.map((variable) => {
      const parmeterState = new LambdaParameterState(
        variable,
        this.relationValidationConfigurationState.editorStore.changeDetectionState.observerContext,
        this.relationValidationConfigurationState.editorStore.graphManagerState.graph,
      );
      parmeterState.mockParameterValue();
      return parmeterState;
    });
    return states;
  }
}

export class DataQualityRelationValidationConfigurationState extends ElementEditorState {
  readonly relationFunctionDefinitionEditorState: RelationFunctionDefinitionEditorState;
  readonly exportState = ActionState.create();
  selectedTab: DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB;

  lastExecutionType: EXECUTION_TYPE | undefined = undefined;
  currentExecutionType: EXECUTION_TYPE | undefined = undefined;
  isGeneratingPlan = false;
  runPromise: Promise<ExecutionResult> | undefined = undefined;
  executionResult?: ExecutionResult | undefined;
  executionPlanState: ExecutionPlanState;
  validationStates: DataQualityRelationValidationState[] = [];
  suggestedValidationsState: SuggestedValidationsState;
  parametersState: RelationDefinitionParameterState;
  isConvertingValidationLambdaObjects = false;
  resultState: DataQualityRelationResultState;
  executionDuration?: number | undefined;
  latestRunHashCode?: string | undefined;
  isSuggestionPanelOpen = false;
  relationTypeMetadata: RelationTypeMetadata = new RelationTypeMetadata();
  lastRelationColumnsQueryHash: string | undefined = undefined;

  constructor(
    editorStore: EditorStore,
    element: DataQualityRelationValidationConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      currentExecutionType: observable,
      runPromise: observable,
      executionResult: observable,
      resultState: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      lastExecutionType: observable,
      isSuggestionPanelOpen: observable,
      validationStates: observable,
      setSelectedTab: action,
      setRunPromise: action,
      setExecutionResult: action,
      addValidationState: action,
      resetResultState: action,
      setExecutionDuration: action,
      applyOrModifySuggestion: action,
      applySuggestion: action,
      modifyExistingSuggestion: action,
      deleteValidationState: action,
      validationElement: computed,
      relationValidationOptions: computed,
      checkForStaleResults: computed,
      isRunning: computed,
      run: flow,
      handleRun: flow,
      exportData: flow,
      getRelationColumns: flow,
      relationTypeMetadata: observable,
      convertValidationLambdaObjects: flow,
      cancelRun: flow,
      generatePlan: flow,
      setupValidationStatesWithColumns: flow,
    });

    assertType(
      element,
      DataQualityRelationValidationConfiguration,
      'Element inside data quality relation validation editor state must be a data quality relation validation element',
    );
    this.relationFunctionDefinitionEditorState =
      new RelationFunctionDefinitionEditorState(
        element,
        this.editorStore,
        this,
      );
    this.selectedTab = DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.DEFINITION;
    this.relationTypeMetadata = observe_RelationTypeMetadata(
      this.relationTypeMetadata,
    );

    this.validationElement.validations.forEach((validation) => {
      this.validationStates.push(
        new DataQualityRelationValidationState(validation, editorStore),
      );
    });

    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    this.parametersState = new RelationDefinitionParameterState(this);
    this.resultState = new DataQualityRelationResultState(this);
    this.suggestedValidationsState = new SuggestedValidationsState(this);

    flowResult(this.setupValidationStatesWithColumns()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
  }

  *setupValidationStatesWithColumns(): GeneratorFn<void> {
    yield flowResult(this.getRelationColumns());
    this.validationStates.forEach((validationState) => {
      validationState.initializeWithColumns(this.relationTypeMetadata.columns);
    });
  }

  reprocess(
    newElement: DataQualityRelationValidationConfiguration,
    editorStore: EditorStore,
  ): DataQualityRelationValidationConfigurationState {
    return new DataQualityRelationValidationConfigurationState(
      editorStore,
      newElement,
    );
  }

  get validationElement(): DataQualityRelationValidationConfiguration {
    return guaranteeType(
      this.element,
      DataQualityRelationValidationConfiguration,
      'Element inside data quality relation validation state must be a data quality relation validation configuration element',
    );
  }

  get validationOptions(): SelectOption[] {
    return this.validationElement.validations.map((validation) => {
      return {
        label: validation.name,
        value: validation,
      };
    });
  }

  getNullableValidationState = (
    relationValidation: DataQualityRelationValidation,
  ): DataQualityRelationValidationState | undefined =>
    this.validationStates.find(
      (validationState) =>
        validationState.relationValidation === relationValidation,
    );

  getValidationState = (
    validation: DataQualityRelationValidation,
  ): DataQualityRelationValidationState =>
    guaranteeNonNullable(
      this.getNullableValidationState(validation),
      `Can't find validation state for validation ${validation}`,
    );

  get relationValidationOptions(): SelectOption[] {
    return Object.values(RelationValidationType).map((type) => ({
      label: type,
      value: type,
    }));
  }

  get checkForStaleResults(): boolean {
    if (this.latestRunHashCode !== this.hashCode) {
      return true;
    }
    return false;
  }

  get isRunning(): boolean {
    return this.currentExecutionType !== undefined;
  }

  setExecutionDuration(val: number | undefined): void {
    this.executionDuration = val;
  }

  resetResultState(): void {
    this.resultState = new DataQualityRelationResultState(this);
  }

  addValidationState(validation: DataQualityRelationValidation): void {
    if (
      !this.validationStates.find(
        (validationState) => validationState.relationValidation === validation,
      )
    ) {
      const validationState = new DataQualityRelationValidationState(
        validation,
        this.editorStore,
      );
      validationState.initializeWithColumns(this.relationTypeMetadata.columns);
      this.validationStates.push(validationState);
    }
  }

  deleteValidationState(validation: DataQualityRelationValidation): void {
    const idx = this.validationStates.findIndex(
      (validationState) => validationState.relationValidation === validation,
    );
    if (idx !== -1) {
      this.validationStates.splice(idx, 1);
    }
  }

  setRunPromise = (promise: Promise<ExecutionResult> | undefined): void => {
    this.runPromise = promise;
  };

  setSelectedTab(tab: DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  setExecutionResult = (
    executionResult: ExecutionResult | undefined,
    type: EXECUTION_TYPE,
  ): void => {
    this.lastExecutionType = type;
    this.executionResult = executionResult;
  };

  *handleRun(type: EXECUTION_TYPE): GeneratorFn<void> {
    if (this.isRunning) {
      return;
    }
    const queryLambda = this.bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openModal(queryLambda, () => this.run(type));
    } else {
      flowResult(this.run(type)).catch(
        this.editorStore.applicationStore.alertUnhandledError,
      );
    }
  }

  *convertValidationLambdaObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, DataQualityRelationValidationState>();
    this.validationStates.forEach((validationState) => {
      if (!isStubbed_RawLambda(validationState.relationValidation.assertion)) {
        lambdas.set(
          validationState.lambdaId,
          validationState.relationValidation.assertion,
        );
        index.set(validationState.lambdaId, validationState);
      }
    });
    if (lambdas.size) {
      this.isConvertingValidationLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const validationState = index.get(key);
          validationState?.setLambdaString(
            validationState.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingValidationLambdaObjects = false;
      }
    }
  }

  get bodyExpressionSequence(): RawLambda {
    return new RawLambda(
      this.validationElement.query.parameters.map((parameter) =>
        this.editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          parameter,
        ),
      ),
      this.validationElement.query.body,
    );
  }

  *run(type: EXECUTION_TYPE): GeneratorFn<void> {
    let promise: Promise<ExecutionResult> | undefined = undefined;
    const stopWatch = new StopWatch();
    try {
      this.currentExecutionType = type;
      const currentHashCode = this.hashCode;
      const packagePath = this.validationElement.path;
      const model = this.editorStore.graphManagerState.graph;
      const extension = getDataQualityPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      );

      const options = {
        lambdaParameterValues: buildExecutionParameterValues(
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
      };

      promise =
        type === EXECUTION_TYPE.PROFILING
          ? extension.runDataProfiling(model, packagePath, options)
          : extension.execute(model, packagePath, {
              ...options,
              runQuery: true,
            });

      this.setRunPromise(promise);
      const result = (yield promise) as ExecutionResult;

      if (this.runPromise === promise) {
        this.setExecutionResult(result, type);
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);
      }
    } catch (error) {
      if (this.runPromise === promise) {
        assertErrorThrown(error);
        this.setExecutionResult(undefined, type);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.currentExecutionType = undefined;
    }
  }

  *cancelRun(): GeneratorFn<void> {
    this.currentExecutionType = undefined;
    this.setRunPromise(undefined);
    try {
      yield this.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    const packagePath = this.validationElement.path;
    const model = this.editorStore.graphManagerState.graph;
    try {
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;

      if (debug) {
        const debugResult = (yield getDataQualityPureGraphManagerExtension(
          this.editorStore.graphManagerState.graphManager,
        ).debugExecutionPlanGeneration(model, packagePath, {
          runQuery: true,
        })) as {
          plan: RawExecutionPlan;
          debug: string;
        };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        rawPlan = (yield getDataQualityPureGraphManagerExtension(
          this.editorStore.graphManagerState.graphManager,
        ).generatePlan(model, packagePath, {
          runQuery: true,
        })) as RawExecutionPlan;
      }

      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.editorStore.graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      } catch {
        //do nothing
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *exportData(format: string): GeneratorFn<void> {
    try {
      this.exportState.inProgress();
      const type = this.lastExecutionType;
      const packagePath = this.validationElement.path;
      const model = this.editorStore.graphManagerState.graph;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Export ${format} will run in background`,
      );
      const exportData = this.resultState.getExportDataInfo(format);
      const contentType = exportData.contentType;
      const serializationFormat = exportData.serializationFormat;
      const extension = getDataQualityPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      );

      const options = {
        serializationFormat,
        lambdaParameterValues: buildExecutionParameterValues(
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
      };

      const result =
        type === EXECUTION_TYPE.PROFILING
          ? ((yield extension.exportDataProfiling(
              model,
              packagePath,
              options,
            )) as Response)
          : ((yield extension.exportData(model, packagePath, {
              ...options,
              runQuery: true,
            })) as Response);

      if (result.headers.get(V1_DELEGATED_EXPORT_HEADER) === 'true') {
        if (result.status === 200) {
          this.exportState.pass();
        } else {
          this.exportState.fail();
        }
        return;
      }
      downloadStream(
        result,
        `result.${getContentTypeFileExtension(contentType)}`,
        exportData.contentType,
      )
        .then(() => {
          this.exportState.pass();
        })
        .catch((error) => {
          assertErrorThrown(error);
        });
    } catch (error) {
      this.exportState.fail();
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.exportState.complete();
    }
  }

  *getRelationColumns(): GeneratorFn<void> {
    // skip if the query body is not defined
    const { body, parameters } =
      this.relationFunctionDefinitionEditorState.relationValidationElement
        .query;
    if (!body || (Array.isArray(body) && body.length === 0)) return;

    const lambda = new RawLambda(parameters, body);

    // this is to avoid unecessary calls, we only care if the actual lambda has changed, otherwise we don't want to updated column metadata
    const currentQueryHash =
      this.relationFunctionDefinitionEditorState.hashCode;
    if (currentQueryHash === this.lastRelationColumnsQueryHash) {
      return;
    }

    try {
      this.relationTypeMetadata = observe_RelationTypeMetadata(
        yield this.editorStore.graphManagerState.graphManager.getLambdaRelationType(
          lambda,
          this.editorStore.graphManagerState.graph,
        ),
      );
      this.lastRelationColumnsQueryHash = currentQueryHash;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error getting relation type columns: ${error.message}`,
      );
    }
  }

  applySuggestion(validationState: DataQualityRelationValidationState): void {
    const relationValidation = validationState.relationValidation;
    // Create a NEW validation instance
    const newValidation = new DataQualityRelationValidation(
      relationValidation.name,
      new RawLambda(
        relationValidation.assertion.parameters,
        relationValidation.assertion.body,
      ),
    );
    if (relationValidation.type) {
      newValidation.type = relationValidation.type;
    }
    newValidation.description = relationValidation.description;

    // Add to model (this modifies the graph)
    dataQualityRelationValidation_addValidation(
      this.validationElement,
      newValidation,
    );

    this.addValidationState(newValidation);
    const newValidationState = this.getValidationState(newValidation);
    newValidationState.setLambdaString(validationState.lambdaString);
    // Force proper GUI editor initialization if needed
    if (newValidationState.isGUIEditor) {
      newValidationState.initializeWithColumns(
        this.relationTypeMetadata.columns,
      );
    }
  }

  modifyExistingSuggestion(
    validation: DataQualityRelationValidationState,
  ): void {
    const existingValidation = this.validationElement.validations.find(
      (v) => v.name === validation.relationValidation.name,
    );
    if (existingValidation) {
      dataQualityRelationValidation_setAssertion(
        existingValidation,
        new RawLambda(
          validation.relationValidation.assertion.parameters,
          validation.relationValidation.assertion.body,
        ),
      );
      const existingValidationState =
        this.getValidationState(existingValidation);
      existingValidationState.setLambdaString(validation.lambdaString);

      if (existingValidationState.isGUIEditor) {
        existingValidationState.initializeWithColumns(
          this.relationTypeMetadata.columns,
        );
      }
    }
  }

  applyOrModifySuggestion(
    validationState: DataQualityRelationValidationState,
  ): void {
    const suggestionType =
      this.suggestedValidationsState.getSuggestionType(validationState);

    if (suggestionType === SuggestionType.NEW) {
      this.applySuggestion(validationState);
    } else if (suggestionType === SuggestionType.EDIT) {
      this.modifyExistingSuggestion(validationState);
    }
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION,
      this.relationFunctionDefinitionEditorState,
      hashArray(this.validationStates),
    ]);
  }
}
