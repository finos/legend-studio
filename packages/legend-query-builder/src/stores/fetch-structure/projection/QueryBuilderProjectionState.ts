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
} from '@finos/legend-shared';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import {
  type CompilationError,
  GRAPH_MANAGER_EVENT,
  extractSourceInformationCoordinates,
  LAMBDA_PIPE,
  RawLambda,
  isStubbed_RawLambda,
  Class,
  type LambdaFunction,
  type ValueSpecification,
  AbstractPropertyExpression,
  matchFunctionName,
  SimpleFunctionExpression,
  getAllSuperclasses,
} from '@finos/legend-graph';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../../QueryBuilderConfig.js';
import { QueryBuilderAggregationState } from './aggregation/QueryBuilderAggregationState.js';
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
} from './QueryBuilderProjectionColumnState.js';
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
import { appendProjection } from './QueryBuilderProjectionValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../graphManager/QueryBuilderHashUtils.js';

export class QueryBuilderProjectionState
  extends QueryBuilderFetchStructureImplementationState
  implements Hashable
{
  readonly aggregationState: QueryBuilderAggregationState;
  readonly postFilterState: QueryBuilderPostFilterState;
  readonly resultSetModifierState: QueryResultSetModifierState;
  columns: QueryBuilderProjectionColumnState[] = [];
  isConvertDerivationProjectionObjects = false;
  showPostFilterPanel = false;

  postFilterOperators: QueryBuilderPostFilterOperator[] =
    getQueryBuilderCorePostFilterOperators();
  aggregationOperators: QueryBuilderAggregateOperator[] =
    getQueryBuilderCoreAggregrationOperators();

  constructor(
    queryBuilderState: QueryBuilderState,
    fetchStructureState: QueryBuilderFetchStructureState,
  ) {
    super(queryBuilderState, fetchStructureState);

    makeObservable(this, {
      columns: observable,
      isConvertDerivationProjectionObjects: observable,
      showPostFilterPanel: observable,
      derivations: computed,
      hasParserError: computed,
      addColumn: action,
      moveColumn: action,
      replaceColumn: action,
      setShowPostFilterPanel: action,
      convertDerivationProjectionObjects: flow,
    });

    this.resultSetModifierState = new QueryResultSetModifierState(this);
    this.postFilterState = new QueryBuilderPostFilterState(
      this,
      this.postFilterOperators,
    );
    this.aggregationState = new QueryBuilderAggregationState(
      this,
      this.aggregationOperators,
    );
  }

  get type(): string {
    return FETCH_STRUCTURE_IMPLEMENTATION.PROJECTION;
  }

  get derivations(): QueryBuilderDerivationProjectionColumnState[] {
    return this.columns.filter(
      filterByType(QueryBuilderDerivationProjectionColumnState),
    );
  }

  get hasParserError(): boolean {
    return this.derivations.some(
      (derivation) => derivation.derivationLambdaEditorState.parserError,
    );
  }

  get usedExplorerTreePropertyNodeIDs(): string[] {
    let nodeIDs: string[] = [];
    this.columns.forEach((column) => {
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

  get validationIssues(): string[] | undefined {
    const hasDuplicatedProjectionColumns = this.columns.some(
      (column) =>
        this.columns.filter((c) => c.columnName === column.columnName).length >
        1,
    );
    if (hasDuplicatedProjectionColumns) {
      return ['Query has duplicated projection columns'];
    }
    const hasNoProjectionColumns = this.columns.length === 0;
    if (hasNoProjectionColumns) {
      return ['Query has no projection columns'];
    }
    return undefined;
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
        this.queryBuilderState.applicationStore.log.error(
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
          this.queryBuilderState.graphManagerState.graphManager.buildRawValueSpecification(
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
        false,
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

    changeEntry(this.columns, oldVal, newVal);
  }

  removeColumn(val: QueryBuilderProjectionColumnState): void {
    deleteEntry(this.columns, val);

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
    addUniqueEntry(this.columns, val);

    if (!options?.skipSorting) {
      // sort columns: aggregate columns go last
      this.columns = this.columns
        .slice()
        .sort(
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
      sourceIndex >= this.columns.length ||
      targetIndex < 0 ||
      targetIndex >= this.columns.length
    ) {
      return;
    }

    const sourceColumn = guaranteeNonNullable(this.columns[sourceIndex]);

    // find last non aggregate column index for computation
    const lastNonAggregateColumn = findLast(
      this.columns,
      (projectionCol) =>
        !this.aggregationState.columns.find(
          (column) => column.projectionColumnState === projectionCol,
        ),
    );

    const lastNonAggregateColumnIndex = lastNonAggregateColumn
      ? this.columns.lastIndexOf(lastNonAggregateColumn)
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
        Math.min(lastNonAggregateColumnIndex + 1, this.columns.length - 1),
      );
    } else {
      // if the column being moved is not an aggregate column,
      // it cannot be moved to after the last non-aggregate column
      targetIndex = Math.min(targetIndex, lastNonAggregateColumnIndex);
    }

    // move
    this.columns.splice(sourceIndex, 1);
    this.columns.splice(targetIndex, 0, sourceColumn);
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
      const derivationProjectionState = this.columns.find(
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

  checkBeforeChangingImplementation(onChange: () => void): void {
    if (
      this.columns.length > 0
      // NOTE: here we could potentially check for the presence of post-filter as well
      // but we make the assumption that if there is no projection column, there should
      // not be any post-filter at all
    ) {
      this.queryBuilderState.applicationStore.setActionAlertInfo({
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

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.PROJECTION_STATE,
      hashArray(this.columns),
      this.aggregationState,
      this.postFilterState,
      this.resultSetModifierState,
    ]);
  }
}
