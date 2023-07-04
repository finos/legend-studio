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

import { observable, action, computed, makeObservable, flow } from 'mobx';
import {
  InstanceSetImplementationState,
  PropertyMappingState,
} from './MappingElementState.js';
import type { EditorStore } from '../../../EditorStore.js';
import { MappingElementDecorator } from './MappingElementDecorator.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  isNonNullable,
} from '@finos/legend-shared';
import { MAPPING_ELEMENT_TYPE } from './MappingEditorState.js';
import {
  type PurePropertyMapping,
  type PureInstanceSetImplementation,
  type RawLambda,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  ParserError,
  buildSourceInformationSourceId,
  stub_RawLambda,
  isStubbed_RawLambda,
} from '@finos/legend-graph';
import { pureInstanceSetImpl_setMappingFilter } from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { LambdaEditorState } from '@finos/legend-query-builder';

export class PurePropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare instanceSetImplementationState: PureInstanceSetImplementationState;
  declare propertyMapping: PurePropertyMapping;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: PureInstanceSetImplementationState,
    propertyMapping: PurePropertyMapping,
  ) {
    super(instanceSetImplementationState, propertyMapping, '', LAMBDA_PIPE);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId(
      [
        this.propertyMapping._OWNER._PARENT.path,
        MAPPING_ELEMENT_TYPE.CLASS,
        this.propertyMapping._OWNER.id.value,
        this.propertyMapping.property.value.name,
        this.propertyMapping.targetSetImplementation?.value.id.value,
        this.uuid, // in case of duplications
      ].filter(isNonNullable),
    );
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
        this.propertyMapping.transform = lambda;
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
      this.propertyMapping.transform = emptyLambda;
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.propertyMapping.transform)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.propertyMapping.transform);
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

export class PureInstanceSetImplementationFilterState extends LambdaEditorState {
  editorStore: EditorStore;
  instanceSetImplementation: PureInstanceSetImplementation;
  constructor(
    instanceSetImplementation: PureInstanceSetImplementation,
    editorStore: EditorStore,
  ) {
    super('true', LAMBDA_PIPE);

    makeObservable(this, {
      editorStore: observable,
    });

    this.editorStore = editorStore;
    this.instanceSetImplementation = instanceSetImplementation;
  }

  get lambdaId(): string {
    // TODO: we need to fix this when we need to properly reveal compilation error for filter
    // or when we refactor error reveal in form mode
    // See https://github.com/finos/legend-studio/issues/1168
    return buildSourceInformationSourceId([
      this.instanceSetImplementation._PARENT.path,
      this.uuid,
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
        pureInstanceSetImpl_setMappingFilter(
          this.instanceSetImplementation,
          lambda,
        );
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
      if (this.instanceSetImplementation.filter) {
        pureInstanceSetImpl_setMappingFilter(
          this.instanceSetImplementation,
          emptyFunctionDefinition,
        );
      }
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (this.instanceSetImplementation.filter) {
      try {
        const grammarText =
          (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
            this.instanceSetImplementation.filter,
            options?.pretty,
          )) as string;
        this.setLambdaString(this.extractLambdaString(grammarText));
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
export class PureInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement: PureInstanceSetImplementation;
  declare propertyMappingStates: PurePropertyMappingState[];
  mappingFilterState: PureInstanceSetImplementationFilterState | undefined;

  isConvertingTransformLambdaObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: PureInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformLambdaObjects: observable,
      mappingFilterState: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      setMappingFilterState: action,
      convertFilter: flow,
    });

    this.mappingElement = setImplementation;
    this.propertyMappingStates = setImplementation.propertyMappings.map(
      (pm) => new PurePropertyMappingState(this.editorStore, this, pm),
    );
    this.mappingFilterState = new PureInstanceSetImplementationFilterState(
      this.mappingElement,
      editorStore,
    );
  }

  get hasParserError(): boolean {
    return this.propertyMappingStates.some(
      (propertyMappingState) => propertyMappingState.parserError,
    );
  }
  setPropertyMappingStates(
    propertyMappingState: PurePropertyMappingState[],
  ): void {
    this.propertyMappingStates = propertyMappingState;
  }
  setMappingFilterState(
    mappingFilterState: PureInstanceSetImplementationFilterState,
  ): void {
    this.mappingFilterState = mappingFilterState;
  }

  /**
   * When we decorate, we might lose the error (parser/compiler) on each of the property mapping state
   * so here we make sure that we reuse existing state and only add new decorated ones
   */
  decorate(): void {
    this.mappingElement.accept_SetImplementationVisitor(
      new MappingElementDecorator(this.editorStore),
    );
    const newPropertyMappingStates: PurePropertyMappingState[] = [];
    const propertyMappingstatesAfterDecoration =
      this.mappingElement.propertyMappings.map(
        (pm) => new PurePropertyMappingState(this.editorStore, this, pm),
      );
    propertyMappingstatesAfterDecoration.forEach((propertyMappingState) => {
      const existingPropertyMappingState = this.propertyMappingStates.find(
        (p) => p.propertyMapping === propertyMappingState.propertyMapping,
      );
      newPropertyMappingStates.push(
        existingPropertyMappingState ?? propertyMappingState,
      );
    });
    this.setPropertyMappingStates(newPropertyMappingStates);
  }

  *convertPropertyMappingTransformObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, PurePropertyMappingState>();
    this.propertyMappingStates.forEach((pm) => {
      if (!isStubbed_RawLambda(pm.propertyMapping.transform)) {
        lambdas.set(pm.lambdaId, pm.propertyMapping.transform);
        index.set(pm.lambdaId, pm);
      }
    });
    if (lambdas.size) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const purePropertyMapping = index.get(key);
          purePropertyMapping?.setLambdaString(
            purePropertyMapping.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }

  *convertFilter(): GeneratorFn<void> {
    const lambda = this.mappingElement.filter;
    if (lambda) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const isolatedLambda =
          (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
            lambda,
          )) as string;
        this.mappingFilterState?.setLambdaString(
          this.mappingFilterState.extractLambdaString(isolatedLambda),
        );
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }
}
