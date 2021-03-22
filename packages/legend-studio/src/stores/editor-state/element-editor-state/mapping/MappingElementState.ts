/**
 * Copyright Goldman Sachs
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

import { observable, computed, makeObservable } from 'mobx';
import { uuid } from '@finos/legend-studio-shared';
import { LambdaEditorState } from '../../../editor-state/element-editor-state/LambdaEditorState';
import type { EditorStore } from '../../../EditorStore';
import type { PropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { InstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import type { MappingElement } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import type { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';

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

  constructor(
    editorStore: EditorStore,
    setImplementation: InstanceSetImplementation,
  ) {
    super(editorStore, setImplementation);

    makeObservable(this, {
      propertyMappingStates: observable,
    });

    this.mappingElement = setImplementation;
  }

  abstract decorate(): void;
  abstract convertPropertyMappingTransformObjects(): Promise<void>;
}

export abstract class PropertyMappingState extends LambdaEditorState {
  propertyMapping: PropertyMapping;

  constructor(
    lambdaString: string,
    lambdaPrefix: string,
    propertyMapping: PropertyMapping,
  ) {
    super(lambdaString, lambdaPrefix);

    makeObservable(this, {
      propertyMapping: observable,
    });

    this.propertyMapping = propertyMapping;
  }
}
