/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import {
  type PackageableElement,
  type RawLambda,
  type ExecutionResult,
  buildSourceInformationSourceId,
  GRAPH_MANAGER_EVENT,
  ParserError,
  RawLambda as RawLambdaCtor,
  RelationTypeMetadata,
  observe_RelationTypeMetadata,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeType,
  hashArray,
  LogEvent,
  StopWatch,
} from '@finos/legend-shared';
import { LambdaEditorState } from '@finos/legend-query-builder';
import {
  type DataQualityRelationComparisonConfiguration,
  type DataQualityRelationQueryLambda,
  type ReconStrategy,
  MD5HashStrategy,
} from '../../graph-manager/index.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';

export type ComparisonSide = 'source' | 'target';

export enum RECONCILIATION_EXECUTION_TYPE {
  RECONCILIATION = 'RECONCILIATION',
  SOURCE_QUERY = 'SOURCE_QUERY',
  TARGET_QUERY = 'TARGET_QUERY',
}

export class ComparisonLambdaEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly queryLambda: DataQualityRelationQueryLambda;
  readonly label: ComparisonSide;
  readonly configurationState!: DataQualityRelationComparisonConfigurationState;

  isConvertingFunctionBodyToString = false;

  constructor(
    configurationState: DataQualityRelationComparisonConfigurationState,
    queryLambda: DataQualityRelationQueryLambda,
    editorStore: EditorStore,
    label: ComparisonSide,
  ) {
    super('', '|');

    makeObservable(this, {
      isConvertingFunctionBodyToString: observable,
    });

    this.queryLambda = queryLambda;
    this.editorStore = editorStore;
    this.label = label;
    this.configurationState = configurationState;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([`comparison_${this.label}`]);
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
        this.queryLambda.body = lambda.body;
        // Refresh relation columns after a successful query update (mirrors RelationFunctionDefinitionEditorState)
        yield flowResult(
          this.configurationState.fetchColumnsForLambda(
            this.queryLambda,
            this.label,
          ),
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
      this.queryLambda.body = new RawLambdaCtor(undefined, undefined).body;
      this.queryLambda.parameters = [];
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
    firstLoad?: boolean | undefined;
  }): GeneratorFn<void> {
    this.isConvertingFunctionBodyToString = true;
    try {
      const lambdas = new Map<string, RawLambda>();
      const functionLambda = new RawLambdaCtor([], this.queryLambda.body);
      lambdas.set(this.lambdaId, functionLambda);
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
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_FUNCTION_DEFINITION,
      this.queryLambda.body ? JSON.stringify(this.queryLambda.body) : '',
    ]);
  }
}

export class DataQualityRelationComparisonConfigurationState extends ElementEditorState {
  declare element: DataQualityRelationComparisonConfiguration;

  sourceLambdaEditorState: ComparisonLambdaEditorState;
  targetLambdaEditorState: ComparisonLambdaEditorState;

  sourceColumnMetadata: RelationTypeMetadata = new RelationTypeMetadata();
  targetColumnMetadata: RelationTypeMetadata = new RelationTypeMetadata();

  lastSourceQueryHash: string | undefined = undefined;
  lastTargetQueryHash: string | undefined = undefined;

  // Column-fetch state
  readonly fetchColumnsState = ActionState.create();
  sourceColumnFetchError: string | undefined = undefined;
  targetColumnFetchError: string | undefined = undefined;

  // Execution state
  currentExecutionType: RECONCILIATION_EXECUTION_TYPE | undefined = undefined;
  lastExecutionType: RECONCILIATION_EXECUTION_TYPE | undefined = undefined;
  executionResult?: ExecutionResult | undefined;
  executionDuration?: number | undefined;
  runPromise: Promise<ExecutionResult> | undefined = undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    this.element = element as DataQualityRelationComparisonConfiguration;

    this.sourceLambdaEditorState = new ComparisonLambdaEditorState(
      this,
      this.element.source,
      editorStore,
      'source',
    );

    this.targetLambdaEditorState = new ComparisonLambdaEditorState(
      this,
      this.element.target,
      editorStore,
      'target',
    );

