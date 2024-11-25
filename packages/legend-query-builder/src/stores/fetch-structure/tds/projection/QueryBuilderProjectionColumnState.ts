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
  makeObservable,
  observable,
  flow,
  computed,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  assertTrue,
  assertNonEmptyString,
  type Hashable,
  hashArray,
  ActionState,
} from '@finos/legend-shared';
import {
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
} from '../../../explorer/QueryBuilderExplorerState.js';
import {
  getPropertyChainName,
  QueryBuilderPropertyExpressionState,
} from '../../../QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import {
  type AbstractPropertyExpression,
  type Type,
  type VariableExpression,
  PackageableElementExplicitReference,
  GRAPH_MANAGER_EVENT,
  buildSourceInformationSourceId,
  ParserError,
  RawVariableExpression,
  Enumeration,
  RawLambda,
  stub_RawLambda,
  Multiplicity,
  PrimitiveType,
} from '@finos/legend-graph';
import { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SOURCE_ID_LABEL,
} from '../../../QueryBuilderConfig.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../QueryBuilderStateHashUtils.js';
import { LambdaEditorState } from '../../../shared/LambdaEditorState.js';
import { isValueExpressionReferencedInValue } from '../../../QueryBuilderValueSpecificationHelper.js';

export const QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE = 'PROJECTION_COLUMN';

export interface QueryBuilderProjectionColumnDragSource {
  columnState: QueryBuilderProjectionColumnState;
}

export abstract class QueryBuilderProjectionColumnState
  extends QueryBuilderTDSColumnState
  implements Hashable
{
  tdsState: QueryBuilderTDSState;
  columnName: string;
  wavgWeight: AbstractPropertyExpression | undefined;

  constructor(tdsState: QueryBuilderTDSState, columnName: string) {
    super();
    makeObservable(this, {
      uuid: false,
      tdsState: false,
      columnName: observable,
      wavgWeight: observable,
      setColumnName: action,
      setWavgWeight: action,
      hashCode: computed,
    });
    this.tdsState = tdsState;
    this.columnName = columnName;
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }

  setWavgWeight(val: AbstractPropertyExpression): void {
    this.wavgWeight = val;
  }
}

