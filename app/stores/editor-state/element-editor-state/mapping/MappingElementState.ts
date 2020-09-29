/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed } from 'mobx';
import { uuid } from 'Utilities/GeneralUtil';
import { LambdaEditorState } from 'Stores/editor-state/element-editor-state/LambdaEditorState';
import { EditorStore } from 'Stores/EditorStore';
import { PropertyMapping } from 'MM/model/packageableElements/mapping/PropertyMapping';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { MappingElement } from 'MM/model/packageableElements/mapping/Mapping';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';

export class MappingElementState {
  uuid = uuid();
  editorStore: EditorStore;
  @observable mappingElement: MappingElement;

  constructor(editorStore: EditorStore, mappingElement: MappingElement) {
    this.editorStore = editorStore;
    this.mappingElement = mappingElement;
  }
}

export abstract class SetImplementationState extends MappingElementState {
  // NOTE: notice this way of overriding the type for the child properties, in `MappingElementState` we have `mappingElement`
  // of type `MappingElement` but of type `SetImplementation` here, in other words, we have narrowed the type
  // We have tested that `mobx` plays well with this and that if we change the `mappingElement` from let's say a sub class intance
  // subscribers of the parent property also got notified.
  // This is important because take example of `@computed get setImplementation` here, if we have:
  // `@observable setImplementation` then we set it equal to `this.mappingElement` when we change `mappingElement` mobx won't know
  // to notify subscribers of `setImplementation`
  @observable mappingElement: SetImplementation;

  constructor(editorStore: EditorStore, setImplementation: SetImplementation) {
    super(editorStore, setImplementation);
    this.mappingElement = setImplementation;
  }

  @computed get setImplementation(): SetImplementation {
    return this.mappingElement;
  }
}

export abstract class InstanceSetImplementationState extends SetImplementationState {
  @observable mappingElement: InstanceSetImplementation;
  @observable propertyMappingStates: PropertyMappingState[] = [];

  constructor(editorStore: EditorStore, setImplementation: InstanceSetImplementation) {
    super(editorStore, setImplementation);
    this.mappingElement = setImplementation;
  }

  abstract decorate(): void;
  abstract convertPropertyMappingTransformObjects(): Promise<void>;
}

export abstract class PropertyMappingState extends LambdaEditorState {
  @observable propertyMapping: PropertyMapping;

  constructor(lambdaString: string, lambdaPrefix: string, propertyMapping: PropertyMapping) {
    super(lambdaString, lambdaPrefix);
    this.propertyMapping = propertyMapping;
  }
}
