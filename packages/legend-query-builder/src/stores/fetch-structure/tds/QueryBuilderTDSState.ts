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
  flowResult,
  makeObservable,
  observable,
  flow,
  computed,
} from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  changeEntry,
  guaranteeType,
  deleteEntry,
  addUniqueEntry,
  guaranteeNonNullable,
  findLast,
  filterByType,
  type Hashable,
  hashArray,
  UnsupportedOperationError,
  ContentType,
} from '@finos/legend-shared';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import {
  type CompilationError,
  type LambdaFunction,
  type ValueSpecification,
  type VariableExpression,
  type EngineError,
  GRAPH_MANAGER_EVENT,
  extractSourceInformationCoordinates,
  LAMBDA_PIPE,
  RawLambda,
  isStubbed_RawLambda,
  Class,
  AbstractPropertyExpression,
  matchFunctionName,
  SimpleFunctionExpression,
  getAllSuperclasses,
  EXECUTION_SERIALIZATION_FORMAT,
} from '@finos/legend-graph';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../../QueryBuilderConfig.js';
import {
  QueryBuilderAggregateColumnState,
  QueryBuilderAggregationState,
} from './aggregation/QueryBuilderAggregationState.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../QueryBuilderValueSpecificationHelper.js';
import {
  FETCH_STRUCTURE_IMPLEMENTATION,
  QueryBuilderFetchStructureImplementationState,
} from '../QueryBuilderFetchStructureImplementationState.js';
import { QueryResultSetModifierState } from './QueryResultSetModifierState.js';
import { QueryBuilderPostFilterState } from './post-filter/QueryBuilderPostFilterState.js';
import type { QueryBuilderPostFilterOperator } from './post-filter/QueryBuilderPostFilterOperator.js';
import { getQueryBuilderCorePostFilterOperators } from './post-filter/QueryBuilderPostFilterOperatorLoader.js';
import type { QueryBuilderAggregateOperator } from './aggregation/QueryBuilderAggregateOperator.js';
import { getQueryBuilderCoreAggregrationOperators } from './aggregation/QueryBuilderAggregateOperatorLoader.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  type QueryBuilderProjectionColumnState,
} from './projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderFetchStructureState } from '../QueryBuilderFetchStructureState.js';
import {
  buildPropertyExpressionFromExplorerTreeNodeData,
  generateExplorerTreePropertyNodeID,
  generateExplorerTreeSubtypeNodeID,
  type QueryBuilderExplorerTreePropertyNodeData,
} from '../../explorer/QueryBuilderExplorerState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import type { LambdaFunctionBuilderOption } from '../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendProjection } from './projection/QueryBuilderProjectionValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { QueryBuilderWindowState } from './window/QueryBuilderWindowState.js';
import type { QueryBuilderTDS_WindowOperator } from './window/operators/QueryBuilderTDS_WindowOperator.js';
import { getQueryBuilderCoreWindowOperators } from './window/QueryBuilderWindowGroupByOperatorLoader.js';
import type { QueryBuilderTDSColumnState } from './QueryBuilderTDSColumnState.js';
import { QUERY_BUILDER_SETTING_KEY } from '../../../__lib__/QueryBuilderSetting.js';
import type { ExportDataInfo } from '../../QueryBuilderResultState.js';
import type { QueryBuilderAggregateCalendarFunction } from './aggregation/QueryBuilderAggregateCalendarFunction.js';
import { getQueryBuilderCoreAggregrationCalendarFunctions } from './aggregation/QueryBuilderAggregateCalendarFunctionLoader.js';

// TODO: should we support raw once externalize() is supported on TDS ?
export enum TDS_EXECUTION_SERIALIZATION_FORMAT {
  CSV = 'CSV',
}

