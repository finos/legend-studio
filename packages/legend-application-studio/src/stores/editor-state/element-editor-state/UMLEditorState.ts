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

import type { EditorStore } from '../../EditorStore.js';
import { observable, action, makeObservable } from 'mobx';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { ElementEditorState } from './ElementEditorState.js';
import {
  type PackageableElement,
  Class,
  Profile,
  Association,
  Enumeration,
} from '@finos/legend-graph';

export enum UML_EDITOR_TAB {
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
  // Class & Association
  PROPERTIES = 'PROPERTIES',
  PROPERTY_AGGREGATION = 'PROPERTY_AGGREGATION',
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
        `Can't build UML editor state for element`,
        element,
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
