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
} from './MappingElementState.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  UnsupportedOperationError,
  guaranteeType,
  IllegalStateError,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore.js';
import { MappingElementDecorator } from './MappingElementDecorator.js';
import {
  type SourceInformation,
  type CompilationError,
  type FlatDataInstanceSetImplementation,
  type AbstractFlatDataPropertyMapping,
  type PropertyMapping,
  type Property,
  type RawLambda,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  ParserError,
  FlatDataPropertyMapping,
  EmbeddedFlatDataPropertyMapping,
  Class,
  InferableMappingElementIdExplicitValue,
  PackageableElementExplicitReference,
  PropertyExplicitReference,
  buildSourceInformationSourceId,
  stub_RawLambda,
  isStubbed_RawLambda,
  SetImplementationExplicitReference,
  type CodeCompletionResult,
} from '@finos/legend-graph';
import { MAPPING_ELEMENT_TYPE } from './MappingEditorState.js';

export class FlatDataPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare instanceSetImplementationState: FlatDataInstanceSetImplementationState;
  declare propertyMapping: AbstractFlatDataPropertyMapping;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: FlatDataInstanceSetImplementationState,
    propertyMapping: AbstractFlatDataPropertyMapping,
  ) {
    super(instanceSetImplementationState, propertyMapping, '', LAMBDA_PIPE);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.propertyMapping._OWNER._PARENT.path,
      MAPPING_ELEMENT_TYPE.CLASS,
      this.propertyMapping._OWNER.id.value,
      this.propertyMapping.property.value.name,
      this.uuid, // in case of duplications
    ]);
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
        if (this.propertyMapping instanceof FlatDataPropertyMapping) {
          this.propertyMapping.transform = lambda;
        }
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
      if (this.propertyMapping instanceof FlatDataPropertyMapping) {
        this.propertyMapping.transform = emptyLambda;
      }
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (this.propertyMapping instanceof FlatDataPropertyMapping) {
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
}
export abstract class FlatDataInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement:
    | FlatDataInstanceSetImplementation
    | EmbeddedFlatDataPropertyMapping;
  declare propertyMappingStates: FlatDataPropertyMappingState[];
  isConvertingTransformLambdaObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformLambdaObjects: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      addEmbeddedPropertyMapping: action,
    });

    this.mappingElement = setImplementation;
  }

  abstract getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): FlatDataPropertyMappingState[];
  get hasParserError(): boolean {
    return this.propertyMappingStates.some(
      (propertyMappingState) => propertyMappingState.parserError,
    );
  }
  setPropertyMappingStates(
    propertyMappingState: FlatDataPropertyMappingState[],
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
    const newPropertyMappingStates: FlatDataPropertyMappingState[] = [];
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
    const lambdas = new Map<string, RawLambda>();
    const propertyMappingStates = new Map<
      string,
      FlatDataPropertyMappingState
    >();
    this.propertyMappingStates.forEach((pm) => {
      if (
        pm.propertyMapping instanceof FlatDataPropertyMapping &&
        !isStubbed_RawLambda(pm.propertyMapping.transform)
      ) {
        lambdas.set(pm.lambdaId, pm.propertyMapping.transform);
        propertyMappingStates.set(pm.lambdaId, pm);
      }
      // we don't have to do anything for embedded. they don't have a transform and do not require converting back and form.
    });
    if (lambdas.size) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const flatDataPropertyMappingState = propertyMappingStates.get(key);
          flatDataPropertyMappingState?.setLambdaString(
            flatDataPropertyMappingState.extractLambdaString(grammarText),
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

  addEmbeddedPropertyMapping(
    property: Property,
  ): EmbeddedFlatDataPropertyMapping {
    const rootInstanceSetImplementation =
      this.mappingElement instanceof EmbeddedFlatDataPropertyMapping
        ? this.mappingElement.rootInstanceSetImplementation
        : this.mappingElement;
    const _class = guaranteeType(property.genericType.value.rawType, Class);
    const embeddedPropertyMapping = new EmbeddedFlatDataPropertyMapping(
      this.mappingElement,
      PropertyExplicitReference.create(property),
      rootInstanceSetImplementation,
      SetImplementationExplicitReference.create(this.mappingElement),
      PackageableElementExplicitReference.create(_class),
      InferableMappingElementIdExplicitValue.create(
        `${this.mappingElement.id.value}.${property.name}`,
        '',
      ),
      undefined,
    );
    embeddedPropertyMapping.targetSetImplementation =
      SetImplementationExplicitReference.create(embeddedPropertyMapping);
    this.mappingElement.propertyMappings.push(embeddedPropertyMapping);
    return embeddedPropertyMapping;
  }
}

export class EmbeddedFlatDataInstanceSetImplementationState
  extends FlatDataInstanceSetImplementationState
  implements FlatDataPropertyMappingState
{
  declare instanceSetImplementationState: FlatDataInstanceSetImplementationState;
  declare mappingElement: EmbeddedFlatDataPropertyMapping;
  declare propertyMapping: EmbeddedFlatDataPropertyMapping;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: FlatDataInstanceSetImplementationState,
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ) {
    super(editorStore, setImplementation);
    this.instanceSetImplementationState = instanceSetImplementationState;
    this.mappingElement = setImplementation;
    this.propertyMapping = setImplementation;
    this.propertyMappingStates = this.getPropertyMappingStates(
      setImplementation.propertyMappings,
    );
  }
  typeAheadEnabled = false;
  getCodeComplete(input: string): Promise<CodeCompletionResult> {
    throw new Error('Method not implemented.');
  }

  setTypeAhead(val: boolean): void {
    this.typeAheadEnabled = val;
  }

  get lambdaId(): string {
    throw new IllegalStateError(
      `Can't build lambda ID for embedded flat data instance set implementation state`,
    );
  }

  getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): FlatDataPropertyMappingState[] {
    return propertyMappings.map((pm) => {
      if (pm instanceof FlatDataPropertyMapping) {
        return new FlatDataPropertyMappingState(
          this.editorStore,
          this.instanceSetImplementationState,
          pm,
        );
      } else if (pm instanceof EmbeddedFlatDataPropertyMapping) {
        return new EmbeddedFlatDataInstanceSetImplementationState(
          this.editorStore,
          this.instanceSetImplementationState,
          pm,
        );
      }
      throw new UnsupportedOperationError();
    });
  }

  // dummy lambda editor states needed because embedded flat-data should be seen as `PropertyMappingState`
  lambdaPrefix = '';
  lambdaString = '';
  parserError?: ParserError | undefined;
  compilationError?: CompilationError | undefined;

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
  clearErrors(options?: {
    preserveCompilationError?: boolean | undefined;
  }): void {
    // TODO
    return;
  }
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
  }): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

export class RootFlatDataInstanceSetImplementationState extends FlatDataInstanceSetImplementationState {
  declare mappingElement: FlatDataInstanceSetImplementation;

  constructor(
    editorStore: EditorStore,
    setImplementation: FlatDataInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    this.mappingElement = setImplementation;
    this.propertyMappingStates = this.getPropertyMappingStates(
      setImplementation.propertyMappings,
    );
  }

  getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): FlatDataPropertyMappingState[] {
    return propertyMappings.map((propertyMapping) => {
      if (propertyMapping instanceof FlatDataPropertyMapping) {
        return new FlatDataPropertyMappingState(
          this.editorStore,
          this,
          propertyMapping,
        );
      } else if (propertyMapping instanceof EmbeddedFlatDataPropertyMapping) {
        return new EmbeddedFlatDataInstanceSetImplementationState(
          this.editorStore,
          this,
          propertyMapping,
        );
      }
      throw new UnsupportedOperationError();
    });
  }
}