export class QueryBuilderSimpleProjectionColumnState
  extends QueryBuilderProjectionColumnState
  implements Hashable
{
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  propertyExpressionState: QueryBuilderPropertyExpressionState;

  constructor(
    tdsState: QueryBuilderTDSState,
    propertyExpression: AbstractPropertyExpression,
    humanizePropertyName: boolean,
  ) {
    super(tdsState, '');

    makeObservable(this, {
      lambdaParameterName: observable,
      propertyExpressionState: observable,
      setLambdaParameterName: action,
      changeProperty: action,
    });

    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      tdsState.queryBuilderState,
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

  isVariableUsed(variable: VariableExpression): boolean {
    return Boolean(
      this.propertyExpressionState.derivedPropertyExpressionStates.find(
        (derived) =>
          derived.parameterValues.find((param) =>
            isValueExpressionReferencedInValue(variable, param),
          ),
      ),
    );
  }

  changeProperty(
    node: QueryBuilderExplorerTreePropertyNodeData,
    humanizePropertyName: boolean,
  ): void {
    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      this.tdsState.queryBuilderState,
      buildPropertyExpressionFromExplorerTreeNodeData(
        node,
        this.tdsState.queryBuilderState.explorerState,
      ),
    );
    this.columnName = getPropertyChainName(
      this.propertyExpressionState.propertyExpression,
      humanizePropertyName,
    );
  }

  override getColumnType(): Type | undefined {
    return this.propertyExpressionState.propertyExpression.func.value
      .genericType.value.rawType;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.SIMPLE_PROJECTION_COLUMN_STATE,
      this.propertyExpressionState,
      this.columnName,
    ]);
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
        this.queryBuilderState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.derivationProjectionColumnState.setLambda(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
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
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors({
          preserveCompilationError: options?.preserveCompilationError,
        });
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.logService.error(
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

export class QueryBuilderDerivationProjectionColumnState
  extends QueryBuilderProjectionColumnState
  implements Hashable
{
  derivationLambdaEditorState: QueryBuilderDerivationProjectionLambdaState;
  lambda: RawLambda;
  returnType: Type | undefined;
  fetchingLambdaReturnTypeState = ActionState.create();

  constructor(tdsState: QueryBuilderTDSState, lambda: RawLambda) {
    super(tdsState, '(derivation)');

    makeObservable(this, {
      lambda: observable,
      returnType: observable,
      fetchingLambdaReturnTypeState: observable,
      setLambda: action,
      fetchDerivationLambdaReturnType: flow,
      setLambdaReturnType: action,
    });

    this.derivationLambdaEditorState =
      new QueryBuilderDerivationProjectionLambdaState(
        tdsState.queryBuilderState,
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
  *fetchDerivationLambdaReturnType(options?: {
    forceRefresh?: boolean;
    forceConversionStringToLambda?: boolean;
    isBeingDropped?: boolean;
  }): GeneratorFn<void> {
    if (!options?.forceRefresh && this.returnType !== undefined) {
      return;
    }
    try {
      assertTrue(
        !this.fetchingLambdaReturnTypeState.isInProgress,
        'Fetching lambda return type already in progress',
      );
      this.fetchingLambdaReturnTypeState.inProgress();
      if (options?.isBeingDropped) {
        this.tdsState.postFilterState.setDerivedColumnBeingDropped(this);
      }
      if (options?.forceConversionStringToLambda) {
        yield flowResult(
          this.derivationLambdaEditorState.convertLambdaGrammarStringToObject(),
        ).catch(
          this.tdsState.queryBuilderState.applicationStore.alertUnhandledError,
        );
      }
      assertTrue(Array.isArray(this.lambda.parameters));
      const graph = this.tdsState.queryBuilderState.graphManagerState.graph;
      const isolatedLambda = this.getIsolatedRawLambda();
      const type =
        (yield this.tdsState.queryBuilderState.graphManagerState.graphManager.getLambdaReturnType(
          isolatedLambda,
          graph,
        )) as string;
      this.setLambdaReturnType(type);
    } catch (error) {
      assertErrorThrown(error);
      this.tdsState.queryBuilderState.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        error,
      );
    } finally {
      this.fetchingLambdaReturnTypeState.complete();
      if (options?.isBeingDropped) {
        this.tdsState.postFilterState.setDerivedColumnBeingDropped(undefined);
      }
    }
  }

  getIsolatedRawLambda(): RawLambda {
    assertTrue(Array.isArray(this.lambda.parameters));
    const projectionParameter = this.lambda.parameters as object[];
    assertTrue(projectionParameter.length === 1);
    const variable = projectionParameter[0] as VariableExpression;
    assertNonEmptyString(variable.name);
    // assign variable to query class
    const queryBuilderState = this.tdsState.queryBuilderState;
    const rawVariableExpression = new RawVariableExpression(
      variable.name,
      Multiplicity.ONE,
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(queryBuilderState.class),
      ),
    );
    const _rawVariableExpression =
      queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
        rawVariableExpression,
      );
    const parameters = queryBuilderState.parametersState.parameterStates.map(
      (_param) =>
        queryBuilderState.graphManagerState.graphManager.serializeValueSpecification(
          _param.parameter,
        ),
    );
    const letExpressions = queryBuilderState.constantState.constants
      .map((_const) => _const.buildLetExpression())
      .map((expres) =>
        queryBuilderState.graphManagerState.graphManager.serializeValueSpecification(
          expres,
        ),
      );
    let lambdaBody = this.lambda.body;
    if (letExpressions.length) {
      if (Array.isArray(this.lambda.body)) {
        lambdaBody = [...letExpressions, ...(this.lambda.body as object[])];
      } else {
        lambdaBody = [...letExpressions, this.lambda.body];
      }
    }
    const isolatedLambda = new RawLambda(
      [_rawVariableExpression, ...parameters],
      lambdaBody,
    );
    return isolatedLambda;
  }

  setLambdaReturnType(type: string): void {
    const resolvedType =
      this.tdsState.queryBuilderState.graphManagerState.graph.getType(type);
    assertTrue(
      resolvedType instanceof PrimitiveType ||
        resolvedType instanceof Enumeration,
      'Projection column must have return type of either primitve type or enumeration',
    );
    this.setReturnType(resolvedType);
  }

  override getColumnType(): Type | undefined {
    return this.returnType;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.DERIVATION_PROJECTION_COLUMN_STATE,
      this.returnType ?? '',
      this.lambda,
      this.columnName,
    ]);
  }
}
