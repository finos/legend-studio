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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  InstanceSetImplementationState,
  PropertyMappingState,
} from './MappingElementState';
import type { EditorStore } from '../../../EditorStore';
import { MappingElementDecorator } from './MappingElementDecorator';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  isNonNullable,
} from '@finos/legend-shared';
import { MAPPING_ELEMENT_SOURCE_ID_LABEL } from './MappingEditorState';
import type {
  PurePropertyMapping,
  PureInstanceSetImplementation,
} from '@finos/legend-graph';
import {
  LAMBDA_PIPE,
  GRAPH_MANAGER_LOG_EVENT,
  ParserError,
  RawLambda,
  buildSourceInformationSourceId,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-application';

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
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
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
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
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
  filter: RawLambda | undefined;
  editorStore: EditorStore;
  instanceSetImplementationState: PureInstanceSetImplementationState;
  constructor(
    instanceSetImplementationState: PureInstanceSetImplementationState,
    editorStore: EditorStore,
    filter?: RawLambda,
  ) {
    super('true', LAMBDA_PIPE);

    makeObservable(this, {
      filter: observable,
      editorStore: observable,
    });

    this.editorStore = editorStore;
    this.filter = filter;
    this.instanceSetImplementationState = instanceSetImplementationState;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.instanceSetImplementationState.setImplementation.parent.path,
      MAPPING_ELEMENT_SOURCE_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING,
      this.instanceSetImplementationState.setImplementation.id.value,
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
        this.filter = lambda ?? emptyFunctionDefinition;
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.filter = emptyFunctionDefinition;
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (this.filter && !this.filter.isStub) {
      try {
        const grammarText =
          (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
            this.filter,
            this.lambdaId,
            pretty,
          )) as string;
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
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
  filterMappingState: PureInstanceSetImplementationFilterState;

  isConvertingTransformLambdaObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: PureInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformLambdaObjects: observable,
      filterMappingState: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      setFilterMappingState: action,
    });

    this.mappingElement = setImplementation;
    this.propertyMappingStates = setImplementation.propertyMappings.map(
      (pm) => new PurePropertyMappingState(this.editorStore, this, pm),
    );
    this.filterMappingState = new PureInstanceSetImplementationFilterState(
      this,
      editorStore,
      setImplementation.filter,
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
  setFilterMappingState(
    filterMappingState: PureInstanceSetImplementationFilterState,
  ): void {
    this.filterMappingState = filterMappingState;
  }

  /**
   * When we decorate, we might lose the error (parser/compiler) on each of the property mapping state
   * so here we make sure that we reuse existing state and only add new decorated ones
   */
  decorate(): void {
    this.mappingElement.accept_SetImplementationVisitor(
      new MappingElementDecorator(),
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
    this.setFilterMappingState(
      new PureInstanceSetImplementationFilterState(
        this,
        this.editorStore,
        this.mappingElement.filter,
      ),
    );
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
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }
}
