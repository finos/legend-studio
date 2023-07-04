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
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { EditorStore } from '../../EditorStore.js';
import {
  type Class,
  type Constraint,
  type DerivedProperty,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  ParserError,
  RawLambda,
  buildSourceInformationSourceId,
  stub_RawLambda,
  isStubbed_RawLambda,
  getAllClassConstraints,
  getAllClassDerivedProperties,
} from '@finos/legend-graph';
import {
  constraint_setFunctionDefinition,
  derivedProperty_setBody,
  derivedProperty_setParameters,
} from '../../../graph-modifier/DomainGraphModifierHelper.js';
import { LambdaEditorState } from '@finos/legend-query-builder';

export const CONSTRAINT_SOURCE_ID_LABEL = 'constraint';
export const DERIVED_PROPERTY_SOURCE_ID_LABEL = 'derivedProperty';

export class DerivedPropertyState extends LambdaEditorState {
  derivedProperty: DerivedProperty;
  editorStore: EditorStore;

  constructor(derivedProperty: DerivedProperty, editorStore: EditorStore) {
    super(`${LAMBDA_PIPE}''`, '');

    makeObservable(this, {
      derivedProperty: observable,
      editorStore: observable,
      setBodyAndParameters: action,
    });

    this.derivedProperty = derivedProperty;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.derivedProperty._OWNER.path,
      DERIVED_PROPERTY_SOURCE_ID_LABEL,
      this.derivedProperty.name,
      this.uuid, // in case of duplications
    ]);
  }

  setBodyAndParameters(lambda: RawLambda): void {
    derivedProperty_setBody(this.derivedProperty, lambda.body);
    derivedProperty_setParameters(this.derivedProperty, lambda.parameters);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.setBodyAndParameters(lambda);
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
      this.setBodyAndParameters(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (this.derivedProperty.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(
            this.derivedProperty.parameters,
            this.derivedProperty.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
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
        this.editorStore.applicationStore.logService.error(
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

export class ConstraintState extends LambdaEditorState {
  constraint: Constraint;
  editorStore: EditorStore;

  constructor(constraint: Constraint, editorStore: EditorStore) {
    super('true', LAMBDA_PIPE);

    makeObservable(this, {
      constraint: observable,
      editorStore: observable,
    });

    this.constraint = constraint;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.constraint._OWNER.path,
      CONSTRAINT_SOURCE_ID_LABEL,
      this.constraint.name,
      this.uuid, // in case of duplications
    ]);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyFunctionDefinition = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        constraint_setFunctionDefinition(this.constraint, lambda);
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
      constraint_setFunctionDefinition(
        this.constraint,
        emptyFunctionDefinition,
      );
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.constraint.functionDefinition)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.constraint.functionDefinition);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
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
        this.editorStore.applicationStore.logService.error(
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

// NOTE: We went through the trouble of maintaining Class state outside of metamodel class prototype because we don't want to pollute
// metamodel models with UI states, this requires more effort to maintain but it will help in the long run
export class ClassState {
  editorStore: EditorStore;
  class: Class;
  derivedPropertyStates: DerivedPropertyState[] = [];
  constraintStates: ConstraintState[] = [];
  isConvertingConstraintLambdaObjects = false;
  isConvertingDerivedPropertyLambdaObjects = false;

  constructor(editorStore: EditorStore, _class: Class) {
    makeObservable(this, {
      class: observable,
      derivedPropertyStates: observable,
      constraintStates: observable,
      isConvertingConstraintLambdaObjects: observable,
      isConvertingDerivedPropertyLambdaObjects: observable,
      addConstraintState: action,
      deleteConstraintState: action,
      addDerivedPropertyState: action,
      deleteDerivedPropertyState: action,
      convertConstraintLambdaObjects: flow,
      convertDerivedPropertyLambdaObjects: flow,
      decorate: action,
    });

    this.editorStore = editorStore;
    this.class = _class;
    this.constraintStates = getAllClassConstraints(_class).map(
      (constraint) => new ConstraintState(constraint, this.editorStore),
    );
    this.derivedPropertyStates = getAllClassDerivedProperties(_class).map(
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

  *convertConstraintLambdaObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, ConstraintState>();
    this.constraintStates.forEach((constraintState) => {
      if (!isStubbed_RawLambda(constraintState.constraint.functionDefinition)) {
        lambdas.set(
          constraintState.lambdaId,
          constraintState.constraint.functionDefinition,
        );
        index.set(constraintState.lambdaId, constraintState);
      }
    });
    if (lambdas.size) {
      this.isConvertingConstraintLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const constraintState = index.get(key);
          constraintState?.setLambdaString(
            constraintState.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingConstraintLambdaObjects = false;
      }
    }
  }

  *convertDerivedPropertyLambdaObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, DerivedPropertyState>();
    this.derivedPropertyStates.forEach((state) => {
      const lambda = new RawLambda(
        state.derivedProperty.parameters,
        state.derivedProperty.body,
      );
      if (!isStubbed_RawLambda(lambda)) {
        lambdas.set(state.lambdaId, lambda);
        index.set(state.lambdaId, state);
      }
    });
    if (lambdas.size) {
      this.isConvertingDerivedPropertyLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const derivedPropertyState = index.get(key);
          derivedPropertyState?.setLambdaString(
            derivedPropertyState.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingDerivedPropertyLambdaObjects = false;
      }
    }
  }

  decorate(): void {
    this.constraintStates = getAllClassConstraints(this.class).map(
      (constraint) =>
        this.constraintStates.find(
          (constraintState) => constraintState.constraint === constraint,
        ) ?? new ConstraintState(constraint, this.editorStore),
    );
    this.derivedPropertyStates = getAllClassDerivedProperties(this.class).map(
      (dp) =>
        this.derivedPropertyStates.find(
          (state) => state.derivedProperty === dp,
        ) ?? new DerivedPropertyState(dp, this.editorStore),
    );
  }
}
