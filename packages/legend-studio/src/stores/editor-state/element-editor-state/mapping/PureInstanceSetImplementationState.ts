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
} from './MappingElementState';
import type { EditorStore } from '../../../EditorStore';
import { MappingElementDecorator } from './MappingElementDecorator';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  isNonNullable,
} from '@finos/legend-shared';
import { MAPPING_ELEMENT_SOURCE_ID_LABEL } from './MappingEditorState';
import {
  type PurePropertyMapping,
  type PureInstanceSetImplementation,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  ParserError,
  RawLambda,
  buildSourceInformationSourceId,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-application';
import {
  pureInstanceSetImpl_setMappingFilter,
  pureInstanceSetImpl_setPropertyMappings,
} from '../../../graphModifier/DSLMapping_GraphModifierHelper';

export const FILTER_SOURCE_ID_LABEL = 'filter';

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
        this.propertyMapping.owner.parent.path,
        MAPPING_ELEMENT_SOURCE_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING,
        this.propertyMapping.owner.id.value,
        this.propertyMapping.property.value.name,
        this.propertyMapping.targetSetImplementation?.id.value,
        this.uuid, // in case of duplications
      ].filter(isNonNullable),
    );
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.propertyMapping.transform = lambda ?? emptyLambda;
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.propertyMapping.transform = emptyLambda;
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (!this.propertyMapping.transform.isStub) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.propertyMapping.transform);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
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
        this.editorStore.applicationStore.log.error(
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
    return buildSourceInformationSourceId([
      this.instanceSetImplementation.parent.path,
      MAPPING_ELEMENT_SOURCE_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING,
      FILTER_SOURCE_ID_LABEL,
      this.uuid,
    ]);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyFunctionDefinition = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        pureInstanceSetImpl_setMappingFilter(
          this.instanceSetImplementation,
          lambda ?? emptyFunctionDefinition,
        );
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        GRAPH_MANAGER_EVENT;
      }
    } else {
      this.clearErrors();
      if (this.instanceSetImplementation.filter?.isStub) {
        pureInstanceSetImpl_setMappingFilter(
          this.instanceSetImplementation,
          emptyFunctionDefinition,
        );
      }
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (
      this.instanceSetImplementation.filter &&
      !this.instanceSetImplementation.isStub
    ) {
      try {
        const grammarText =
          (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
            this.instanceSetImplementation.filter,
            this.lambdaId,
            pretty,
          )) as string;
        this.setLambdaString(this.extractLambdaString(grammarText));
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        GRAPH_MANAGER_EVENT;
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
    const propertyMappingsBeforeDecoration =
      this.mappingElement.propertyMappings;
    this.mappingElement.accept_SetImplementationVisitor(
      new MappingElementDecorator(this.editorStore),
    );
    const newPropertyMappingStates: PurePropertyMappingState[] = [];
    const propertyMappingstatesAfterDecoration =
      this.mappingElement.propertyMappings.map(
        (pm) => new PurePropertyMappingState(this.editorStore, this, pm),
      );
    pureInstanceSetImpl_setPropertyMappings(
      this.mappingElement,
      propertyMappingsBeforeDecoration,
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
    const propertyMappingsMap = new Map<string, PurePropertyMappingState>();
    this.propertyMappingStates.forEach((pm) => {
      if (!pm.propertyMapping.transform.isStub) {
        lambdas.set(pm.lambdaId, pm.propertyMapping.transform);
        propertyMappingsMap.set(pm.lambdaId, pm);
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
          const purePropertyMapping = propertyMappingsMap.get(key);
          purePropertyMapping?.setLambdaString(
            purePropertyMapping.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        GRAPH_MANAGER_EVENT;
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
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        GRAPH_MANAGER_EVENT;
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }
}
