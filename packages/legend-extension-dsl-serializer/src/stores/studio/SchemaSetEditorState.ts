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
import type { EditorStore } from '@finos/legend-studio';
import { guaranteeType } from '@finos/legend-shared';
import { ElementEditorState } from '@finos/legend-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { SchemaSet } from '../../models/metamodels/pure/model/packageableElements/schemaSet/SchemaSet';
import type { Schema } from '../../models/metamodels/pure/model/packageableElements/schemaSet/Schema';

export class SchemaSetEditorState extends ElementEditorState {
  currentSchema?: Schema | undefined;
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      currentSchema: observable,
      schemaSet: computed,
      setCurrentSchema: action,
      reprocess: action,
    });

    if (this.element instanceof SchemaSet) {
      if (this.element.schemas.length !== 0) {
        this.currentSchema =
          this.element.schemas[this.element.schemas.length - 1];
      }
    }
  }

  get schemaSet(): SchemaSet {
    return guaranteeType(
      this.element,
      SchemaSet,
      'Element inside schema set element editor state must be a SchemaSet',
    );
  }

  setCurrentSchema(value: Schema | undefined): void {
    this.currentSchema = value;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const schemaSetEditorState = new SchemaSetEditorState(
      editorStore,
      newElement,
    );
    return schemaSetEditorState;
  }
}
