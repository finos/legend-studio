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
  uuid,
  deleteEntry,
  addUniqueEntry,
  guaranteeNonNullable,
  findLast,
  assertTrue,
  assertNonEmptyString,
  filterByType,
} from '@finos/legend-shared';
import {
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
} from '../../explorer/QueryBuilderExplorerState.js';
import {
  getPropertyChainName,
  QueryBuilderPropertyExpressionState,
} from '../../QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import {
  type AbstractPropertyExpression,
  type CompilationError,
  type Type,
  type VariableExpression,
  PackageableElementExplicitReference,
  GRAPH_MANAGER_EVENT,
  PRIMITIVE_TYPE,
  extractSourceInformationCoordinates,
  buildSourceInformationSourceId,
  ParserError,
  TYPICAL_MULTIPLICITY_TYPE,
  RawVariableExpression,
  Enumeration,
  LAMBDA_PIPE,
  RawLambda,
  stub_RawLambda,
  isStubbed_RawLambda,
} from '@finos/legend-graph';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../../../QueryBuilder_Const.js';
import { QueryBuilderAggregationState } from './aggregation/QueryBuilderAggregationState.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../QueryBuilderValueSpecificationHelper.js';
import { LambdaEditorState } from '@finos/legend-application';
import { QueryBuilderFetchStructureImplementationState } from '../QueryBuilderFetchStructureImplementationState.js';
import { QueryResultSetModifierState } from './QueryResultSetModifierState.js';
import { QueryBuilderPostFilterState } from './post-filter/QueryBuilderPostFilterState.js';
import type { QueryBuilderPostFilterOperator } from './post-filter/QueryBuilderPostFilterOperator.js';
import { getQueryBuilderCorePostFilterOperators } from './post-filter/QueryBuilderPostFilterOperatorLoader.js';
import type { QueryBuilderAggregateOperator } from './aggregation/QueryBuilderAggregateOperator.js';
import { getQueryBuilderCoreAggregrationOperators } from './aggregation/QueryBuilderAggregateOperatorLoader.js';

export const QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE = 'PROJECTION_COLUMN';

export interface QueryBuilderProjectionColumnDragSource {
  columnState: QueryBuilderProjectionColumnState;
}

export abstract class QueryBuilderProjectionColumnState {
  readonly uuid = uuid();
  projectionState: QueryBuilderProjectionState;
  columnName: string;

  constructor(
    projectionState: QueryBuilderProjectionState,
    columnName: string,
  ) {
    makeObservable(this, {
      uuid: false,
      projectionState: false,
      columnName: observable,
      setColumnName: action,
    });

    this.projectionState = projectionState;
    this.columnName = columnName;
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }

  abstract getReturnType(): Type | undefined;
}

export class QueryBuilderSimpleProjectionColumnState extends QueryBuilderProjectionColumnState {
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  propertyExpressionState: QueryBuilderPropertyExpressionState;

  constructor(
    projectionState: QueryBuilderProjectionState,
    propertyExpression: AbstractPropertyExpression,
    humanizePropertyName: boolean,
  ) {
    super(projectionState, '');

    makeObservable(this, {
      lambdaParameterName: observable,
      propertyExpressionState: observable,
      setLambdaParameterName: action,
      changeProperty: action,
    });

    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      projectionState.queryBuilderState,
      propertyExpression,
    );
    this.columnName = getPropertyChainName(
      this.propertyExpressionState.propertyExpression,
      humanizePropertyName,
    );
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  changeProperty(
    node: QueryBuilderExplorerTreePropertyNodeData,
    humanizePropertyName: boolean,
  ): void {
    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      this.projectionState.queryBuilderState,
      buildPropertyExpressionFromExplorerTreeNodeData(
        this.projectionState.queryBuilderState.explorerState
          .nonNullableTreeData,
        node,
        this.projectionState.queryBuilderState.graphManagerState.graph,
        this.projectionState.queryBuilderState.explorerState
          .propertySearchPanelState.allMappedPropertyNodes,
      ),
    );
    this.columnName = getPropertyChainName(
      this.propertyExpressionState.propertyExpression,
      humanizePropertyName,
    );
  }

  override getReturnType(): Type | undefined {
    return this.propertyExpressionState.propertyExpression.func.genericType
      .value.rawType;
  }
}

class QueryBuilderDerivationProjectionLambdaState extends LambdaEditorState {
  queryBuilderState: QueryBuilderState;
  derivationProjectionColumnState: QueryBuilderDerivationProjectionColumnState;
  /**
   * This is used to store the JSON string when viewing the query in JSON mode
   * TODO: consider moving this to another state if we need to simplify the logic of text-mode
   */
  readOnlylambdaJson = '';

