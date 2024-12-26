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
  type DataQualityRelationValidation,
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
import type { SelectOption } from '@finos/legend-art';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import { downloadStream } from '@finos/legend-application';

export enum DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB {
  DEFINITION = 'Definition',
  VALIDATIONS = 'Validations',
  TRIAL_RUN = 'Trial Run',
}

export class RelationFunctionDefinitionEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly relationValidationElement: DataQualityRelationValidationConfiguration;

  isConvertingFunctionBodyToString = false;

  constructor(
    relationValidationElement: DataQualityRelationValidationConfiguration,
    editorStore: EditorStore,
  ) {
    super('', '|');

    makeObservable(this, {
      relationValidationElement: observable,
      isConvertingFunctionBodyToString: observable,
    });

    this.relationValidationElement = relationValidationElement;
    this.editorStore = editorStore;
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

  openModal(lambda: RawLambda, runLambdaWithConstraints: boolean): void {
    this.parameterStates = this.build(lambda);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(
          runLambdaWithConstraints
            ? this.relationValidationConfigurationState.resultState.runValidation()
            : this.relationValidationConfigurationState.runValidation(),
        ).catch(
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

  isRunningValidation = false;
  isGeneratingPlan = false;
  validationRunPromise: Promise<ExecutionResult> | undefined = undefined;
  executionResult?: ExecutionResult | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;
  validationStates: DataQualityRelationValidationState[] = [];
  parametersState: RelationDefinitionParameterState;
  isConvertingValidationLambdaObjects = false;
  resultState: DataQualityRelationResultState;
  executionDuration?: number | undefined;
  latestRunHashCode?: string | undefined;

  constructor(
    editorStore: EditorStore,
    element: DataQualityRelationValidationConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      isRunningValidation: observable,
      validationRunPromise: observable,
      executionResult: observable,
      resultState: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      setSelectedTab: action,
      setValidationRunPromise: action,
      setExecutionResult: action,
      addValidationState: action,
      resetResultState: action,
      setExecutionDuration: action,
      validationElement: computed,
      relationValidationOptions: computed,
      checkForStaleResults: computed,
      runValidation: flow,
      handleRunValidation: flow,
      convertValidationLambdaObjects: flow,
      cancelValidationRun: flow,
      generatePlan: flow,
      exportData: flow,
    });
    assertType(
      element,
      DataQualityRelationValidationConfiguration,
      'Element inside data quality relation validation editor state must be a data quality relation validation element',
    );
    this.relationFunctionDefinitionEditorState =
      new RelationFunctionDefinitionEditorState(element, this.editorStore);
    this.selectedTab = DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.DEFINITION;
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
      this.validationStates.push(
        new DataQualityRelationValidationState(validation, this.editorStore),
      );
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

  setValidationRunPromise = (
    promise: Promise<ExecutionResult> | undefined,
  ): void => {
    this.validationRunPromise = promise;
  };

  setSelectedTab(tab: DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  setExecutionResult = (executionResult: ExecutionResult | undefined): void => {
    this.executionResult = executionResult;
  };

  *handleRunValidation(): GeneratorFn<void> {
    if (this.isRunningValidation) {
      return;
    }
    const queryLambda = this.bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openModal(queryLambda, false);
    } else {
      flowResult(this.runValidation()).catch(
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

  setIsRunningValidation(val: boolean): void {
    this.isRunningValidation = val;
  }

  *runValidation(): GeneratorFn<void> {
    let promise;
    try {
      this.setIsRunningValidation(true);
      const currentHashCode = this.hashCode;
      const packagePath = this.validationElement.path;
      const model = this.editorStore.graphManagerState.graph;
      const stopWatch = new StopWatch();

      promise = getDataQualityPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      ).execute(model, packagePath, {
        runQuery: true,
        lambdaParameterValues: buildExecutionParameterValues(
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
      });

      this.setValidationRunPromise(promise);
      const result = (yield promise) as ExecutionResult;

      if (this.validationRunPromise === promise) {
        this.setExecutionResult(result);
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);
      }
    } catch (error) {
      if (this.validationRunPromise === promise) {
        assertErrorThrown(error);
        this.setExecutionResult(undefined);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.setIsRunningValidation(false);
    }
  }

  *cancelValidationRun(): GeneratorFn<void> {
    this.setIsRunningValidation(false);
    this.setValidationRunPromise(undefined);
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
      const packagePath = this.validationElement.path;
      const model = this.editorStore.graphManagerState.graph;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Export ${format} will run in background`,
      );
      const exportData = this.resultState.getExportDataInfo(format);
      const contentType = exportData.contentType;
      const serializationFormat = exportData.serializationFormat;
      const result = (yield getDataQualityPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      ).exportData(model, packagePath, {
        serializationFormat,
        runQuery: true,
        lambdaParameterValues: buildExecutionParameterValues(
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
      })) as Response;
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

  handleExport(format: string) {
    const queryLambda = this.bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.parameterStates =
        this.parametersState.build(queryLambda);
      this.parametersState.parameterValuesEditorState.open(
        (): Promise<void> =>
          flowResult(this.exportData(format)).catch(
            this.editorStore.applicationStore.alertUnhandledError,
          ),
        PARAMETER_SUBMIT_ACTION.EXPORT,
      );
    } else {
      flowResult(this.exportData(format)).catch(
        this.editorStore.applicationStore.alertUnhandledError,
      );
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
