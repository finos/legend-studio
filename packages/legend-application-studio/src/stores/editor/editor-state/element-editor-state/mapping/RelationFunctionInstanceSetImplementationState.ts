/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { type GeneratorFn, isNonNullable } from '@finos/legend-shared';
import {
  type PropertyMapping,
  buildSourceInformationSourceId,
  RelationColumn,
  RelationFunctionPropertyMapping,
  type RelationFunctionInstanceSetImplementation,
  isStubbed_RelationColumn,
  GenericTypeExplicitReference,
  GenericType,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import { MAPPING_ELEMENT_TYPE } from './MappingEditorState.js';
import { MappingElementDecorator } from './MappingElementDecorator.js';
import {
  PropertyMappingState,
  InstanceSetImplementationState,
} from './MappingElementState.js';

export class RelationFunctionPropertyMappingState extends PropertyMappingState {
  editorStore: EditorStore;
  declare instanceSetImplementationState: RelationFunctionInstanceSetImplementationState;
  declare propertyMapping: RelationFunctionPropertyMapping;

  constructor(
    editorStore: EditorStore,
    instanceSetImplementationState: RelationFunctionInstanceSetImplementationState,
    propertyMapping: RelationFunctionPropertyMapping,
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
    if (this.lambdaString !== '') {
      this.propertyMapping.column = new RelationColumn(
        this.lambdaString,
        GenericTypeExplicitReference.create(
          new GenericType(
            this.propertyMapping.property.value.genericType.value.rawType,
          ),
        ),
      );
    } else {
      this.clearErrors();
      this.propertyMapping.column = {} as RelationColumn;
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RelationColumn(this.propertyMapping.column)) {
      this.setLambdaString(this.propertyMapping.column.name);
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }
}

export class RelationFunctionInstanceSetImplementationState extends InstanceSetImplementationState {
  declare mappingElement: RelationFunctionInstanceSetImplementation;
  declare propertyMappingStates: RelationFunctionPropertyMappingState[];
  isConvertingTransformLambdaObjects = false;

  constructor(
    editorStore: EditorStore,
    setImplementation: RelationFunctionInstanceSetImplementation,
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
  ): RelationFunctionPropertyMappingState[] {
    return propertyMappings
      .map((pm) => {
        if (pm instanceof RelationFunctionPropertyMapping) {
          return new RelationFunctionPropertyMappingState(
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
    propertyMappingState: RelationFunctionPropertyMappingState[],
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
    const newPropertyMappingStates: RelationFunctionPropertyMappingState[] = [];
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
    this.propertyMappingStates.forEach((pm) => {
      if (!isStubbed_RelationColumn(pm.propertyMapping.column)) {
        pm.setLambdaString(pm.propertyMapping.column.name);
      }
    });
  }
}
