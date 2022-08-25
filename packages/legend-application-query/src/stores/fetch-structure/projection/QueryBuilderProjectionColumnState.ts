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

import { action, makeObservable, observable, flow } from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  uuid,
  guaranteeNonNullable,
  assertTrue,
  assertNonEmptyString,
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
  type Type,
  type VariableExpression,
  PackageableElementExplicitReference,
  GRAPH_MANAGER_EVENT,
  PRIMITIVE_TYPE,
  buildSourceInformationSourceId,
  ParserError,
  TYPICAL_MULTIPLICITY_TYPE,
  RawVariableExpression,
  Enumeration,
  RawLambda,
  stub_RawLambda,
} from '@finos/legend-graph';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../../../QueryBuilder_Const.js';
import { LambdaEditorState } from '@finos/legend-application';
import type { QueryBuilderProjectionState } from './QueryBuilderProjectionState.js';

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
