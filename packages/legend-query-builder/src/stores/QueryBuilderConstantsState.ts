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
  type Type,
  type ValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  observe_ValueSpecification,
  VariableExpression,
  buildSourceInformationSourceId,
  ParserError,
  GRAPH_MANAGER_EVENT,
  SimpleFunctionExpression,
  PrimitiveInstanceValue,
  PrimitiveType,
  extractElementNameFromPath,
  SUPPORTED_FUNCTIONS,
  INTERNAL__UnknownValueSpecification,
} from '@finos/legend-graph';
import {
  type Hashable,
  hashArray,
  deleteEntry,
  addUniqueEntry,
  IllegalStateError,
  uuid,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  changeEntry,
  assertTrue,
  ActionState,
  deepClone,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from './QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  buildDefaultEmptyStringRawLambda,
  buildDefaultInstanceValue,
} from './shared/ValueSpecificationEditorHelper.js';
import { valueSpecification_setGenericType } from './shared/ValueSpecificationModifierHelper.js';
import { LambdaEditorState } from './shared/LambdaEditorState.js';
import { QUERY_BUILDER_SOURCE_ID_LABEL } from './QueryBuilderConfig.js';

export abstract class QueryBuilderConstantExpressionState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  readonly uuid = uuid();
  variable: VariableExpression;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.variable = variable;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CONSTANT_EXPRESSION_STATE,
      this.variable.name,
    ]);
  }

  buildLetExpression(): SimpleFunctionExpression {
    const leftSide = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    leftSide.values = [this.variable.name];
    const letFunc = new SimpleFunctionExpression(
      extractElementNameFromPath(SUPPORTED_FUNCTIONS.LET),
    );
    letFunc.parametersValues = [leftSide, this.buildLetAssignmentValue()];
    return letFunc;
  }

  abstract buildLetAssignmentValue(): ValueSpecification;
}

export class QueryBuilderSimpleConstantExpressionState
  extends QueryBuilderConstantExpressionState
  implements Hashable
{
  value: ValueSpecification;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: ValueSpecification,
  ) {
    super(queryBuilderState, variable);
    makeObservable(this, {
      variable: observable,
      value: observable,
      setValueSpec: action,
      changeValSpecType: action,
    });
    this.value = observe_ValueSpecification(
      value,
      this.queryBuilderState.observerContext,
    );
    observe_ValueSpecification(
      variable,
      this.queryBuilderState.observerContext,
    );
  }

  changeValSpecType(type: Type): void {
    const variableType = this.value.genericType?.value.rawType;
    if (variableType !== type) {
      try {
        const valSpec = buildDefaultInstanceValue(
          this.queryBuilderState.graphManagerState.graph,
          type,
          this.queryBuilderState.observerContext,
          this.queryBuilderState
            .INTERNAL__enableInitializingDefaultSimpleExpressionValue,
        );
        this.setValueSpec(valSpec);
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notificationService.notifyError(
          error.message,
        );
      }
    }
  }

  setValueSpec(value: ValueSpecification): void {
    if (value instanceof VariableExpression) {
      throw new IllegalStateError(
        'Can not assign a parameter to another parameter',
      );
    }
    this.value = observe_ValueSpecification(
      value,
      this.queryBuilderState.observerContext,
    );
    const valueSpecType = value.genericType?.value.rawType;
    if (
      valueSpecType &&
      valueSpecType !== this.variable.genericType?.value.rawType
    ) {
      valueSpecification_setGenericType(
        this.variable,
        GenericTypeExplicitReference.create(new GenericType(valueSpecType)),
      );
    }
  }

  override buildLetAssignmentValue(): ValueSpecification {
    return this.value;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CONSTANT_EXPRESSION_STATE,
      this.variable.name,
      this.value,
    ]);
  }
}

export class QueryBuilderConstantLambdaEditorState extends LambdaEditorState {
  readonly queryBuilderState: QueryBuilderState;
  calculatedState: QueryBuilderCalculatedConstantExpressionState;
  convertingLambdaToStringState = ActionState.create();

  constructor(calculatedState: QueryBuilderCalculatedConstantExpressionState) {
    super('', '');
    makeObservable(this, {
      calculatedState: observable,
      convertingLambdaToStringState: observable,
      buildEmptyValueSpec: observable,
    });
    this.calculatedState = calculatedState;
    this.queryBuilderState = calculatedState.queryBuilderState;
  }

