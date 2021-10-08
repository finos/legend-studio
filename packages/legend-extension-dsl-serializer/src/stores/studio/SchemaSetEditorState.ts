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
import { Schema } from '../../models/metamodels/pure/model/packageableElements/schemaSet/Schema';

export class SchemaSetEditorState extends ElementEditorState {
  schemaElement: Schema;
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    this.schemaElement = new Schema();
    this.schemaElement.setContent('');
    if (this.element instanceof SchemaSet) {
      if (this.element.schemas.length !== 0) {
        this.schemaElement =
          this.element.schemas[this.element.schemas.length - 1];
      }
    }
    makeObservable(this, {
      schemaElement: observable,
      schemaSet: computed,
      schema: computed,
      setSchema: action,
      reprocess: action,
    });
  }

  get schemaSet(): SchemaSet {
    return guaranteeType(
      this.element,
      SchemaSet,
      'Element inside schema set element editor state must be a SchemaSet',
    );
  }

  get schema(): Schema {
    return guaranteeType(
      this.schemaElement,
      Schema,
      'Element inside schema editor state must be a Schema',
    );
  }

  setSchema(value: Schema): void {
    this.schemaElement = value;
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
