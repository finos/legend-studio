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
import type { EditorStore } from '../../../EditorStore';
import { MappingElementDecorateVisitor } from './MappingElementDecorateVisitor';
import { ParserError } from '../../../../models/metamodels/pure/action/EngineError';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { PurePropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import type { PureInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';

export class PurePropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare propertyMapping: PurePropertyMapping;

  constructor(propertyMapping: PurePropertyMapping, editorStore: EditorStore) {
    super('', LAMBDA_START, propertyMapping);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: PurePropertyMappingState,
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
        this.propertyMapping.transform = lambda ?? emptyLambda;
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
      this.propertyMapping.transform = emptyLambda;
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: PurePropertyMappingState,
    pretty: boolean,
  ) {
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
        const grammarText = isolatedLambdas.get(this.propertyMapping.lambdaId);
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

export class PureInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement: PureInstanceSetImplementation;
  declare propertyMappingStates: PurePropertyMappingState[];
  isConvertingTransformObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: PureInstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      isConvertingTransformObjects: observable,
      hasParserError: computed,
      setPropertyMappingStates: action,
      decorate: action,
    });

    this.mappingElement = setImplementation;
    this.propertyMappingStates = setImplementation.propertyMappings.map(
      (pm) => new PurePropertyMappingState(pm, this.editorStore),
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

  /**
   * When we decorate, we might lose the error (parser/compiler) on each of the property mapping state
   * so here we make sure that we reuse existing state and only add new decorated ones
   */
  decorate(): void {
    this.mappingElement.accept_SetImplementationVisitor(
      new MappingElementDecorateVisitor(),
    );
    const newPropertyMappingStates: PurePropertyMappingState[] = [];
    const propertyMappingstatesAfterDecoration =
      this.mappingElement.propertyMappings.map(
        (pm) => new PurePropertyMappingState(pm, this.editorStore),
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
    this: PureInstanceSetImplementationState,
  ) {
    const lambdas = new Map<string, RawLambda>();
    const propertyMappingsMap = new Map<string, PurePropertyMappingState>();
    this.propertyMappingStates.forEach((pm) => {
      if (!pm.propertyMapping.transform.isStub) {
        lambdas.set(pm.propertyMapping.lambdaId, pm.propertyMapping.transform);
        propertyMappingsMap.set(pm.propertyMapping.lambdaId, pm);
      }
    });
    if (lambdas.size) {
      this.isConvertingTransformObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const purePropertyMapping = propertyMappingsMap.get(key);
          purePropertyMapping?.setLambdaString(
            purePropertyMapping.extractLambdaString(grammarText),
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
