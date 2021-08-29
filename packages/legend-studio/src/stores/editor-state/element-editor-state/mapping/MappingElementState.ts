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

import { observable, computed, makeObservable, action, flow } from 'mobx';
import type { GeneratorFn } from '@finos/legend-shared';
import { uuid } from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore';
import type { MappingElement } from './MappingEditorState';
import type {
  PropertyMapping,
  InstanceSetImplementation,
  SetImplementation,
  Type,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-application';

export class MappingElementState {
  uuid = uuid();
  editorStore: EditorStore;
  mappingElement: MappingElement;

  constructor(editorStore: EditorStore, mappingElement: MappingElement) {
    makeObservable(this, {
      mappingElement: observable,
    });

    this.editorStore = editorStore;
    this.mappingElement = mappingElement;
  }
}

export abstract class SetImplementationState extends MappingElementState {
  declare mappingElement: SetImplementation;

  constructor(editorStore: EditorStore, setImplementation: SetImplementation) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      setImplementation: computed,
    });

    this.mappingElement = setImplementation;
  }

  get setImplementation(): SetImplementation {
    return this.mappingElement;
  }
}

export abstract class InstanceSetImplementationState extends SetImplementationState {
  declare mappingElement: InstanceSetImplementation;
  propertyMappingStates: PropertyMappingState[] = [];
  selectedType?: Type | undefined;

  constructor(
    editorStore: EditorStore,
    setImplementation: InstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      propertyMappingStates: observable,
      selectedType: observable,
      setSelectedType: action,
      decorate: action,
      convertPropertyMappingTransformObjects: flow,
    });

    this.mappingElement = setImplementation;
  }

  setSelectedType(type: Type | undefined): void {
    this.selectedType = type === this.selectedType ? undefined : type;
  }

  abstract decorate(): void;
  abstract convertPropertyMappingTransformObjects(): GeneratorFn<void>;
}

export abstract class PropertyMappingState extends LambdaEditorState {
  instanceSetImplementationState: InstanceSetImplementationState;
  propertyMapping: PropertyMapping;

  constructor(
    instanceSetImplementationState: InstanceSetImplementationState,
    propertyMapping: PropertyMapping,
    lambdaString: string,
    lambdaPrefix: string,
  ) {
    super(lambdaString, lambdaPrefix);

    makeObservable(this, {
      propertyMapping: observable,
    });

    this.instanceSetImplementationState = instanceSetImplementationState;
    this.propertyMapping = propertyMapping;
  }
}
