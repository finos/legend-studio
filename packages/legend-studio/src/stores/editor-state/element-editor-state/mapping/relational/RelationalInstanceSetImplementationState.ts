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
import {
  InstanceSetImplementationState,
  PropertyMappingState,
} from '../MappingElementState';
import { isNonNullable } from '@finos/legend-studio-shared';
import type { EditorStore } from '../../../../EditorStore';
import type { PropertyMapping } from '../../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { RelationalInstanceSetImplementation } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import { RelationalPropertyMapping } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { RawRelationalOperationElement } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RawRelationalOperationElement';
import { createStubRelationalOperationElement } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RawRelationalOperationElement';
import { ParserError } from '../../../../../models/metamodels/pure/action/EngineError';
import { CORE_LOG_EVENT } from '../../../../../utils/Logger';
import { MappingElementDecorateVisitor } from '../MappingElementDecorateVisitor';

export class RelationalPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare propertyMapping: RelationalPropertyMapping;

  constructor(
    propertyMapping: RelationalPropertyMapping,
    editorStore: EditorStore,
  ) {
    super('', '', propertyMapping);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: RelationalPropertyMappingState,
  ) {
    const stubOperation = createStubRelationalOperationElement();
    if (this.lambdaString) {
      try {
        const operation =
          (yield this.editorStore.graphState.graphManager.pureCodeToRelationalOperationElement(
            this.fullLambdaString,
            this.propertyMapping.lambdaId,
          )) as RawRelationalOperationElement | undefined;
        this.setParserError(undefined);
        if (this.propertyMapping instanceof RelationalPropertyMapping) {
          this.propertyMapping.relationalOperation = operation ?? stubOperation;
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
      if (this.propertyMapping instanceof RelationalPropertyMapping) {
        this.propertyMapping.relationalOperation = stubOperation;
      }
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: RelationalPropertyMappingState,
    pretty: boolean,
  ) {
    if (this.propertyMapping instanceof RelationalPropertyMapping) {
      if (!this.propertyMapping.isStub) {
        try {
          const operations = new Map<string, RawRelationalOperationElement>();
          operations.set(
            this.propertyMapping.lambdaId,
            this.propertyMapping.relationalOperation,
          );
          const operationsInText =
            (yield this.editorStore.graphState.graphManager.relationalOperationElementToPureCode(
              operations,
            )) as Map<string, string>;
          const grammarText = operationsInText.get(
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

export class RootRelationalInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement: RelationalInstanceSetImplementation;
  declare propertyMappingStates: RelationalPropertyMappingState[];
  isConvertingTransformObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: RelationalInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformObjects: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      decorate: action,
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
          return new RelationalPropertyMappingState(pm, this.editorStore);
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
      new MappingElementDecorateVisitor(),
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

  convertPropertyMappingTransformObjects = flow(function* (
    this: RootRelationalInstanceSetImplementationState,
  ) {
    const operations = new Map<string, RawRelationalOperationElement>();
    const propertyMappingStates = new Map<
      string,
      RelationalPropertyMappingState
    >();
    this.propertyMappingStates.forEach((pm) => {
      if (!pm.propertyMapping.isStub) {
        operations.set(
          pm.propertyMapping.lambdaId,
          pm.propertyMapping.relationalOperation,
        );
        propertyMappingStates.set(pm.propertyMapping.lambdaId, pm);
      }
      // we don't have to do anything for embedded. they don't have a transform and do not require converting back and form.
    });
    if (operations.size) {
      this.isConvertingTransformObjects = true;
      try {
        const operationsInText =
          (yield this.editorStore.graphState.graphManager.relationalOperationElementToPureCode(
            operations,
          )) as Map<string, string>;
        operationsInText.forEach((grammarText, key) => {
          const relationalPropertyMappingState = propertyMappingStates.get(key);
          relationalPropertyMappingState?.setLambdaString(
            relationalPropertyMappingState.extractLambdaString(grammarText),
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
}