  buildEmptyValueSpec(): PlainObject {
    return this.queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
      buildDefaultEmptyStringRawLambda(
        this.queryBuilderState.graphManagerState,
        this.queryBuilderState.observerContext,
      ),
    );
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      // TODO: to be reworked
      // See https://github.com/finos/legend-studio/issues/1168
      QUERY_BUILDER_SOURCE_ID_LABEL.QUERY_BUILDER,
      QUERY_BUILDER_SOURCE_ID_LABEL.CONSTANT,
      this.calculatedState.uuid,
    ]);
  }

  override *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    if (this.lambdaString) {
      try {
        this.convertingLambdaToStringState.inProgress();
        const valSpec =
          (yield this.queryBuilderState.graphManagerState.graphManager.pureCodeToValueSpecification(
            this.fullLambdaString,
          )) as PlainObject<ValueSpecification>;
        this.setParserError(undefined);
        this.calculatedState.setValue(valSpec);
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.queryBuilderState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.convertingLambdaToStringState.complete();
      }
    } else {
      this.clearErrors();
      this.calculatedState.setValue(this.buildEmptyValueSpec());
      this.convertingLambdaToStringState.complete();
    }
  }
  override *convertLambdaObjectToGrammarString(
    options?:
      | {
          pretty?: boolean | undefined;
          preserveCompilationError?: boolean | undefined;
        }
      | undefined,
  ): GeneratorFn<void> {
    try {
      const value = this.calculatedState.value;
      const grammarText =
        (yield this.queryBuilderState.graphManagerState.graphManager.valueSpecificationToPureCode(
          value,
          options?.pretty,
        )) as string;
      this.setLambdaString(grammarText);
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
  }
}

export class QueryBuilderCalculatedConstantExpressionState
  extends QueryBuilderConstantExpressionState
  implements Hashable
{
  value: PlainObject;
  lambdaState: QueryBuilderConstantLambdaEditorState;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: PlainObject,
  ) {
    super(queryBuilderState, variable);
    makeObservable(this, {
      variable: observable,
      lambdaState: observable,
      value: observable,
      setLambdaState: action,
      setValue: action,
    });
    this.value = value;
    this.lambdaState = new QueryBuilderConstantLambdaEditorState(this);
    observe_ValueSpecification(
      variable,
      this.queryBuilderState.observerContext,
    );
  }

  setLambdaState(val: QueryBuilderConstantLambdaEditorState): void {
    this.lambdaState = val;
  }

  setValue(val: PlainObject): void {
    this.value = val;
  }

  override buildLetAssignmentValue(): ValueSpecification {
    return new INTERNAL__UnknownValueSpecification(this.value);
  }
}

export class QueryBuilderConstantsState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  showConstantPanel = false;
  constants: QueryBuilderConstantExpressionState[] = [];
  selectedConstant: QueryBuilderConstantExpressionState | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    this.queryBuilderState = queryBuilderState;

    makeObservable(this, {
      constants: observable,
      showConstantPanel: observable,
      selectedConstant: observable,
      addConstant: action,
      removeConstant: action,
      setShowConstantPanel: action,
      setSelectedConstant: action,
      convertToCalculated: action,
    });
  }

  get isEmpty(): boolean {
    return !this.constants.length;
  }

  setShowConstantPanel(val: boolean): void {
    this.showConstantPanel = val;
  }

  addConstant(val: QueryBuilderConstantExpressionState): void {
    addUniqueEntry(this.constants, val);
  }

  removeConstant(val: QueryBuilderConstantExpressionState): void {
    deleteEntry(this.constants, val);
  }

  setSelectedConstant(
    val: QueryBuilderConstantExpressionState | undefined,
  ): void {
    this.selectedConstant = val;
  }

  isValueSpecConstant(value: ValueSpecification): boolean {
    if (value instanceof VariableExpression) {
      return Boolean(
        this.constants.find((v) => v.variable.name === value.name),
      );
    }
    return false;
  }

  convertToCalculated(val: QueryBuilderSimpleConstantExpressionState): void {
    try {
      const content =
        this.queryBuilderState.graphManagerState.graphManager.serializeValueSpecification(
          val.value,
        );
      const constantState = new QueryBuilderCalculatedConstantExpressionState(
        this.queryBuilderState,
        val.variable,
        content,
      );
      assertTrue(
        changeEntry(this.constants, val, constantState),
        'Unable to convert to calculated constant',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CONSTANT_STATE,
      hashArray(this.constants),
    ]);
  }
}

export const cloneQueryBuilderConstantLambdaEditorState = (
  state: QueryBuilderConstantLambdaEditorState,
): QueryBuilderConstantLambdaEditorState => {
  const clonedCalculatedState =
    new QueryBuilderCalculatedConstantExpressionState(
      state.calculatedState.queryBuilderState,
      new VariableExpression(
        state.calculatedState.variable.name,
        state.calculatedState.variable.multiplicity,
        state.calculatedState.variable.genericType,
      ),
      deepClone(state.calculatedState.value),
    );
  const clonedState = new QueryBuilderConstantLambdaEditorState(
    clonedCalculatedState,
  );
  clonedState.lambdaString = state.lambdaString;
  clonedState.parserError = deepClone(state.parserError);
  return clonedState;
};
