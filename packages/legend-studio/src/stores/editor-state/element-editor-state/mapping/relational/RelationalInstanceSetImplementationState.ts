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
} from '../MappingElementState';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  IllegalStateError,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../../EditorStore';
import { MappingElementDecorator } from '../MappingElementDecorator';
import { MAPPING_ELEMENT_SOURCE_ID_LABEL } from '../MappingEditorState';
import type {
  PropertyMapping,
  RelationalInstanceSetImplementation,
  RawRelationalOperationElement,
  CompilationError,
  SourceInformation,
} from '@finos/legend-graph';
import {
  RelationalPropertyMapping,
  createStubRelationalOperationElement,
  ParserError,
  GRAPH_MANAGER_LOG_EVENT,
  EmbeddedRelationalInstanceSetImplementation,
  buildSourceInformationSourceId,
} from '@finos/legend-graph';

export class RelationalPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare instanceSetImplementationState: RelationalInstanceSetImplementationState;
  declare propertyMapping:
    | RelationalPropertyMapping
    | EmbeddedRelationalInstanceSetImplementation;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: RootRelationalInstanceSetImplementationState,
    propertyMapping: RelationalPropertyMapping,
  ) {
    super(instanceSetImplementationState, propertyMapping, '', '');
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  // NOTE: `operationId` is properly the more appropriate term to use, but we are just following what we
  // do for other property mapping for consistency
  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return buildSourceInformationSourceId(
      [
        this.propertyMapping.owner.parent.path,
        MAPPING_ELEMENT_SOURCE_ID_LABEL.RELATIONAL_CLASS_MAPPING,
        this.propertyMapping.owner.id.value,
        this.propertyMapping.property.value.name,
        this.propertyMapping.targetSetImplementation?.id.value,
        this.uuid, // in case of duplications
      ].filter(isNonNullable),
    );
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const stubOperation = createStubRelationalOperationElement();
    if (this.lambdaString) {
      try {
        const operation =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToRelationalOperationElement(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawRelationalOperationElement | undefined;
        this.setParserError(undefined);
        if (this.propertyMapping instanceof RelationalPropertyMapping) {
          this.propertyMapping.relationalOperation = operation ?? stubOperation;
        }
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
      if (this.propertyMapping instanceof RelationalPropertyMapping) {
        this.propertyMapping.relationalOperation = stubOperation;
      }
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (this.propertyMapping instanceof RelationalPropertyMapping) {
      if (!this.propertyMapping.isStub) {
        try {
          const operations = new Map<string, RawRelationalOperationElement>();
          operations.set(
            this.lambdaId,
            this.propertyMapping.relationalOperation,
          );
          const operationsInText =
            (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
              operations,
            )) as Map<string, string>;
          const grammarText = operationsInText.get(this.lambdaId);
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
}

export abstract class RelationalInstanceSetImplementationState extends InstanceSetImplementationState {}

export class EmbeddedRelationalInstanceSetImplementationState
  extends RelationalInstanceSetImplementationState
  implements RelationalPropertyMappingState
{
  declare instanceSetImplementationState: RelationalInstanceSetImplementationState;
  declare mappingElement: EmbeddedRelationalInstanceSetImplementation;
  declare propertyMapping: EmbeddedRelationalInstanceSetImplementation;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: RelationalInstanceSetImplementationState,
    setImplementation: EmbeddedRelationalInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);
    this.instanceSetImplementationState = instanceSetImplementationState;
    this.mappingElement = setImplementation;
    this.propertyMapping = setImplementation;
    this.propertyMappingStates = this.getPropertyMappingStates(
      setImplementation.propertyMappings,
    );
  }

  get lambdaId(): string {
    throw new IllegalStateError(
      `Can't build lambda ID for embedded relational instance set implementation state`,
    );
  }

  getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): RelationalPropertyMappingState[] {
    // TODO
    return [];
  }

  // dummy lambda editor states needed because embedded flat-data should be seen as `PropertMappingState`
  lambdaPrefix = '';
  lambdaString = '';
  parserError?: ParserError | undefined;
  compilationError?: CompilationError | undefined;

  decorate(): void {
    return;
  }
  *convertPropertyMappingTransformObjects(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
  setLambdaString(val: string): void {
    return;
  }
  setParserError(error: ParserError | undefined): void {
    return;
  }
  setCompilationError(error: CompilationError | undefined): void {
    // TODO
    return;
  }
  get fullLambdaString(): string {
    throw new UnsupportedOperationError();
  }
  processSourceInformation(
    sourceInformation: SourceInformation,
  ): SourceInformation {
    throw new UnsupportedOperationError();
  }
  extractLambdaString(fullLambdaString: string): string {
    throw new UnsupportedOperationError();
  }
  clearErrors(): void {
    // TODO
    return;
  }
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

export class RootRelationalInstanceSetImplementationState extends RelationalInstanceSetImplementationState {
  declare mappingElement: RelationalInstanceSetImplementation;
  declare propertyMappingStates: RelationalPropertyMappingState[];
  isConvertingTransformLambdaObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: RelationalInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformLambdaObjects: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
    });

    this.mappingElement = setImplementation;
    this.propertyMappingStates = this.getPropertyMappingStates(
      setImplementation.propertyMappings,
    );
  }

  getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): RelationalPropertyMappingState[] {
    return propertyMappings
      .map((pm) => {
        if (pm instanceof RelationalPropertyMapping) {
          return new RelationalPropertyMappingState(this.editorStore, this, pm);
        } else if (pm instanceof EmbeddedRelationalInstanceSetImplementation) {
          return new EmbeddedRelationalInstanceSetImplementationState(
            this.editorStore,
            this,
            pm,
          );
        }
        return undefined;
      })
      .filter(isNonNullable);
  }

  get hasParserError(): boolean {
    return this.propertyMappingStates.some(
      (propertyMappingState) => propertyMappingState.parserError,
    );
  }
  setPropertyMappingStates(
    propertyMappingState: RelationalPropertyMappingState[],
  ): void {
    this.propertyMappingStates = propertyMappingState;
  }

  /**
   * When we decorate, we might lose the error (parser/compiler) on each of the property mapping state
   * so here we make sure that we reuse existing state and only add new decorated ones
   */
  decorate(): void {
    this.mappingElement.accept_SetImplementationVisitor(
      new MappingElementDecorator(this.editorStore),
    );
    const newPropertyMappingStates: RelationalPropertyMappingState[] = [];
    const propertyMappingstatesAfterDecoration = this.getPropertyMappingStates(
      this.mappingElement.propertyMappings,
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
    const operations = new Map<string, RawRelationalOperationElement>();
    const propertyMappingStates = new Map<
      string,
      RelationalPropertyMappingState
    >();
    this.propertyMappingStates.forEach((pmState) => {
      if (
        pmState.propertyMapping instanceof RelationalPropertyMapping &&
        !pmState.propertyMapping.isStub
      ) {
        operations.set(
          pmState.lambdaId,
          pmState.propertyMapping.relationalOperation,
        );
        propertyMappingStates.set(pmState.lambdaId, pmState);
      }
      // we don't have to do anything for embedded. they don't have a transform and do not require converting back and form.
    });
    if (operations.size) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const operationsInText =
          (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
            operations,
          )) as Map<string, string>;
        operationsInText.forEach((grammarText, key) => {
          const relationalPropertyMappingState = propertyMappingStates.get(key);
          relationalPropertyMappingState?.setLambdaString(
            relationalPropertyMappingState.extractLambdaString(grammarText),
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