  constructor(
    queryBuilderState: QueryBuilderState,
    derivationProjectionColumnState: QueryBuilderDerivationProjectionColumnState,
  ) {
    super('', '');
    this.queryBuilderState = queryBuilderState;
    this.derivationProjectionColumnState = derivationProjectionColumnState;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      // TODO: to be reworked
      // See https://github.com/finos/legend-studio/issues/1168
      QUERY_BUILDER_SOURCE_ID_LABEL.QUERY_BUILDER,
      QUERY_BUILDER_SOURCE_ID_LABEL.PROJECTION,
      this.derivationProjectionColumnState.uuid,
    ]);
  }

  setLambdaJson(lambdaJson: string): void {
    this.readOnlylambdaJson = lambdaJson;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.queryBuilderState.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.derivationProjectionColumnState.setLambda(lambda);
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.queryBuilderState.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.derivationProjectionColumnState.setLambda(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (this.derivationProjectionColumnState.lambda.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(
            this.derivationProjectionColumnState.lambda.parameters,
            this.derivationProjectionColumnState.lambda.body,
          ),
        );
        const isolatedLambdas =
          (yield this.queryBuilderState.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }
}

export class QueryBuilderDerivationProjectionColumnState extends QueryBuilderProjectionColumnState {
  derivationLambdaEditorState: QueryBuilderDerivationProjectionLambdaState;
  lambda: RawLambda;
  returnType: Type | undefined;

  constructor(projectionState: QueryBuilderProjectionState, lambda: RawLambda) {
    super(projectionState, '(derivation)');

    makeObservable(this, {
      lambda: observable,
      returnType: observable,
      setLambda: action,
      fetchDerivationLambdaReturnType: flow,
    });

    this.derivationLambdaEditorState =
      new QueryBuilderDerivationProjectionLambdaState(
        projectionState.queryBuilderState,
        this,
      );
    this.lambda = lambda;
  }

  setLambda(val: RawLambda): void {
    this.lambda = val;
  }

  setReturnType(val: Type | undefined): void {
    this.returnType = val;
  }

  /**
   * Fetches lambda return type for derivation column.
   * Throws error if unable to fetch type or if type is not primitive or an enumeration
   * as expected by a projection column
   */
  *fetchDerivationLambdaReturnType(): GeneratorFn<void> {
    assertTrue(Array.isArray(this.lambda.parameters));
    const projectionParameter = this.lambda.parameters as object[];
    const graph =
      this.projectionState.queryBuilderState.graphManagerState.graph;
    const multiplicityOne = graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
    assertTrue(projectionParameter.length === 1);
    const variable = projectionParameter[0] as VariableExpression;
    assertNonEmptyString(variable.name);
    // assign variable to query class
    const rawVariableExpression = new RawVariableExpression(
      variable.name,
      multiplicityOne,
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(
          this.projectionState.queryBuilderState.querySetupState._class,
        ),
      ),
    );
    const _rawVariableExpression =
      this.projectionState.queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        rawVariableExpression,
      );
    const isolatedLambda = new RawLambda(
      [_rawVariableExpression],
      this.lambda.body,
    );
    const type =
      (yield this.projectionState.queryBuilderState.graphManagerState.graphManager.getLambdaReturnType(
        isolatedLambda,
        graph,
      )) as string;
    const resolvedType = graph.getType(type);
    assertTrue(
      Object.values(PRIMITIVE_TYPE).includes(
        resolvedType.path as PRIMITIVE_TYPE,
      ) || resolvedType instanceof Enumeration,
      'projection column must have primitive return type',
    );
    this.setReturnType(resolvedType);
  }

  override getReturnType(): Type | undefined {
    return this.returnType;
  }
}

export class QueryBuilderProjectionState extends QueryBuilderFetchStructureImplementationState {
  columns: QueryBuilderProjectionColumnState[] = [];
  aggregationState: QueryBuilderAggregationState;
  postFilterState: QueryBuilderPostFilterState;
  resultSetModifierState: QueryResultSetModifierState;
  isConvertDerivationProjectionObjects = false;
  showPostFilterPanel = false;

  postFilterOperators: QueryBuilderPostFilterOperator[] =
    getQueryBuilderCorePostFilterOperators();
  aggregationOperators: QueryBuilderAggregateOperator[] =
    getQueryBuilderCoreAggregrationOperators();

  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);

    makeObservable(this, {
      columns: observable,
      aggregationState: observable,
      postFilterState: observable,
      resultSetModifierState: observable,
      isConvertDerivationProjectionObjects: observable,
      showPostFilterPanel: observable,
      derivations: computed,
      hasParserError: computed,
      validationIssues: computed,
      addColumn: action,
      moveColumn: action,
      replaceColumn: action,
      setShowPostFilterPanel: action,
      convertDerivationProjectionObjects: flow,
    });

    this.queryBuilderState = queryBuilderState;
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
}
