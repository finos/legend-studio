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

import { EditorStore } from 'Stores/EditorStore';
import { observable, action } from 'mobx';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { UnsupportedOperationError, returnUndefOnError } from 'Utilities/GeneralUtil';
import { ElementEditorState } from './ElementEditorState';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

export enum UML_EDITOR_TAB {
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
  // Class & Association
  PROPERTIES = 'PROPERTIES',
  // Class
  DERIVED_PROPERTIES = 'DERIVED_PROPERTIES',
  SUPER_TYPES = 'SUPER_TYPES',
  CONSTRAINTS = 'CONSTRAINTS',
  // Enumeration
  ENUM_VALUES = 'VALUES',
  // Profile
  TAGS = 'TAGS'
}

export class UMLEditorState extends ElementEditorState {
  @observable selectedTab: UML_EDITOR_TAB;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    const elementType = returnUndefOnError(() => getPackageableElementType(element));
    switch (elementType) {
      case PACKAGEABLE_ELEMENT_TYPE.CLASS: this.selectedTab = UML_EDITOR_TAB.PROPERTIES; break;
      case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: this.selectedTab = UML_EDITOR_TAB.ENUM_VALUES; break;
      case PACKAGEABLE_ELEMENT_TYPE.PROFILE: this.selectedTab = UML_EDITOR_TAB.TAGS; break;
      case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: this.selectedTab = UML_EDITOR_TAB.PROPERTIES; break;
      default: throw new UnsupportedOperationError(`UML editor currently does not support type '${elementType ?? element.constructor.name}'`);
    }
  }

  @action setSelectedTab(tab: UML_EDITOR_TAB): void { this.selectedTab = tab }

  revealCompilationError(compilationError: CompilationError): boolean { return false }

  @action reprocess(newElement: PackageableElement, editorStore: EditorStore): ElementEditorState {
    const umlEditorState = new UMLEditorState(editorStore, newElement);
    umlEditorState.selectedTab = this.selectedTab;
    return umlEditorState;
  }
}
