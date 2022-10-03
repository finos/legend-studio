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

import { computed, action, makeObservable } from 'mobx';
import { guaranteeType } from '@finos/legend-shared';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { Text } from '../../graph/metamodel/pure/model/packageableElements/text/DSL_Text_Text.js';

export class TextEditorState extends ElementEditorState {
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      textElement: computed,
      reprocess: action,
    });
  }

  get textElement(): Text {
    return guaranteeType(
      this.element,
      Text,
      'Element inside text element editor state must be a text element',
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const textEditorState = new TextEditorState(editorStore, newElement);
    return textEditorState;
  }
}
