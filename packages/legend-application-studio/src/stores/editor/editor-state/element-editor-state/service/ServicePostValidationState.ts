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
  type Service,
  GRAPH_MANAGER_EVENT,
  LAMBDA_PIPE,
  ParserError,
  PostValidation,
  PostValidationAssertion,
  RawLambda,
  isStubbed_RawLambda,
  stub_RawLambda,
  type PostValidationAssertionResult,
} from '@finos/legend-graph';
import type { ServiceEditorState } from './ServiceEditorState.js';
import {
  serviceValidation_addAssertion,
  serviceValidation_addParam,
  serviceValidation_deleteAssertion,
  serviceValidation_deleteParam,
  service_addValidation,
  service_deleteValidation,
} from '../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import {
  LambdaEditorState,
  buildDefaultEmptyStringRawLambda,
} from '@finos/legend-query-builder';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  generateEnumerableNameFromToken,
  ActionState,
  guaranteeNonNullable,
} from '@finos/legend-shared';

export class PostValidationAssertionState extends LambdaEditorState {
  readonly editorStore: EditorStore;

  postValidationState: PostValidationState;
  assertion: PostValidationAssertion;

  constructor(
    assertion: PostValidationAssertion,
    validation: PostValidationState,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_PIPE);
    makeObservable(this, {
      assertion: observable,
    });
    this.postValidationState = validation;
    this.editorStore = editorStore;
    this.assertion = assertion;
  }

  // TODO add lookup logic
  override get lambdaId(): string {
    return this.uuid;
  }

  override *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.lambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.assertion.assertion = lambda;
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
      this.assertion.assertion = emptyLambda;
    }
  }

  override *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.assertion.assertion)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.assertion.assertion);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(grammarText ?? '');
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

