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
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  uuid,
  deleteEntry,
  addUniqueEntry,
  guaranteeNonNullable,
  findLast,
} from '@finos/legend-studio-shared';
import {
  QueryBuilderExplorerTreePropertyNodeData,
  getPropertyExpression,
} from './QueryBuilderExplorerState';
import {
  getPropertyChainName,
  QueryBuilderPropertyEditorState,
} from './QueryBuilderPropertyEditorState';
import type { QueryBuilderState } from './QueryBuilderState';
import type {
  AbstractPropertyExpression,
  CompilationError,
  EditorStore,
} from '@finos/legend-studio';
import {
  extractSourceInformationCoordinates,
  buildSourceInformationSourceId,
  ParserError,
  RawLambda,
  CORE_LOG_EVENT,
  LambdaEditorState,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../QueryBuilder_Const';
import { QueryBuilderAggregationState } from './QueryBuilderAggregationState';
import { QueryBuilderAggregateOperator_Count } from './aggregateOperators/QueryBuilderAggregateOperator_Count';
import { QueryBuilderAggregateOperator_Distinct } from './aggregateOperators/QueryBuilderAggregateOperator_Distinct';
import { QueryBuilderAggregateOperator_Sum } from './aggregateOperators/QueryBuilderAggregateOperator_Sum';
import { QueryBuilderAggregateOperator_Average } from './aggregateOperators/QueryBuilderAggregateOperator_Average';
import { QueryBuilderAggregateOperator_StdDev_Population } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Population';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Sample';
import { QueryBuilderAggregateOperator_DistinctCount } from './aggregateOperators/QueryBuilderAggregateOperator_DistinctCount';
import { QueryBuilderAggregateOperator_Min } from './aggregateOperators/QueryBuilderAggregateOperator_Min';
import { QueryBuilderAggregateOperator_Max } from './aggregateOperators/QueryBuilderAggregateOperator_Max';
import { QueryBuilderAggregateOperator_JoinString } from './aggregateOperators/QueryBuilderAggregateOperator_JoinString';

export type ProjectionColumnOption = {
  label: string;
  value: QueryBuilderProjectionColumnState;
};

export enum QUERY_BUILDER_PROJECTION_DND_TYPE {
  PROJECTION_COLUMN = 'PROJECTION_COLUMN',
}

export interface QueryBuilderProjectionColumnDragSource {
  columnState: QueryBuilderProjectionColumnState;
}

export abstract class QueryBuilderProjectionColumnState {
  uuid = uuid();
  editorStore: EditorStore;
  projectionState: QueryBuilderProjectionState;
  isBeingDragged = false;
  columnName: string;

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderProjectionState,
    columnName: string,
  ) {
    makeObservable(this, {
      uuid: false,
      editorStore: false,
      projectionState: false,
      isBeingDragged: observable,
      columnName: observable,
      setIsBeingDragged: action,
      setColumnName: action,
    });

    this.editorStore = editorStore;
    this.projectionState = projectionState;
    this.columnName = columnName;
  }

  setIsBeingDragged(val: boolean): void {
    this.isBeingDragged = val;
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }
}

export class QueryBuilderSimpleProjectionColumnState extends QueryBuilderProjectionColumnState {
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  propertyEditorState: QueryBuilderPropertyEditorState;

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderProjectionState,
    data: QueryBuilderExplorerTreePropertyNodeData | AbstractPropertyExpression,
    propertyExpressionProcessed?: boolean,
  ) {
    super(editorStore, projectionState, '');

    makeObservable(this, {
      lambdaParameterName: observable,
      propertyEditorState: observable,
      setLambdaParameterName: action,
      changeProperty: action,
    });

    const propertyExpression =
      data instanceof QueryBuilderExplorerTreePropertyNodeData
        ? getPropertyExpression(
            this.projectionState.queryBuilderState.explorerState
              .nonNullableTreeData,
            data,
            this.editorStore.graphState.graph.getTypicalMultiplicity(
              TYPICAL_MULTIPLICITY_TYPE.ONE,
            ),
          )
        : data;
    this.propertyEditorState = new QueryBuilderPropertyEditorState(
      editorStore,
      propertyExpression,
      propertyExpressionProcessed,
    );
    this.columnName = getPropertyChainName(
      this.propertyEditorState.propertyExpression,
    );
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  changeProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.propertyEditorState = new QueryBuilderPropertyEditorState(
      this.editorStore,
      getPropertyExpression(
        this.projectionState.queryBuilderState.explorerState
          .nonNullableTreeData,
        node,
        this.editorStore.graphState.graph.getTypicalMultiplicity(
          TYPICAL_MULTIPLICITY_TYPE.ONE,
        ),
      ),
    );
    this.columnName = getPropertyChainName(
      this.propertyEditorState.propertyExpression,
    );
  }
}

class QueryBuilderDerivationProjectionLambdaState extends LambdaEditorState {
  editorStore: EditorStore;
  derivationProjectionColumnState: QueryBuilderDerivationProjectionColumnState;
  /**
   * This is used to store the JSON string when viewing the query in JSON mode
   * TODO: consider moving this to another state if we need to simplify the logic of text-mode
   */
  readOnlylambdaJson = '';

