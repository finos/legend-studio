/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, flow } from 'mobx';
import { LAMBDA_START } from 'MetaModelConst';
import { guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { LambdaEditorState } from 'Stores/editor-state/element-editor-state/LambdaEditorState';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { RenderStyle } from 'EXEC/grammar/RenderStyle';
import { deserialize } from 'serializr';
import { executionClient } from 'API/ExecutionClient';
import { ParserError } from 'EXEC/ExecutionServerError';
import { EditorStore } from 'Stores/EditorStore';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Constraint } from 'MM/model/packageableElements/domain/Constraint';
import { DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';

export class DerivedPropertyState extends LambdaEditorState {
  @observable derivedProperty: DerivedProperty;

  constructor(derivedProperty: DerivedProperty) {
    super(`${LAMBDA_START}''`, '');
    this.derivedProperty = derivedProperty;
  }

  @action setBodyAndParameters(lambda: Lambda): void {
    this.derivedProperty.setBody(lambda.body);
    this.derivedProperty.setParameters(lambda.parameters);
  }

  convertLambdaGrammarStringToObject = flow(function* (this: DerivedPropertyState) {
    const emptyLambda = Lambda.createStub();
    if (this.lambdaString) {
      try {
        const lambdas = new Map<string, string>();
        lambdas.set(this.derivedProperty.lambdaId, this.lambdaString);
        const result = deserialize(JsonToGrammarInput, yield executionClient.transformGrammarToJSON({ isolatedLambdas: lambdas }));
        const parserError = result.isolatedLambdas?.lambdaErrors?.get(this.derivedProperty.lambdaId);
        this.setParserError(parserError ? deserialize(ParserError, parserError) : undefined);
        if (!this.parserError) {
          this.setBodyAndParameters(result.isolatedLambdas?.lambdas
            ? result.isolatedLambdas.lambdas.get(this.derivedProperty.lambdaId) ?? emptyLambda
            : emptyLambda
          );
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.setBodyAndParameters(emptyLambda);
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (this: DerivedPropertyState, renderStyle: RenderStyle) {
    if (this.derivedProperty.body) {
      try {
        const lambdas = new Map<string, Lambda>();
        lambdas.set(this.derivedProperty.lambdaId, new Lambda(this.derivedProperty.parameters, this.derivedProperty.body));
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas }, renderStyle }));
        const grammarText = result.isolatedLambdas?.get(this.derivedProperty.lambdaId);
        this.setLambdaString(grammarText !== undefined ? this.extractLambdaString(grammarText) : '');
        this.clearErrors();
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

export class ConstraintState extends LambdaEditorState {
  @observable constraint: Constraint;

  constructor(constraint: Constraint) {
    super('true', LAMBDA_START);
    this.constraint = constraint;
  }

  convertLambdaGrammarStringToObject = flow(function* (this: ConstraintState) {
    const emptyFunctionDefinition = Lambda.createStub();
    if (this.lambdaString) {
      try {
        const lambdas = new Map<string, string>();
        lambdas.set(this.constraint.lambdaId, this.fullLambdaString);
        const result = deserialize(JsonToGrammarInput, yield executionClient.transformGrammarToJSON({ isolatedLambdas: lambdas }));
        const parserError = result.isolatedLambdas?.lambdaErrors?.get(this.constraint.lambdaId);
        this.setParserError(parserError ? deserialize(ParserError, parserError) : undefined);
        if (!this.parserError) {
          this.constraint.functionDefinition = result.isolatedLambdas?.lambdas
            ? result.isolatedLambdas.lambdas.get(this.constraint.lambdaId) ?? emptyFunctionDefinition
            : emptyFunctionDefinition;
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.constraint.functionDefinition = emptyFunctionDefinition;
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (this: ConstraintState, renderStyle: RenderStyle) {
    if (!this.constraint.functionDefinition.isStub) {
      try {
        const lambdas = new Map<string, Lambda>();
        lambdas.set(this.constraint.lambdaId, this.constraint.functionDefinition);
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas }, renderStyle: renderStyle }));
        const grammarText = result.isolatedLambdas?.get(this.constraint.lambdaId);
        this.setLambdaString(grammarText !== undefined ? this.extractLambdaString(grammarText) : '');
        this.clearErrors();
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

// NOTE: We went through the trouble of maintaining Class state outside of metamodel class prototype because we don't want to pollute
// metamodel models with UI states, this requires more effort to maintain but it will help in the long run
export class ClassState {
  editorStore: EditorStore;
  @observable class: Class;
  @observable derivedPropertyStates: DerivedPropertyState[] = [];
  @observable constraintStates: ConstraintState[] = [];
  @observable isConvertingConstraintObjects = false;
  @observable isConvertingDerivedPropertyObjects = false;

  constructor(editorStore: EditorStore, _class: Class) {
    this.editorStore = editorStore;
    this.class = _class;
    this.constraintStates = _class.getAllConstraints().map(constraint => new ConstraintState(constraint));
    this.derivedPropertyStates = _class.getAllDerivedProperties().map(derivedProperty => new DerivedPropertyState(derivedProperty));
  }

  getNullableConstraintState = (constraint: Constraint): ConstraintState | undefined => this.constraintStates.find(constraintState => constraintState.constraint === constraint);
  getNullableDerivedPropertyState = (dp: DerivedProperty): DerivedPropertyState | undefined => this.derivedPropertyStates.find(state => state.derivedProperty === dp);
  getConstraintState = (constraint: Constraint): ConstraintState => guaranteeNonNullable(this.getNullableConstraintState(constraint), `Can't find constraint state for constraint ${constraint}`);
  getDerivedPropertyState = (dp: DerivedProperty): DerivedPropertyState => guaranteeNonNullable(this.getNullableDerivedPropertyState(dp), `Can't find derived property state for derived property ${dp}`);

  @action addConstraintState(constraint: Constraint): void {
    if (!this.constraintStates.find(constraintState => constraintState.constraint === constraint)) {
      this.constraintStates.push(new ConstraintState(constraint));
    }
  }

  @action deleteConstraintState(constraint: Constraint): void {
    const idx = this.constraintStates.findIndex(constraintState => constraintState.constraint === constraint);
    if (idx !== -1) { this.constraintStates.splice(idx, 1) }
  }

  @action addDerivedPropertyState(derivedProperty: DerivedProperty): void {
    if (!this.derivedPropertyStates.find(state => state.derivedProperty === derivedProperty)) {
      this.derivedPropertyStates.push(new DerivedPropertyState(derivedProperty));
    }
  }

  @action deleteDerivedPropertyState(derivedProperty: DerivedProperty): void {
    const idx = this.derivedPropertyStates.findIndex(state => state.derivedProperty === derivedProperty);
    if (idx !== -1) { this.derivedPropertyStates.splice(idx, 1) }
  }

  convertConstraintObjects = flow(function* (this: ClassState) {
    const lambdas = new Map<string, Lambda>();
    const constraintStateMap = new Map<string, ConstraintState>();
    this.constraintStates
      .forEach(constraintState => {
        if (!constraintState.constraint.functionDefinition.isStub) {
          lambdas.set(constraintState.constraint.lambdaId, constraintState.constraint.functionDefinition);
          constraintStateMap.set(constraintState.constraint.lambdaId, constraintState);
        }
      });
    if (lambdas.size) {
      this.isConvertingConstraintObjects = true;
      try {
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas } }));
        if (result.isolatedLambdas) {
          result.isolatedLambdas.forEach((grammarText, key) => {
            const constraintState = constraintStateMap.get(key);
            constraintState?.setLambdaString(constraintState.extractLambdaString(grammarText));
          });
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      } finally {
        this.isConvertingConstraintObjects = false;
      }
    }
  });

  convertDerivedPropertyObjects = flow(function* (this: ClassState) {
    const lambdas = new Map<string, Lambda>();
    const derivedPropertyStateMap = new Map<string, DerivedPropertyState>();
    this.derivedPropertyStates
      .forEach(state => {
        const lambda = new Lambda(state.derivedProperty.parameters, state.derivedProperty.body);
        if (!lambda.isStub) {
          lambdas.set(state.derivedProperty.lambdaId, lambda);
          derivedPropertyStateMap.set(state.derivedProperty.lambdaId, state);
        }
      });
    if (lambdas.size) {
      this.isConvertingDerivedPropertyObjects = true;
      try {
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas } }));
        if (result.isolatedLambdas) {
          result.isolatedLambdas.forEach((grammarText, key) => {
            const derivedPropertyState = derivedPropertyStateMap.get(key);
            derivedPropertyState?.setLambdaString(derivedPropertyState.extractLambdaString(grammarText));
          });
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      } finally {
        this.isConvertingDerivedPropertyObjects = false;
      }
    }
  });

  @action decorate(): void {
    this.constraintStates = this.class.getAllConstraints().map(constraint => this.constraintStates.find(constraintState => constraintState.constraint === constraint) ?? new ConstraintState(constraint));
    this.derivedPropertyStates = this.class.getAllDerivedProperties().map(dp => this.derivedPropertyStates.find(state => state.derivedProperty === dp) ?? new DerivedPropertyState(dp));
  }
}