export class QueryBuilderTDSState
  extends QueryBuilderFetchStructureImplementationState
  implements Hashable
{
  readonly aggregationState: QueryBuilderAggregationState;
  readonly postFilterState: QueryBuilderPostFilterState;
  readonly windowState: QueryBuilderWindowState;
  readonly resultSetModifierState: QueryResultSetModifierState;
  projectionColumns: QueryBuilderProjectionColumnState[] = [];
  isConvertDerivationProjectionObjects = false;
  showPostFilterPanel: boolean;
  showWindowFuncPanel = false;
  useColFunc = false;

  postFilterOperators: QueryBuilderPostFilterOperator[] =
    getQueryBuilderCorePostFilterOperators();
  aggregationOperators: QueryBuilderAggregateOperator[] =
    getQueryBuilderCoreAggregrationOperators();
  aggregationCalendarFunctions: QueryBuilderAggregateCalendarFunction[] =
    getQueryBuilderCoreAggregrationCalendarFunctions();
  windowFuncOperators: QueryBuilderTDS_WindowOperator[] =
    getQueryBuilderCoreWindowOperators();

  constructor(
    queryBuilderState: QueryBuilderState,
    fetchStructureState: QueryBuilderFetchStructureState,
  ) {
    super(queryBuilderState, fetchStructureState);

    makeObservable(this, {
      aggregationState: observable,
      projectionColumns: observable,
      isConvertDerivationProjectionObjects: observable,
      showPostFilterPanel: observable,
      showWindowFuncPanel: observable,
      useColFunc: observable,
      TEMPORARY__showPostFetchStructurePanel: computed,
      derivations: computed,
      hasParserError: computed,
      isQueryOptionsSet: computed,
      addColumn: action,
      moveColumn: action,
      removeAllColumns: action,
      removeColumn: action,
      replaceColumn: action,
      initialize: action,
      initializeWithQuery: action,
      setShowPostFilterPanel: action,
      setShowWindowFuncPanel: action,
      setUseColFunc: action,
      checkBeforeChangingImplementation: action,
      convertDerivationProjectionObjects: flow,
      fetchDerivedReturnTypes: flow,
    });

    this.resultSetModifierState = new QueryResultSetModifierState(this);
    this.postFilterState = new QueryBuilderPostFilterState(
      this,
      this.postFilterOperators,
    );
    this.aggregationState = new QueryBuilderAggregationState(
      this,
      this.aggregationOperators,
      this.aggregationCalendarFunctions,
    );
    this.windowState = new QueryBuilderWindowState(
      this,
      this.windowFuncOperators,
    );
    this.showPostFilterPanel =
      this.queryBuilderState.applicationStore.settingService.getBooleanValue(
        QUERY_BUILDER_SETTING_KEY.SHOW_POST_FILTER_PANEL,
      ) ?? false;
  }

  get type(): string {
    return FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE;
  }

  get derivations(): QueryBuilderDerivationProjectionColumnState[] {
    return this.projectionColumns.filter(
      filterByType(QueryBuilderDerivationProjectionColumnState),
    );
  }

  get hasParserError(): boolean {
    return this.derivations.some(
      (derivation) => derivation.derivationLambdaEditorState.parserError,
    );
  }

  override get fetchLabel(): string {
    return 'Columns';
  }

  override get canBeExportedToCube(): boolean {
    return true;
  }

  override get TEMPORARY__showPostFetchStructurePanel(): boolean {
    return (
      this.queryBuilderState.filterState.showPanel ||
      this.showWindowFuncPanel ||
      this.showPostFilterPanel
    );
  }

  get usedExplorerTreePropertyNodeIDs(): string[] {
    let nodeIDs: string[] = [];
    this.projectionColumns.forEach((column) => {
      if (column instanceof QueryBuilderSimpleProjectionColumnState) {
        let chunks: (string | Class)[] = [];
        let currentExpression: ValueSpecification =
          column.propertyExpressionState.propertyExpression;
        while (currentExpression instanceof AbstractPropertyExpression) {
          chunks.push(currentExpression.func.value.name);
          currentExpression = guaranteeNonNullable(
            currentExpression.parametersValues[0],
          );
          while (currentExpression instanceof SimpleFunctionExpression) {
            if (
              matchFunctionName(
                currentExpression.functionName,
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
              ) &&
              currentExpression.parametersValues.length >= 1 &&
              currentExpression.parametersValues[1]?.genericType?.value
                .rawType instanceof Class
            ) {
              // flatten subtype casting chain: stop pushing more classes
              if (!(chunks[chunks.length - 1] instanceof Class)) {
                chunks.push(
                  currentExpression.parametersValues[1]?.genericType?.value
                    .rawType,
                );
              }
              currentExpression = guaranteeNonNullable(
                currentExpression.parametersValues[0],
              );
            } else {
              // unknown property expression
              return;
            }
          }
        }
        chunks = chunks.reverse();
        const chunkIDs: string[] = [];
        const ids: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const currentChunk = guaranteeNonNullable(chunks[i]);
          const previousID = i > 0 ? guaranteeNonNullable(chunkIDs[i - 1]) : '';
          if (currentChunk instanceof Class) {
            getAllSuperclasses(currentChunk)
              .concat(currentChunk)
              .forEach((_class) =>
                ids.push(
                  generateExplorerTreeSubtypeNodeID(previousID, _class.path),
                ),
              );
            chunkIDs.push(
              generateExplorerTreeSubtypeNodeID(previousID, currentChunk.path),
            );
          } else {
            const id = generateExplorerTreePropertyNodeID(
              previousID,
              currentChunk,
            );
            chunkIDs.push(id);
            ids.push(id);
          }
        }

        nodeIDs = nodeIDs.concat(ids);
      }
    });

    // deduplicate
    return Array.from(new Set(nodeIDs).values());
  }

  get fetchStructureValidationIssues(): string[] {
    const validationIssues: string[] = [];

    const hasEmptyProjectionColumnName = this.projectionColumns.some(
      (column) => column.columnName.length === 0,
    );
    if (hasEmptyProjectionColumnName) {
      validationIssues.push('Query has projection column with no name');
    }

    const hasInValidCalendarAggregateColumns =
      this.aggregationState.columns.some(
        (column) =>
          column.calendarFunction &&
          column.calendarFunction.dateColumn === undefined,
      );
    if (hasInValidCalendarAggregateColumns) {
      validationIssues.push(
        'Query has calendar function with no date column specified',
      );
    }

    const hasDuplicatedProjectionColumns = this.projectionColumns.some(
      (column) =>
        this.projectionColumns.filter((c) => c.columnName === column.columnName)
          .length > 1,
    );
    if (hasDuplicatedProjectionColumns) {
      validationIssues.push('Query has duplicated projection columns');
    }

    const hasDuplicatedProjectionWindowColumns = this.projectionColumns.some(
      (column) =>
        this.windowState.windowColumns.filter(
          (c) => c.columnName === column.columnName,
        ).length > 0,
    );
    if (hasDuplicatedProjectionWindowColumns) {
      validationIssues.push('Query has duplicated projection/window columns');
    }

    const hasNoProjectionColumns =
      this.projectionColumns.length === 0 &&
      this.queryBuilderState.changeHistoryState.canUndo;
    if (hasNoProjectionColumns) {
      validationIssues.push('Query has no projection columns');
    }

    this.projectionColumns.forEach((column) => {
      if (
        column instanceof QueryBuilderSimpleProjectionColumnState &&
        column.propertyExpressionState.derivedPropertyExpressionStates.some(
          (p) => !p.isValid,
        )
      ) {
        validationIssues.push(
          `Derived property parameter value for ${column.propertyExpressionState.title} is missing`,
        );
      }
    });

    this.aggregationState.allValidationIssues.forEach((issue) =>
      validationIssues.push(issue),
    );

    return validationIssues;
  }

  get allValidationIssues(): string[] {
    const fetchStructureValidationIssues = [
      ...this.fetchStructureValidationIssues,
      ...this.windowState.windowValidationIssues,
      ...this.postFilterState.allValidationIssues,
    ];

    return fetchStructureValidationIssues;
  }

  get isQueryOptionsSet(): boolean {
    return (
      this.resultSetModifierState.limit !== undefined ||
      this.queryBuilderState.milestoningState.isMilestonedQuery ||
      this.resultSetModifierState.slice !== undefined ||
      this.resultSetModifierState.sortColumns.length > 0 ||
      this.resultSetModifierState.distinct
    );
  }

  get tdsColumns(): QueryBuilderTDSColumnState[] {
    const aggregationStateCols = this.aggregationState.columns.map(
      (c) => c.projectionColumnState,
    );
    // remove projection columns in aggregation
    const projectionColumns = this.projectionColumns.filter(
      (c) => !aggregationStateCols.includes(c),
    );
    return [
      ...this.aggregationState.columns,
      ...projectionColumns,
      ...this.windowState.windowColumns,
    ];
  }

  override get exportDataFormatOptions(): string[] {
    return [TDS_EXECUTION_SERIALIZATION_FORMAT.CSV];
  }

  override getExportDataInfo(format: string): ExportDataInfo {
    switch (format) {
      case TDS_EXECUTION_SERIALIZATION_FORMAT.CSV:
        return {
          contentType: ContentType.TEXT_CSV,
          serializationFormat: EXECUTION_SERIALIZATION_FORMAT.CSV,
        };

      default:
        throw new UnsupportedOperationError(
          `Unsupported TDS export type ${format}`,
        );
    }
  }

  isDuplicateColumn(col: QueryBuilderTDSColumnState): boolean {
    return (
      this.tdsColumns.filter((c) => c.columnName === col.columnName).length > 1
    );
  }

  override initialize(): void {
    this.queryBuilderState.filterState.setShowPanel(true);
    this.setShowPostFilterPanel(false);
    this.setShowWindowFuncPanel(false);
  }

  override initializeWithQuery(): void {
    flowResult(this.fetchDerivedReturnTypes()).catch(
      this.queryBuilderState.applicationStore.alertUnhandledError,
    );
  }

  isColumnInUse(tdsCol: QueryBuilderTDSColumnState): boolean {
    return Boolean(
      [
        ...this.postFilterState.referencedTDSColumns,
        ...this.windowState.referencedTDSColumns,
      ].find((col) => {
        if (col instanceof QueryBuilderAggregateColumnState) {
          return tdsCol instanceof QueryBuilderAggregateColumnState
            ? tdsCol === col
            : col.projectionColumnState === tdsCol;
        }
        return col === tdsCol;
      }),
    );
  }

  onClassChange(_class: Class | undefined): void {
    return;
  }

  appendFetchStructure(
    lambdaFunction: LambdaFunction,
    options?: LambdaFunctionBuilderOption,
  ): void {
    appendProjection(this, lambdaFunction, options);
  }

  setShowPostFilterPanel(val: boolean): void {
    this.showPostFilterPanel = val;
  }

  setShowWindowFuncPanel(val: boolean): void {
    this.showWindowFuncPanel = val;
  }

  setUseColFunc(val: boolean): void {
    this.useColFunc = val;
  }

  *convertDerivationProjectionObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const derivationProjectionColumnStateMap = new Map<
      string,
      QueryBuilderDerivationProjectionColumnState
    >();
    this.derivations.forEach((derivationProjectionColumnState) => {
      if (!isStubbed_RawLambda(derivationProjectionColumnState.lambda)) {
        lambdas.set(
          derivationProjectionColumnState.derivationLambdaEditorState.lambdaId,
          derivationProjectionColumnState.lambda,
        );
        derivationProjectionColumnStateMap.set(
          derivationProjectionColumnState.derivationLambdaEditorState.lambdaId,
          derivationProjectionColumnState,
        );
      }
    });
    if (lambdas.size) {
      this.isConvertDerivationProjectionObjects = true;
      try {
        const isolatedLambdas =
          (yield this.queryBuilderState.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const derivationProjectionColumnState =
            derivationProjectionColumnStateMap.get(key);
          derivationProjectionColumnState?.derivationLambdaEditorState.setLambdaString(
            derivationProjectionColumnState.derivationLambdaEditorState.extractLambdaString(
              grammarText,
            ),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertDerivationProjectionObjects = false;
      }
    }
  }

  transformSimpleProjectionToDerivation(
    simpleProjectionColumnState: QueryBuilderSimpleProjectionColumnState,
  ): void {
    // setup new derivation column state
    const columnColumnLambda = buildGenericLambdaFunctionInstanceValue(
      simpleProjectionColumnState.lambdaParameterName,
      [simpleProjectionColumnState.propertyExpressionState.propertyExpression],
      this.queryBuilderState.graphManagerState.graph,
    );
    const derivationColumnState =
      new QueryBuilderDerivationProjectionColumnState(
        this,
        guaranteeType(
          this.queryBuilderState.graphManagerState.graphManager.transformValueSpecToRawValueSpec(
            columnColumnLambda,
            this.queryBuilderState.graphManagerState.graph,
          ),
          RawLambda,
        ),
      );
    derivationColumnState.setColumnName(simpleProjectionColumnState.columnName);

    this.replaceColumn(simpleProjectionColumnState, derivationColumnState);

    // convert to grammar for display
    flowResult(
      derivationColumnState.derivationLambdaEditorState.convertLambdaObjectToGrammarString(
        {
          pretty: false,
        },
      ),
    ).catch(this.queryBuilderState.applicationStore.alertUnhandledError);
  }

  replaceColumn(
    oldVal: QueryBuilderProjectionColumnState,
    newVal: QueryBuilderProjectionColumnState,
  ): void {
    // reassociation with column aggregation state if applicable
    const corresspondingAggregateColumnState =
      this.aggregationState.columns.find(
        (aggregateColState) =>
          aggregateColState.projectionColumnState === oldVal,
      );
    if (corresspondingAggregateColumnState) {
      corresspondingAggregateColumnState.setColumnState(newVal);
    }

    // reassociation with column sorting state if applicable
    const corresspondingSortColumnState =
      this.resultSetModifierState.sortColumns.find(
        (sortColState) => sortColState.columnState === oldVal,
      );
    if (corresspondingSortColumnState) {
      corresspondingSortColumnState.setColumnState(newVal);
    }

    changeEntry(this.projectionColumns, oldVal, newVal);
  }

  removeAllColumns(): void {
    this.projectionColumns = [];
    this.aggregationState.columns = [];
  }

  removeColumn(val: QueryBuilderProjectionColumnState): void {
    deleteEntry(this.projectionColumns, val);

    // remove aggregation that goes with the projection
    const existingAggregateColumnState = this.aggregationState.columns.find(
      (column) => column.projectionColumnState === val,
    );
    if (existingAggregateColumnState) {
      this.aggregationState.removeColumn(existingAggregateColumnState);
    }

    this.resultSetModifierState.updateSortColumns();
  }

  addColumn(
    val: QueryBuilderProjectionColumnState,
    options?: {
      /**
       * Often time, we would want to enforce doing a sort when adding new column
       * to ensure aggregate columns stay at the bottom of the list of projections
       * But sometimes, we can opt in to use this flag to disable this sorting behavior,
       * such as when we build/process.
       */
      skipSorting?: boolean | undefined;
    },
  ): void {
    addUniqueEntry(this.projectionColumns, val);

    if (!options?.skipSorting) {
      // sort columns: aggregate columns go last
      this.projectionColumns = this.projectionColumns.toSorted(
        (colA, colB) =>
          (this.aggregationState.columns.find(
            (column) => column.projectionColumnState === colA,
          )
            ? 1
            : 0) -
          (this.aggregationState.columns.find(
            (column) => column.projectionColumnState === colB,
          )
            ? 1
            : 0),
      );
    }
  }

  moveColumn(sourceIndex: number, targetIndex: number): void {
    if (
      sourceIndex < 0 ||
      sourceIndex >= this.projectionColumns.length ||
      targetIndex < 0 ||
      targetIndex >= this.projectionColumns.length
    ) {
      return;
    }

    const sourceColumn = guaranteeNonNullable(
      this.projectionColumns[sourceIndex],
    );

    // find last non aggregate column index for computation
    const lastNonAggregateColumn = findLast(
      this.projectionColumns,
      (projectionCol) =>
        !this.aggregationState.columns.find(
          (column) => column.projectionColumnState === projectionCol,
        ),
    );

    const lastNonAggregateColumnIndex = lastNonAggregateColumn
      ? this.projectionColumns.lastIndexOf(lastNonAggregateColumn)
      : 0;
    if (
      this.aggregationState.columns.find(
        (column) => column.projectionColumnState === sourceColumn,
      )
    ) {
      // if the column being moved is an aggregate column,
      // it cannot be moved to before the first aggregate column
      targetIndex = Math.max(
        targetIndex,
        Math.min(
          lastNonAggregateColumnIndex + 1,
          this.projectionColumns.length - 1,
        ),
      );
    } else {
      // if the column being moved is not an aggregate column,
      // it cannot be moved to after the last non-aggregate column
      targetIndex = Math.min(targetIndex, lastNonAggregateColumnIndex);
    }

    // move
    this.projectionColumns.splice(sourceIndex, 1);
    this.projectionColumns.splice(targetIndex, 0, sourceColumn);
  }

  addNewBlankDerivation(): void {
    const derivation = new QueryBuilderDerivationProjectionColumnState(
      this,
      this.queryBuilderState.graphManagerState.graphManager.createDefaultBasicRawLambda(
        { addDummyParameter: true },
      ),
    );
    this.addColumn(derivation);
    derivation.derivationLambdaEditorState.setLambdaString(
      `${DEFAULT_LAMBDA_VARIABLE_NAME}${LAMBDA_PIPE}''`,
    );
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    const elementCoordinates = extractSourceInformationCoordinates(
      compilationError.sourceInformation,
    );
    if (
      elementCoordinates &&
      elementCoordinates.length === 3 &&
      elementCoordinates[0] === QUERY_BUILDER_SOURCE_ID_LABEL.QUERY_BUILDER &&
      elementCoordinates[1] === QUERY_BUILDER_SOURCE_ID_LABEL.PROJECTION
    ) {
      const derivationProjectionState = this.projectionColumns.find(
        (projectionColumnState) =>
          projectionColumnState.uuid === elementCoordinates[2],
      );
      if (
        derivationProjectionState instanceof
        QueryBuilderDerivationProjectionColumnState
      ) {
        derivationProjectionState.derivationLambdaEditorState.setCompilationError(
          compilationError,
        );
        return true;
      }
    }
    return false;
  }

  clearCompilationError(): void {
    this.derivations.forEach((derivationProjectionColumnState) =>
      derivationProjectionColumnState.derivationLambdaEditorState.setCompilationError(
        undefined,
      ),
    );
  }

  fetchProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.addColumn(
      new QueryBuilderSimpleProjectionColumnState(
        this,
        buildPropertyExpressionFromExplorerTreeNodeData(
          node,
          this.queryBuilderState.explorerState,
        ),
        this.queryBuilderState.explorerState.humanizePropertyName,
      ),
    );
  }

  fetchProperties(nodes: QueryBuilderExplorerTreePropertyNodeData[]): void {
    nodes.forEach((nodeToAdd) => {
      this.addColumn(
        new QueryBuilderSimpleProjectionColumnState(
          this,
          buildPropertyExpressionFromExplorerTreeNodeData(
            nodeToAdd,
            this.queryBuilderState.explorerState,
          ),
          this.queryBuilderState.explorerState.humanizePropertyName,
        ),
      );
    });
  }

  checkBeforeClearingColumns(onChange: () => void): void {
    this.queryBuilderState.applicationStore.alertService.setActionAlertInfo({
      message:
        'You will be clearing all projection columns. Do you still want to proceed?',
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Proceed',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: this.queryBuilderState.applicationStore.guardUnhandledError(
            async () => onChange(),
          ),
        },
        {
          label: 'Cancel',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  }

  checkBeforeChangingImplementation(onChange: () => void): void {
    if (
      this.projectionColumns.length > 0
      // NOTE: here we could potentially check for the presence of post-filter as well
      // but we make the assumption that if there is no projection column, there should
      // not be any post-filter at all
    ) {
      this.queryBuilderState.applicationStore.alertService.setActionAlertInfo({
        message:
          this.showPostFilterPanel && this.postFilterState.nodes.size > 0
            ? 'With graph-fetch mode, post filter is not supported. Current projection columns and post filters will be lost when switching to the graph-fetch mode. Do you still want to proceed?'
            : 'Current projection columns will be lost when switching to the graph-fetch mode. Do you still want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler:
              this.queryBuilderState.applicationStore.guardUnhandledError(
                async () => onChange(),
              ),
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      onChange();
    }
  }

  isVariableUsed(variable: VariableExpression): boolean {
    const columns = this.projectionColumns;
    const derivationColumns = columns.filter(
      filterByType(QueryBuilderDerivationProjectionColumnState),
    );
    if (derivationColumns.length) {
      // we will return false if any derivation cols are present as we can't verify is the variable is used
      return false;
    }
    const usedInProjection = columns
      .filter(filterByType(QueryBuilderSimpleProjectionColumnState))
      .find((col) => col.isVariableUsed(variable));
    const usedInPostFilter = this.postFilterState.isVariableUsed(variable);
    return Boolean(usedInProjection ?? usedInPostFilter);
  }

  get hasInvalidFilterValues(): boolean {
    return (
      this.postFilterState.hasInvalidFilterValues ||
      this.postFilterState.hasInvalidDerivedPropertyParameters
    );
  }

  get hasInvalidDerivedPropertyParameters(): boolean {
    return this.projectionColumns.some(
      (column) =>
        column instanceof QueryBuilderSimpleProjectionColumnState &&
        column.propertyExpressionState.derivedPropertyExpressionStates.some(
          (p) => !p.isValid,
        ),
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.PROJECTION_STATE,
      hashArray(this.projectionColumns),
      this.aggregationState,
      this.postFilterState,
      this.resultSetModifierState,
    ]);
  }

  *fetchDerivedReturnTypes(): GeneratorFn<void> {
    try {
      const input = new Map<string, RawLambda>();
      const graph = this.queryBuilderState.graphManagerState.graph;
      const derivedCols = this.projectionColumns.filter(
        filterByType(QueryBuilderDerivationProjectionColumnState),
      );
      derivedCols.forEach((col) =>
        input.set(col.columnName, col.getIsolatedRawLambda()),
      );
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.getLambdasReturnType(
          input,
          graph,
        )) as {
          results: Map<string, string>;
          errors: Map<string, EngineError>;
        };
      Array.from(result.results.entries()).forEach((res) => {
        const col = derivedCols.find((d) => d.columnName === res[0]);
        if (col) {
          col.setLambdaReturnType(res[1]);
        }
      });
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.info(
        LogEvent.create('Unable to fetch derived return types'),
        error,
      );
    }
  }
}