  constructor(
    editorStore: EditorStore,
    derivationProjectionColumnState: QueryBuilderDerivationProjectionColumnState,
  ) {
    super('', '');
    this.editorStore = editorStore;
    this.derivationProjectionColumnState = derivationProjectionColumnState;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      QUERY_BUILDER_SOURCE_ID_LABEL.QUERY_BUILDER,
      QUERY_BUILDER_SOURCE_ID_LABEL.PROJECTION,
      this.derivationProjectionColumnState.uuid,
    ]);
  }

  setLambdaJson(lambdaJson: string): void {
    this.readOnlylambdaJson = lambdaJson;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: QueryBuilderDerivationProjectionLambdaState,
  ) {
    const emptyLambda = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.derivationProjectionColumnState.setLambda(lambda ?? emptyLambda);
      } catch (error: unknown) {
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      }
    } else {
      this.clearErrors();
      this.derivationProjectionColumnState.setLambda(emptyLambda);
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: QueryBuilderDerivationProjectionLambdaState,
    pretty: boolean,
  ) {
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
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
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
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

export class QueryBuilderDerivationProjectionColumnState extends QueryBuilderProjectionColumnState {
  derivationLambdaEditorState: QueryBuilderDerivationProjectionLambdaState;
  lambda: RawLambda;

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderProjectionState,
    lambda: RawLambda,
  ) {
    super(editorStore, projectionState, '');

    makeObservable(this, {
      lambda: observable,
      setLambda: action,
    });

    this.derivationLambdaEditorState =
      new QueryBuilderDerivationProjectionLambdaState(editorStore, this);
    this.lambda = lambda;
  }

  setLambda(val: RawLambda): void {
    this.lambda = val;
  }
}

export class QueryBuilderProjectionState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  columns: QueryBuilderProjectionColumnState[] = [];
  aggregationState: QueryBuilderAggregationState;
  isConvertDerivationProjectionObjects = false;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      removeColumn: action,
      addColumn: action,
      moveColumn: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.aggregationState = new QueryBuilderAggregationState(
      this.editorStore,
      this,
      [
        new QueryBuilderAggregateOperator_Count(),
        new QueryBuilderAggregateOperator_DistinctCount(),
        new QueryBuilderAggregateOperator_Distinct(),
        new QueryBuilderAggregateOperator_Sum(),
        new QueryBuilderAggregateOperator_Average(),
        new QueryBuilderAggregateOperator_Min(),
        new QueryBuilderAggregateOperator_Max(),
        new QueryBuilderAggregateOperator_StdDev_Population(),
        new QueryBuilderAggregateOperator_StdDev_Sample(),
        new QueryBuilderAggregateOperator_JoinString(),
      ],
    );
  }

  get columnOptions(): ProjectionColumnOption[] {
    return this.columns.map((projectionCol) => ({
      label: projectionCol.columnName,
      value: projectionCol,
    }));
  }

  *convertDerivationProjectionObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const derivationProjectionColumnStateMap = new Map<
      string,
      QueryBuilderDerivationProjectionColumnState
    >();
    this.columns
      .filter(
        (
          projectionColumnState,
        ): projectionColumnState is QueryBuilderDerivationProjectionColumnState =>
          projectionColumnState instanceof
          QueryBuilderDerivationProjectionColumnState,
      )
      .forEach((derivationProjectionColumnState) => {
        if (!derivationProjectionColumnState.lambda.isStub) {
          lambdas.set(
            derivationProjectionColumnState.derivationLambdaEditorState
              .lambdaId,
            derivationProjectionColumnState.lambda,
          );
          derivationProjectionColumnStateMap.set(
            derivationProjectionColumnState.derivationLambdaEditorState
              .lambdaId,
            derivationProjectionColumnState,
          );
        }
      });
    if (lambdas.size) {
      this.isConvertDerivationProjectionObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
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
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      } finally {
        this.isConvertDerivationProjectionObjects = false;
      }
    }
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

    // TODO: do a check here when we support more types of fetch structure
    this.queryBuilderState.resultSetModifierState.updateSortColumns();
  }

  addColumn(val: QueryBuilderProjectionColumnState): void {
    addUniqueEntry(this.columns, val);

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
      this.editorStore,
      this,
      // default lambda for derivation is `x|''`
      new RawLambda(
        [{ _type: 'var', name: 'x' }],
        [
          {
            _type: 'string',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            values: [''],
          },
        ],
      ),
    );
    this.addColumn(derivation);
    derivation.derivationLambdaEditorState.setLambdaString(`x|''`);
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
    this.columns
      .filter(
        (
          projectionColumnState,
        ): projectionColumnState is QueryBuilderDerivationProjectionColumnState =>
          projectionColumnState instanceof
          QueryBuilderDerivationProjectionColumnState,
      )
      .forEach((derivationProjectionColumnState) =>
        derivationProjectionColumnState.derivationLambdaEditorState.setCompilationError(
          undefined,
        ),
      );
  }
}
