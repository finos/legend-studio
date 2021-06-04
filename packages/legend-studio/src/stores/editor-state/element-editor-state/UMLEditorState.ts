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

import type { EditorStore } from '../../EditorStore';
import { observable, action, makeObservable } from 'mobx';
import {
  UnsupportedOperationError,
  getClass,
} from '@finos/legend-studio-shared';
import { ElementEditorState } from './ElementEditorState';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Profile } from '../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Association } from '../../../models/metamodels/pure/model/packageableElements/domain/Association';
import { Enumeration } from '../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';

export enum UML_EDITOR_TAB {
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
  // Class & Association
  PROPERTIES = 'PROPERTIES',
  // Class
  DERIVED_PROPERTIES = 'DERIVED_PROPERTIES',
  CONSTRAINTS = 'CONSTRAINTS',
  SUPER_TYPES = 'SUPER_TYPES',
  // Enumeration
  ENUM_VALUES = 'VALUES',
  // Profile
  TAGS = 'TAGS',
}

export class UMLEditorState extends ElementEditorState {
  selectedTab: UML_EDITOR_TAB;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      setSelectedTab: action,
      reprocess: action,
    });

    if (element instanceof Class) {
      this.selectedTab = UML_EDITOR_TAB.PROPERTIES;
    } else if (element instanceof Enumeration) {
      this.selectedTab = UML_EDITOR_TAB.ENUM_VALUES;
    } else if (element instanceof Profile) {
      this.selectedTab = UML_EDITOR_TAB.TAGS;
    } else if (element instanceof Association) {
      this.selectedTab = UML_EDITOR_TAB.PROPERTIES;
    } else {
      throw new UnsupportedOperationError(
        `Can't build UML editor state for element of type '${
          getClass(element).name
        }'`,
      );
    }
  }

  setSelectedTab(tab: UML_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const umlEditorState = new UMLEditorState(editorStore, newElement);
    umlEditorState.selectedTab = this.selectedTab;
    return umlEditorState;
  }
}
