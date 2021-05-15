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
import { LAMBDA_START } from '../../../../../models/MetaModelConst';
import {
  InstanceSetImplementationState,
  PropertyMappingState,
} from '../MappingElementState';
import { isNonNullable } from '@finos/legend-studio-shared';
import type { EditorStore } from '../../../../EditorStore';
import type { PropertyMapping } from '../../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { RelationalInstanceSetImplementation } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import { RelationalPropertyMapping } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';

export class RelationalPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare propertyMapping: RelationalPropertyMapping;

  constructor(
    propertyMapping: RelationalPropertyMapping,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_START, propertyMapping);
    this.propertyMapping = propertyMapping;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: RelationalPropertyMappingState,
  ) {
    // const emptyLambda = RawLambda.createStub();
    // if (this.lambdaString) {
    //   try {
    //     const lambda = (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
    //       this.fullLambdaString,
    //       this.propertyMapping.lambdaId,
    //     )) as RawLambda | undefined;
    //     this.setParserError(undefined);
    //     if (this.propertyMapping instanceof RelationalPropertyMapping) {
    //       this.propertyMapping.transform = lambda ?? emptyLambda;
    //     }
    //   } catch (error: unknown) {
    //     if (error instanceof ParserError) {
    //       this.setParserError(error);
    //     }
    //     this.editorStore.applicationStore.logger.error(
    //       CORE_LOG_EVENT.PARSING_PROBLEM,
    //       error,
    //     );
    //   }
    // } else {
    //   this.clearErrors();
    //   if (this.propertyMapping instanceof RelationalPropertyMapping) {
    //     this.propertyMapping.transform = emptyLambda;
    //   }
    // }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: RelationalPropertyMappingState,
    pretty: boolean,
  ) {
    //   if (this.propertyMapping instanceof RelationalPropertyMapping) {
    //     if (!this.propertyMapping.transform.isStub) {
    //       try {
    //         const lambdas = new Map<string, RawLambda>();
    //         lambdas.set(
    //           this.propertyMapping.lambdaId,
    //           this.propertyMapping.transform,
    //         );
    //         const isolatedLambdas = (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
    //           lambdas,
    //           pretty,
    //         )) as Map<string, string>;
    //         const grammarText = isolatedLambdas.get(
    //           this.propertyMapping.lambdaId,
    //         );
    //         this.setLambdaString(
    //           grammarText !== undefined
    //             ? this.extractLambdaString(grammarText)
    //             : '',
    //         );
    //         this.clearErrors();
    //       } catch (error: unknown) {
    //         this.editorStore.applicationStore.logger.error(
    //           CORE_LOG_EVENT.PARSING_PROBLEM,
    //           error,
    //         );
    //       }
    //     } else {
    //       this.clearErrors();
    //       this.setLambdaString('');
    //     }
    //   }
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
    // this.mappingElement.accept_SetImplementationVisitor(
    //   new MappingElementDecorateVisitor(),
    // );
    // const newPropertyMappingStates: RelationalPropertyMappingState[] = [];
    // const propertyMappingstatesAfterDecoration = this.getPropertyMappingStates(
    //   this.mappingElement.propertyMappings,
    // );
    // propertyMappingstatesAfterDecoration.forEach((propertyMappingState) => {
    //   const existingPropertyMappingState = this.propertyMappingStates.find(
    //     (p) => p.propertyMapping === propertyMappingState.propertyMapping,
    //   );
    //   newPropertyMappingStates.push(
    //     existingPropertyMappingState ?? propertyMappingState,
    //   );
    // });
    // this.setPropertyMappingStates(newPropertyMappingStates);
  }

  convertPropertyMappingTransformObjects = flow(function* (
    this: RootRelationalInstanceSetImplementationState,
  ) {
    // const lambdas = new Map<string, RawLambda>();
    // const propertyMappingStates = new Map<
    //   string,
    //   RelationalPropertyMappingState
    // >();
    // this.propertyMappingStates.forEach((pm) => {
    //   if (pm.propertyMapping instanceof RelationalPropertyMapping) {
    //     lambdas.set(pm.propertyMapping.lambdaId, pm.propertyMapping.transform);
    //     propertyMappingStates.set(pm.propertyMapping.lambdaId, pm);
    //   }
    //   // we don't have to do anything for embedded. they don't have a transform and do not require converting back and form.
    // });
    // if (lambdas.size) {
    //   this.isConvertingTransformObjects = true;
    //   try {
    //     const isolatedLambdas = (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
    //       lambdas,
    //     )) as Map<string, string>;
    //     isolatedLambdas.forEach((grammarText, key) => {
    //       const RelationalPropertyMappingState = propertyMappingStates.get(key);
    //       RelationalPropertyMappingState?.setLambdaString(
    //         RelationalPropertyMappingState.extractLambdaString(grammarText),
    //       );
    //     });
    //   } catch (error: unknown) {
    //     this.editorStore.applicationStore.logger.error(
    //       CORE_LOG_EVENT.PARSING_PROBLEM,
    //       error,
    //     );
    //   } finally {
    //     this.isConvertingTransformObjects = false;
    //   }
    // }
  });
}
