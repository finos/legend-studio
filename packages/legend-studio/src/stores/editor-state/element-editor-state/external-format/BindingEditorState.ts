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

import { computed, action, makeObservable, observable } from 'mobx';
import { guaranteeType } from '@finos/legend-shared';
import { Binding, type PackageableElement } from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';

export enum BINDING_TAB_TYPE {
  GENERAL = 'GENERAL',
  MODELS = 'MODELS',
}

export class BindingEditorState extends ElementEditorState {
  selectedTab = BINDING_TAB_TYPE.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      binding: computed,
      selectedTab: observable,
      setSelectedTab: action,
      reprocess: action,
    });
  }

  setSelectedTab(val: BINDING_TAB_TYPE): void {
    this.selectedTab = val;
  }

  get binding(): Binding {
    return guaranteeType(
      this.element,
      Binding,
      'Element inside binding element editor state must be a Binding',
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const bindingEditorState = new BindingEditorState(editorStore, newElement);
    return bindingEditorState;
  }
}
