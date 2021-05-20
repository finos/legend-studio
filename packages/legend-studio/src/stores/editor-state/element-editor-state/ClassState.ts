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

import { observable, action, flow, makeObservable } from 'mobx';
import { LAMBDA_START } from '../../../models/MetaModelConst';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../utils/Logger';
import { LambdaEditorState } from '../../editor-state/element-editor-state/LambdaEditorState';
import type { EditorStore } from '../../EditorStore';
import { ParserError } from '../../../models/metamodels/pure/action/EngineError';
import { RawLambda } from '../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { Constraint } from '../../../models/metamodels/pure/model/packageableElements/domain/Constraint';
import type { DerivedProperty } from '../../../models/metamodels/pure/model/packageableElements/domain/DerivedProperty';

export class DerivedPropertyState extends LambdaEditorState {
  derivedProperty: DerivedProperty;
  editorStore: EditorStore;

  constructor(derivedProperty: DerivedProperty, editorStore: EditorStore) {
    super(`${LAMBDA_START}''`, '');

    makeObservable(this, {
      derivedProperty: observable,
      editorStore: observable,
      setBodyAndParameters: action,
    });

    this.derivedProperty = derivedProperty;
    this.editorStore = editorStore;
  }

  setBodyAndParameters(lambda: RawLambda): void {
    this.derivedProperty.setBody(lambda.body);
    this.derivedProperty.setParameters(lambda.parameters);
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: DerivedPropertyState,
  ) {
    const emptyLambda = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.derivedProperty.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.setBodyAndParameters(lambda ?? emptyLambda);
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
      this.setBodyAndParameters(emptyLambda);
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: DerivedPropertyState,
    pretty: boolean,
  ) {
    if (this.derivedProperty.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.derivedProperty.lambdaId,
          new RawLambda(
            this.derivedProperty.parameters,
            this.derivedProperty.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.derivedProperty.lambdaId);
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

export class ConstraintState extends LambdaEditorState {
  constraint: Constraint;
  editorStore: EditorStore;

  constructor(constraint: Constraint, editorStore: EditorStore) {
    super('true', LAMBDA_START);

    makeObservable(this, {
      constraint: observable,
      editorStore: observable,
    });

    this.constraint = constraint;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (this: ConstraintState) {
    const emptyFunctionDefinition = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.constraint.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.constraint.functionDefinition = lambda ?? emptyFunctionDefinition;
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
      this.constraint.functionDefinition = emptyFunctionDefinition;
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: ConstraintState,
    pretty: boolean,
  ) {
    if (!this.constraint.functionDefinition.isStub) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.constraint.lambdaId,
          this.constraint.functionDefinition,
        );
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.constraint.lambdaId);
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

// NOTE: We went through the trouble of maintaining Class state outside of metamodel class prototype because we don't want to pollute
// metamodel models with UI states, this requires more effort to maintain but it will help in the long run
export class ClassState {
  editorStore: EditorStore;
  class: Class;
  derivedPropertyStates: DerivedPropertyState[] = [];
  constraintStates: ConstraintState[] = [];
  isConvertingConstraintObjects = false;
  isConvertingDerivedPropertyObjects = false;

  constructor(editorStore: EditorStore, _class: Class) {
    makeObservable(this, {
      class: observable,
      derivedPropertyStates: observable,
      constraintStates: observable,
      isConvertingConstraintObjects: observable,
      isConvertingDerivedPropertyObjects: observable,
      addConstraintState: action,
      deleteConstraintState: action,
      addDerivedPropertyState: action,
      deleteDerivedPropertyState: action,
      decorate: action,
    });

    this.editorStore = editorStore;
    this.class = _class;
    this.constraintStates = _class
      .getAllConstraints()
      .map((constraint) => new ConstraintState(constraint, this.editorStore));
    this.derivedPropertyStates = _class
      .getAllDerivedProperties()
      .map(
        (derivedProperty) =>
          new DerivedPropertyState(derivedProperty, this.editorStore),
      );
  }

  getNullableConstraintState = (
    constraint: Constraint,
  ): ConstraintState | undefined =>
    this.constraintStates.find(
      (constraintState) => constraintState.constraint === constraint,
    );
  getNullableDerivedPropertyState = (
    dp: DerivedProperty,
  ): DerivedPropertyState | undefined =>
    this.derivedPropertyStates.find((state) => state.derivedProperty === dp);
  getConstraintState = (constraint: Constraint): ConstraintState =>
    guaranteeNonNullable(
      this.getNullableConstraintState(constraint),
      `Can't find constraint state for constraint ${constraint}`,
    );
  getDerivedPropertyState = (dp: DerivedProperty): DerivedPropertyState =>
    guaranteeNonNullable(
      this.getNullableDerivedPropertyState(dp),
      `Can't find derived property state for derived property ${dp}`,
    );

  addConstraintState(constraint: Constraint): void {
    if (
      !this.constraintStates.find(
        (constraintState) => constraintState.constraint === constraint,
      )
    ) {
      this.constraintStates.push(
        new ConstraintState(constraint, this.editorStore),
      );
    }
  }

  deleteConstraintState(constraint: Constraint): void {
    const idx = this.constraintStates.findIndex(
      (constraintState) => constraintState.constraint === constraint,
    );
    if (idx !== -1) {
      this.constraintStates.splice(idx, 1);
    }
  }

  addDerivedPropertyState(derivedProperty: DerivedProperty): void {
    if (
      !this.derivedPropertyStates.find(
        (state) => state.derivedProperty === derivedProperty,
      )
    ) {
      this.derivedPropertyStates.push(
        new DerivedPropertyState(derivedProperty, this.editorStore),
      );
    }
  }

  deleteDerivedPropertyState(derivedProperty: DerivedProperty): void {
    const idx = this.derivedPropertyStates.findIndex(
      (state) => state.derivedProperty === derivedProperty,
    );
    if (idx !== -1) {
      this.derivedPropertyStates.splice(idx, 1);
    }
  }

  convertConstraintObjects = flow(function* (this: ClassState) {
    const lambdas = new Map<string, RawLambda>();
    const constraintStateMap = new Map<string, ConstraintState>();
    this.constraintStates.forEach((constraintState) => {
      if (!constraintState.constraint.functionDefinition.isStub) {
        lambdas.set(
          constraintState.constraint.lambdaId,
          constraintState.constraint.functionDefinition,
        );
        constraintStateMap.set(
          constraintState.constraint.lambdaId,
          constraintState,
        );
      }
    });
    if (lambdas.size) {
      this.isConvertingConstraintObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const constraintState = constraintStateMap.get(key);
          constraintState?.setLambdaString(
            constraintState.extractLambdaString(grammarText),
          );
        });
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      } finally {
        this.isConvertingConstraintObjects = false;
      }
    }
  });

  convertDerivedPropertyObjects = flow(function* (this: ClassState) {
    const lambdas = new Map<string, RawLambda>();
    const derivedPropertyStateMap = new Map<string, DerivedPropertyState>();
    this.derivedPropertyStates.forEach((state) => {
      const lambda = new RawLambda(
        state.derivedProperty.parameters,
        state.derivedProperty.body,
      );
      if (!lambda.isStub) {
        lambdas.set(state.derivedProperty.lambdaId, lambda);
        derivedPropertyStateMap.set(state.derivedProperty.lambdaId, state);
      }
    });
    if (lambdas.size) {
      this.isConvertingDerivedPropertyObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const derivedPropertyState = derivedPropertyStateMap.get(key);
          derivedPropertyState?.setLambdaString(
            derivedPropertyState.extractLambdaString(grammarText),
          );
        });
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      } finally {
        this.isConvertingDerivedPropertyObjects = false;
      }
    }
  });

  decorate(): void {
    this.constraintStates = this.class
      .getAllConstraints()
      .map(
        (constraint) =>
          this.constraintStates.find(
            (constraintState) => constraintState.constraint === constraint,
          ) ?? new ConstraintState(constraint, this.editorStore),
      );
    this.derivedPropertyStates = this.class
      .getAllDerivedProperties()
      .map(
        (dp) =>
          this.derivedPropertyStates.find(
            (state) => state.derivedProperty === dp,
          ) ?? new DerivedPropertyState(dp, this.editorStore),
      );
  }
}
