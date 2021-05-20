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

import { observable, action, flow, computed, makeObservable } from 'mobx';
import { LAMBDA_START } from '../../../../models/MetaModelConst';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import {
  InstanceSetImplementationState,
  PropertyMappingState,
} from './MappingElementState';
import {
  UnsupportedOperationError,
  guaranteeType,
} from '@finos/legend-studio-shared';
import type { EditorStore } from '../../../EditorStore';
import { MappingElementDecorateVisitor } from './MappingElementDecorateVisitor';
import type { SourceInformation } from '../../../../models/metamodels/pure/action/SourceInformation';
import type { CompilationError } from '../../../../models/metamodels/pure/action/EngineError';
import { ParserError } from '../../../../models/metamodels/pure/action/EngineError';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { FlatDataInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { AbstractFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping';
import { FlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import { EmbeddedFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { PropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { InferableMappingElementIdExplicitValue } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InferableMappingElementId';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/PropertyReference';

export class FlatDataPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare propertyMapping: AbstractFlatDataPropertyMapping;

  constructor(
    propertyMapping: AbstractFlatDataPropertyMapping,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_START, propertyMapping);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: FlatDataPropertyMappingState,
  ) {
    const emptyLambda = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.propertyMapping.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        if (this.propertyMapping instanceof FlatDataPropertyMapping) {
          this.propertyMapping.transform = lambda ?? emptyLambda;
        }
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
      if (this.propertyMapping instanceof FlatDataPropertyMapping) {
        this.propertyMapping.transform = emptyLambda;
      }
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: FlatDataPropertyMappingState,
    pretty: boolean,
  ) {
    if (this.propertyMapping instanceof FlatDataPropertyMapping) {
      if (!this.propertyMapping.transform.isStub) {
        try {
          const lambdas = new Map<string, RawLambda>();
          lambdas.set(
            this.propertyMapping.lambdaId,
            this.propertyMapping.transform,
          );
          const isolatedLambdas =
            (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
              lambdas,
              pretty,
            )) as Map<string, string>;
          const grammarText = isolatedLambdas.get(
            this.propertyMapping.lambdaId,
          );
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
    }
  });
}
export abstract class FlatDataInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement:
    | FlatDataInstanceSetImplementation
    | EmbeddedFlatDataPropertyMapping;
  declare propertyMappingStates: FlatDataPropertyMappingState[];
  isConvertingTransformObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformObjects: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      decorate: action,
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
      new MappingElementDecorateVisitor(),
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

  convertPropertyMappingTransformObjects = flow(function* (
    this: FlatDataInstanceSetImplementationState,
  ) {
    const lambdas = new Map<string, RawLambda>();
    const propertyMappingStates = new Map<
      string,
      FlatDataPropertyMappingState
    >();
    this.propertyMappingStates.forEach((pm) => {
      if (
        pm.propertyMapping instanceof FlatDataPropertyMapping &&
        !pm.propertyMapping.transform.isStub
      ) {
        lambdas.set(pm.propertyMapping.lambdaId, pm.propertyMapping.transform);
        propertyMappingStates.set(pm.propertyMapping.lambdaId, pm);
      }
      // we don't have to do anything for embedded. they don't have a transform and do not require converting back and form.
    });
    if (lambdas.size) {
      this.isConvertingTransformObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const flatDataPropertyMappingState = propertyMappingStates.get(key);
          flatDataPropertyMappingState?.setLambdaString(
            flatDataPropertyMappingState.extractLambdaString(grammarText),
          );
        });
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      } finally {
        this.isConvertingTransformObjects = false;
      }
    }
  });

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
      this.mappingElement,
      PackageableElementExplicitReference.create(_class),
      InferableMappingElementIdExplicitValue.create(
        `${this.mappingElement.id.value}.${property.name}`,
        '',
      ),
      undefined,
    );
    embeddedPropertyMapping.targetSetImplementation = embeddedPropertyMapping;
    this.mappingElement.propertyMappings.push(embeddedPropertyMapping);
    return embeddedPropertyMapping;
  }
}

export class EmbeddedFlatDataInstanceSetImplementationState
  extends FlatDataInstanceSetImplementationState
  implements FlatDataPropertyMappingState
{
  // might need to have a root property pointing to the root set implementation state
  declare mappingElement: EmbeddedFlatDataPropertyMapping;
  declare propertyMapping: EmbeddedFlatDataPropertyMapping;

  constructor(
    editorStore: EditorStore,
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ) {
    super(editorStore, setImplementation);
    this.mappingElement = setImplementation;
    this.propertyMapping = setImplementation;
    this.propertyMappingStates = this.getPropertyMappingStates(
      setImplementation.propertyMappings,
    );
  }

  getPropertyMappingStates(
    propertyMappings: PropertyMapping[],
  ): FlatDataPropertyMappingState[] {
    return propertyMappings.map((pm) => {
      if (pm instanceof FlatDataPropertyMapping) {
        return new FlatDataPropertyMappingState(pm, this.editorStore);
      } else if (pm instanceof EmbeddedFlatDataPropertyMapping) {
        return new EmbeddedFlatDataInstanceSetImplementationState(
          this.editorStore,
          pm,
        );
      }
      throw new UnsupportedOperationError();
    });
  }

  // dummy lambda editor states needed because embedded flat-data should be seen as `PropertMappingState`
  lambdaPrefix = '';
  lambdaString = '';
  parserError?: ParserError;
  compilationError?: CompilationError;
  setLambdaString(val: string): void {
    throw new UnsupportedOperationError();
  }
  setParserError(error: ParserError | undefined): void {
    throw new UnsupportedOperationError();
  }
  setCompilationError(error: CompilationError | undefined): void {
    throw new UnsupportedOperationError();
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
    throw new UnsupportedOperationError();
  }
  convertLambdaGrammarStringToObject = flow(function* (
    this: EmbeddedFlatDataInstanceSetImplementationState,
  ) {
    throw new UnsupportedOperationError();
  });
  convertLambdaObjectToGrammarString = flow(function* (
    this: EmbeddedFlatDataInstanceSetImplementationState,
    pretty: boolean,
  ) {
    throw new UnsupportedOperationError();
  });
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
          propertyMapping,
          this.editorStore,
        );
      } else if (propertyMapping instanceof EmbeddedFlatDataPropertyMapping) {
        return new EmbeddedFlatDataInstanceSetImplementationState(
          this.editorStore,
          propertyMapping,
        );
      }
      throw new UnsupportedOperationError();
    });
  }
}