export class PostValidationParameterState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  postValidationState: PostValidationState;
  parameters: RawLambda[];
  idx: number;

  constructor(
    validationState: PostValidationState,
    idx: number,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_PIPE);
    makeObservable(this, {
      setLambda: action,
      parameters: observable,
      reProcess: observable,
    });
    this.postValidationState = validationState;
    this.editorStore = editorStore;
    this.idx = idx;
    this.parameters = validationState.validation.parameters;
  }

  get validation(): PostValidation {
    return this.postValidationState.validation;
  }

  reProcess(parameters: RawLambda[], idx: number): void {
    this.parameters = parameters;
    this.idx = idx;
  }

  setLambda(val: RawLambda): void {
    this.parameters[this.idx] = val;
  }

  get lambda(): RawLambda {
    return this.validation.parameters[this.idx] ?? stub_RawLambda();
  }

  override get lambdaId(): string {
    return this.uuid;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.lambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.setLambda(lambda);
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
      this.setLambda(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (this.lambda.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(this.lambda.parameters, this.lambda.body),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(grammarText ?? '');
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
export class PostValidationState {
  readonly servicePostValidationState: ServicePostValidationsState;
  validation: PostValidation;
  assertionStates: PostValidationAssertionState[] = [];
  parametersState: PostValidationParameterState[] = [];
  isConvertingParameterLambdasState = ActionState.create();
  isConvertingAssertionLambdasState = ActionState.create();

  constructor(
    validation: PostValidation,
    servicePostValidationState: ServicePostValidationsState,
  ) {
    makeObservable(this, {
      validation: observable,
      deleteAssertion: action,
      addParameter: flow,
      deleteParam: action,
      reprocessParamState: action,
      isConvertingParameterLambdasState: observable,
      isConvertingAssertionLambdasState: observable,
      convertAssertionsLambdas: flow,
      convertParameterLambdas: flow,
      addAssertion: flow,
    });
    this.validation = validation;
    this.servicePostValidationState = servicePostValidationState;
    this.assertionStates = validation.assertions.map(
      (e) =>
        new PostValidationAssertionState(
          e,
          this,
          this.servicePostValidationState.editorStore,
        ),
    );
    this.reprocessParamState();
  }

  get hasParserError(): boolean {
    return this.assertionStates.some((aState) => aState.parserError);
  }

  get isRunningLambdaConversion(): boolean {
    return (
      this.isConvertingAssertionLambdasState.isInProgress ||
      this.isConvertingParameterLambdasState.isInProgress
    );
  }

  reprocessParamState(): void {
    this.parametersState = this.validation.parameters.map(
      (e, idx) =>
        new PostValidationParameterState(
          this,
          idx,
          this.servicePostValidationState.editorStore,
        ),
    );
  }

  *convertAssertionsLambdas(): GeneratorFn<void> {
    const assertionsLambdas = new Map<string, RawLambda>();
    const assertionColumnStateMap = new Map<
      string,
      PostValidationAssertionState
    >();
    this.assertionStates.forEach((assertionState) => {
      if (!isStubbed_RawLambda(assertionState.assertion.assertion)) {
        assertionsLambdas.set(
          assertionState.lambdaId,
          assertionState.assertion.assertion,
        );
        assertionColumnStateMap.set(assertionState.lambdaId, assertionState);
      }
    });
    if (assertionsLambdas.size) {
      this.isConvertingAssertionLambdasState.inProgress();
      try {
        const isolatedLambdas =
          (yield this.servicePostValidationState.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            assertionsLambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const assertionColState = assertionColumnStateMap.get(key);
          assertionColState?.setLambdaString(grammarText);
        });
      } catch (error) {
        assertErrorThrown(error);
        this.servicePostValidationState.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingAssertionLambdasState.complete();
      }
    }
  }

  *convertParameterLambdas(): GeneratorFn<void> {
    const parameterLambas = new Map<string, RawLambda>();
    const parameterLambasMap = new Map<string, PostValidationParameterState>();
    this.parametersState.forEach((paramState) => {
      if (!isStubbed_RawLambda(paramState.lambda)) {
        parameterLambas.set(paramState.lambdaId, paramState.lambda);
        parameterLambasMap.set(paramState.lambdaId, paramState);
      }
    });
    if (parameterLambas.size) {
      this.isConvertingParameterLambdasState.inProgress();
      try {
        const isolatedParamsLambdas =
          (yield this.servicePostValidationState.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            parameterLambas,
          )) as Map<string, string>;
        isolatedParamsLambdas.forEach((grammarText, key) => {
          const paramColState = parameterLambasMap.get(key);
          paramColState?.setLambdaString(grammarText);
        });
      } catch (error) {
        assertErrorThrown(error);
        this.servicePostValidationState.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingParameterLambdasState.complete();
      }
    }
  }

  *addParameter(): GeneratorFn<void> {
    const _param = buildDefaultEmptyStringRawLambda(
      this.servicePostValidationState.editorStore.graphManagerState,
      this.servicePostValidationState.editorStore.changeDetectionState
        .observerContext,
    );
    serviceValidation_addParam(this.validation, _param);
    const idx = this.validation.parameters.findIndex((x) => x === _param);
    const _paramState = new PostValidationParameterState(
      this,
      idx,
      this.servicePostValidationState.editorStore,
    );
    this.parametersState.push(_paramState);
    yield flowResult(
      _paramState.convertLambdaObjectToGrammarString({ pretty: false }),
    );
  }

  deleteParam(paramState: PostValidationParameterState): void {
    const val = paramState.lambda;
    serviceValidation_deleteParam(this.validation, val);
    this.parametersState = this.parametersState.filter((e) => e !== paramState);
    this.parametersState.forEach((p, idx) =>
      p.reProcess(this.validation.parameters, idx),
    );
  }

  *addAssertion(): GeneratorFn<void> {
    const _assertion = new PostValidationAssertion();
    _assertion.id = generateEnumerableNameFromToken(
      this.validation.assertions.map((e) => e.id),
      'assertion_id',
    );
    _assertion.assertion = buildDefaultEmptyStringRawLambda(
      this.servicePostValidationState.editorStore.graphManagerState,
      this.servicePostValidationState.editorStore.changeDetectionState
        .observerContext,
    );
    serviceValidation_addAssertion(this.validation, _assertion);
    const aState = new PostValidationAssertionState(
      _assertion,
      this,
      this.servicePostValidationState.editorStore,
    );
    this.assertionStates.push(aState);
    yield flowResult(
      aState.convertLambdaObjectToGrammarString({ pretty: false }),
    );
  }

  deleteAssertion(assertion: PostValidationAssertion): void {
    const _assertionState = this.assertionStates.find(
      (e) => e.assertion === assertion,
    );
    serviceValidation_deleteAssertion(this.validation, assertion);
    this.assertionStates = this.assertionStates.filter(
      (e) => e !== _assertionState,
    );
  }
}

export class ServicePostValidationsState {
  readonly serviceEditorState: ServiceEditorState;
  readonly editorStore: EditorStore;
  selectedPostValidationState: PostValidationState | undefined;
  runningPostValidationAction = ActionState.create();
  postValidationAssertionResults: PostValidationAssertionResult[] | undefined;

  constructor(serviceEditorState: ServiceEditorState) {
    makeObservable(this, {
      selectedPostValidationState: observable,
      postValidationAssertionResults: observable,
      init: action,
      buildPostValidationState: action,
      addValidation: action,
      deleteValidation: action,
      changeValidation: action,
      runVal: flow,
    });
    this.serviceEditorState = serviceEditorState;
    this.editorStore = serviceEditorState.editorStore;
    // this.init();
  }

  get service(): Service {
    return this.serviceEditorState.service;
  }

  get postValidations(): PostValidation[] {
    return this.serviceEditorState.service.postValidations;
  }

  init(): void {
    const currentVal = this.selectedPostValidationState?.validation;
    if (!currentVal || !this.postValidations.includes(currentVal)) {
      const validation = this.serviceEditorState.service.postValidations[0];
      if (validation) {
        this.selectedPostValidationState =
          this.buildPostValidationState(validation);
      } else {
        this.selectedPostValidationState = undefined;
      }
    }
  }

  buildPostValidationState(validation: PostValidation): PostValidationState {
    return new PostValidationState(validation, this);
  }

  deleteValidation(validation: PostValidation): void {
    service_deleteValidation(this.serviceEditorState.service, validation);
    this.init();
  }

  addValidation(): void {
    const val = new PostValidation();
    val.description = `Description for validation ${
      this.postValidations.length + 1
    }`;
    service_addValidation(this.serviceEditorState.service, val);
    this.selectedPostValidationState = this.buildPostValidationState(val);
  }

  changeValidation(validation: PostValidation): void {
    this.selectedPostValidationState =
      this.buildPostValidationState(validation);
  }

  // Fetches validation results. Caller of validation should catch the error
  async fetchValidationResult(): Promise<PostValidationAssertionResult[]> {
    const validation = guaranteeNonNullable(
      this.selectedPostValidationState?.validation,
    );

    return Promise.all(
      validation.assertions.map(async (assertion) => {
        const assertionId = guaranteeNonNullable(assertion.id);

        const testResults =
          await this.editorStore.graphManagerState.graphManager
            .runServicePostValidations(
              this.service,
              this.editorStore.graphManagerState.graph,
              assertionId,
            )
            .then((data: PostValidationAssertionResult) => data);

        return guaranteeNonNullable(testResults);
      }),
    );
  }

  *runVal(): GeneratorFn<void> {
    try {
      this.runningPostValidationAction.inProgress();
      this.postValidationAssertionResults = undefined;
      this.postValidationAssertionResults = (yield flowResult(
        this.fetchValidationResult(),
      )) as PostValidationAssertionResult[];
      this.runningPostValidationAction.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error running validation: ${error.message}`,
      );
      this.runningPostValidationAction.fail();
    }
  }
}