    makeObservable(this, {
      setKeys: action,
      setColumnsToCompare: action,
      setStrategy: action,
      setSourceHashColumn: action,
      setTargetHashColumn: action,
      setAggregatedHash: action,
      sourceColumnMetadata: observable,
      targetColumnMetadata: observable,
      lastSourceQueryHash: observable,
      lastTargetQueryHash: observable,
      sourceLambdaEditorState: observable,
      targetLambdaEditorState: observable,
      fetchColumnsForLambda: flow,
      retryFetchColumns: flow,
      sourceColumnFetchError: observable,
      targetColumnFetchError: observable,
      hasColumnFetchError: computed,
      columnFetchError: computed,
      hasNoOverlappingColumns: computed,
      sourceColumnOptions: computed,
      targetColumnOptions: computed,
      combinedColumnOptions: computed,
      // Execution observables
      currentExecutionType: observable,
      lastExecutionType: observable,
      executionResult: observable,
      executionDuration: observable,
      runPromise: observable,
      isRunning: computed,
      setExecutionResult: action,
      setRunPromise: action,
      setExecutionDuration: action,
      run: flow,
      cancelRun: flow,
    });
  }

  setKeys(keys: string[]): void {
    this.element.keys = keys;
  }

  setColumnsToCompare(columns: string[]): void {
    this.element.columnsToCompare = columns;
  }

  setStrategy(strategy: ReconStrategy): void {
    this.element.strategy = strategy;
  }

  setSourceHashColumn(value: string | undefined): void {
    guaranteeType(this.element.strategy, MD5HashStrategy).sourceHashColumn =
      value;
  }

  setTargetHashColumn(value: string | undefined): void {
    guaranteeType(this.element.strategy, MD5HashStrategy).targetHashColumn =
      value;
  }

  setAggregatedHash(value: boolean | undefined): void {
    guaranteeType(this.element.strategy, MD5HashStrategy).aggregatedHash =
      value;
  }

  get sourceColumnOptions(): { value: string; label: string }[] {
    return this.sourceColumnMetadata.columns.map((col) => ({
      value: col.name,
      label: col.name,
    }));
  }

  get targetColumnOptions(): { value: string; label: string }[] {
    return this.targetColumnMetadata.columns.map((col) => ({
      value: col.name,
      label: col.name,
    }));
  }

  get combinedColumnOptions(): { value: string; label: string }[] {
    return this.sourceColumnOptions.filter((srcOpt) =>
      this.targetColumnOptions.some((tgtOpt) => tgtOpt.value === srcOpt.value),
    );
  }

  get hasColumnFetchError(): boolean {
    return (
      this.sourceColumnFetchError !== undefined ||
      this.targetColumnFetchError !== undefined
    );
  }

  get columnFetchError(): string | undefined {
    const errors = [
      this.sourceColumnFetchError,
      this.targetColumnFetchError,
    ].filter(Boolean);
    return errors.length > 0 ? errors.join('; ') : undefined;
  }

  get hasNoOverlappingColumns(): boolean {
    return (
      !this.fetchColumnsState.isInProgress &&
      !this.hasColumnFetchError &&
      this.sourceColumnOptions.length > 0 &&
      this.targetColumnOptions.length > 0 &&
      this.combinedColumnOptions.length === 0
    );
  }

  get isRunning(): boolean {
    return this.currentExecutionType !== undefined;
  }

  setExecutionResult(
    executionResult: ExecutionResult | undefined,
    type: RECONCILIATION_EXECUTION_TYPE,
  ): void {
    this.lastExecutionType = type;
    this.executionResult = executionResult;
  }

  setRunPromise(promise: Promise<ExecutionResult> | undefined): void {
    this.runPromise = promise;
  }

  setExecutionDuration(val: number | undefined): void {
    this.executionDuration = val;
  }

  private buildSourceLambda(): RawLambdaCtor {
    const { body, parameters } = this.element.source;
    return new RawLambdaCtor(parameters, body);
  }

  private buildTargetLambda(): RawLambdaCtor {
    const { body, parameters } = this.element.target;
    return new RawLambdaCtor(parameters, body);
  }

  *run(type: RECONCILIATION_EXECUTION_TYPE): GeneratorFn<void> {
    let promise: Promise<ExecutionResult> | undefined = undefined;
    const stopWatch = new StopWatch();
    try {
      this.currentExecutionType = type;
      const model = this.editorStore.graphManagerState.graph;
      const extension = getDataQualityPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      );
      const md5Strategy = guaranteeType(this.element.strategy, MD5HashStrategy);

      if (type === RECONCILIATION_EXECUTION_TYPE.RECONCILIATION) {
        promise = extension.runReconciliation(model, {
          source: this.buildSourceLambda(),
          target: this.buildTargetLambda(),
          keys: this.element.keys,
          colsForHash: this.element.columnsToCompare,
          aggregatedHash: md5Strategy.aggregatedHash,
          sourceHashCol: md5Strategy.sourceHashColumn,
          targetHashCol: md5Strategy.targetHashColumn,
          // make sure we fetch all columns we compare so users can see the differences
          includeColumnValues: true,
        });
      } else if (type === RECONCILIATION_EXECUTION_TYPE.SOURCE_QUERY) {
        promise = extension.runReconciliationSourceQuery(model, {
          source: this.buildSourceLambda(),
          target: this.buildTargetLambda(),
          keys: this.element.keys,
          colsForHash: this.element.columnsToCompare,
        });
      } else {
        promise = extension.runReconciliationTargetQuery(model, {
          source: this.buildSourceLambda(),
          target: this.buildTargetLambda(),
          keys: this.element.keys,
          colsForHash: this.element.columnsToCompare,
        });
      }

      this.setRunPromise(promise);
      const result = (yield promise) as ExecutionResult;

      if (this.runPromise === promise) {
        this.setExecutionResult(result, type);
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
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *fetchColumnsForLambda(
    queryLambda: DataQualityRelationQueryLambda,
    side: ComparisonSide,
  ): GeneratorFn<void> {
    const { body, parameters } = queryLambda;
    if (!body || (Array.isArray(body) && body.length === 0)) {
      return;
    }

    const lambda = new RawLambdaCtor(parameters, body);

    const editorState =
      side === 'source'
        ? this.sourceLambdaEditorState
        : this.targetLambdaEditorState;
    const currentQueryHash = editorState.hashCode;
    const lastHash =
      side === 'source' ? this.lastSourceQueryHash : this.lastTargetQueryHash;

    if (currentQueryHash === lastHash) {
      return;
    }

    this.fetchColumnsState.inProgress();
    try {
      const metadata = observe_RelationTypeMetadata(
        (yield this.editorStore.graphManagerState.graphManager.getLambdaRelationType(
          lambda,
          this.editorStore.graphManagerState.graph,
        )) as RelationTypeMetadata,
      );
      if (side === 'source') {
        this.sourceColumnMetadata = metadata;
        this.lastSourceQueryHash = currentQueryHash;
        this.sourceColumnFetchError = undefined;
      } else {
        this.targetColumnMetadata = metadata;
        this.lastTargetQueryHash = currentQueryHash;
        this.targetColumnFetchError = undefined;
      }
    } catch (error) {
      assertErrorThrown(error);
      // Update the hash even on failure so that reverting to a previously
      // successful query will see a different hash and trigger a refetch.
      if (side === 'source') {
        this.lastSourceQueryHash = currentQueryHash;
        this.sourceColumnFetchError = `Failed to fetch source relation columns: ${error.message}`;
      } else {
        this.lastTargetQueryHash = currentQueryHash;
        this.targetColumnFetchError = `Failed to fetch target relation columns: ${error.message}`;
      }
    } finally {
      this.fetchColumnsState.complete();
    }
  }

  *retryFetchColumns(): GeneratorFn<void> {
    // Reset hashes to force a refetch
    this.lastSourceQueryHash = undefined;
    this.lastTargetQueryHash = undefined;
    this.sourceColumnFetchError = undefined;
    this.targetColumnFetchError = undefined;
    yield flowResult(this.fetchColumnsForLambda(this.element.source, 'source'));
    yield flowResult(this.fetchColumnsForLambda(this.element.target, 'target'));
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new DataQualityRelationComparisonConfigurationState(
      editorStore,
      newElement,
    );
  }
}
